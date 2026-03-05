import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";
import { findMatches } from "@/lib/govhound/match-engine";
import {
  autoScoreCriteria,
  calculateOverallScore,
  deriveRecommendation,
  detectComplianceRequirements,
} from "@/lib/govhound/go-nogo";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();

    const { data: assessment, error } = await supabase
      .from("go_nogo_assessments")
      .select("*, go_nogo_criteria_scores(*)")
      .eq("opportunity_id", id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ assessment });
  } catch (error) {
    console.error("Go/no-go GET error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch assessment",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();
    const body = await request.json().catch(() => ({}));

    // Fetch opportunity
    const { data: opportunity, error: oppError } = await supabase
      .from("opportunities")
      .select("*")
      .eq("id", id)
      .single();

    if (oppError) {
      if (oppError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Opportunity not found" },
          { status: 404 }
        );
      }
      throw oppError;
    }

    // Fetch company profile (first one)
    const { data: companyProfiles } = await supabase
      .from("company_profiles")
      .select(
        "*, company_certifications(*), company_naics_codes(*), company_contract_vehicles(*), team_members(*)"
      )
      .limit(1);

    const companyProfile =
      companyProfiles && companyProfiles.length > 0
        ? companyProfiles[0]
        : null;

    // Fetch past contracts for match scoring
    const { data: pastContracts } = await supabase
      .from("past_contracts")
      .select("*");

    const matches = findMatches(pastContracts || [], opportunity, {
      limit: 5,
      minScore: 10,
    });

    // Auto-score criteria
    const autoScored = autoScoreCriteria(
      opportunity,
      companyProfile,
      matches
    );

    // Apply manual overrides if provided
    const manualScores: Record<string, { score?: number; notes?: string }> =
      body.scores || {};
    const criteriaScores = autoScored.map((item) => {
      const override = manualScores[item.criterion];
      return {
        criterion: item.criterion,
        weight: item.weight,
        score: override?.score ?? item.score,
        notes: override?.notes ?? item.notes,
      };
    });

    const overallScore = calculateOverallScore(criteriaScores);
    const recommendation =
      body.recommendation || deriveRecommendation(overallScore);

    // Delete existing assessment if any (cascade deletes criteria scores)
    await supabase
      .from("go_nogo_assessments")
      .delete()
      .eq("opportunity_id", id);

    // Insert new assessment
    const { data: assessment, error: assessError } = await supabase
      .from("go_nogo_assessments")
      .insert({
        opportunity_id: id,
        overall_score: overallScore,
        recommendation,
        assessor_notes: body.assessor_notes || null,
      })
      .select()
      .single();

    if (assessError) throw assessError;

    // Insert criteria scores
    const criteriaRows = criteriaScores.map((cs) => ({
      assessment_id: assessment.id,
      criterion: cs.criterion,
      weight: cs.weight,
      score: cs.score,
      notes: cs.notes,
    }));

    const { error: criteriaError } = await supabase
      .from("go_nogo_criteria_scores")
      .insert(criteriaRows);

    if (criteriaError) throw criteriaError;

    // Also auto-generate compliance checklist if none exists
    const { data: existingChecklist } = await supabase
      .from("compliance_checklists")
      .select("id")
      .eq("opportunity_id", id)
      .limit(1);

    if (!existingChecklist || existingChecklist.length === 0) {
      const complianceItems = detectComplianceRequirements(opportunity);

      // Cross-reference with company certifications
      const companyCertTypes = companyProfile
        ? companyProfile.company_certifications
            .filter(
              (c: { status: string; cert_type: string }) =>
                c.status === "active"
            )
            .map((c: { cert_type: string }) => c.cert_type)
        : [];

      const certCheckMap: Record<string, string[]> = {
        "CMMC Certification": ["cmmc_l1", "cmmc_l2"],
        "FedRAMP Authorization": ["fedramp"],
        "ISO 27001 Certification": ["iso27001"],
        "SOC 2 Compliance": ["soc2"],
        "Section 508 Accessibility": ["section508"],
      };

      const checklistRows = complianceItems.map((item) => {
        const requiredCerts = certCheckMap[item.requirement_text];
        let is_met: boolean | null = null;
        let gap_notes: string | null = null;

        if (requiredCerts) {
          const hasCert = requiredCerts.some((ct) =>
            companyCertTypes.includes(ct)
          );
          is_met = hasCert;
          if (!hasCert && companyProfile) {
            gap_notes = `Company does not hold ${item.requirement_text}.`;
          }
        }

        // Check standard registration items
        if (item.requirement_text === "SAM.gov registration current") {
          if (companyProfile) {
            is_met = companyProfile.sam_status === "active";
            if (!is_met) gap_notes = "SAM.gov registration not active.";
          }
        }
        if (item.requirement_text === "UEI number active") {
          if (companyProfile) {
            is_met = !!companyProfile.uei;
            if (!is_met) gap_notes = "UEI number not configured in profile.";
          }
        }

        return {
          opportunity_id: id,
          requirement_text: item.requirement_text,
          source_section: item.source_section,
          is_met,
          gap_notes,
          mapped_response_section: null,
        };
      });

      if (checklistRows.length > 0) {
        await supabase.from("compliance_checklists").insert(checklistRows);
      }
    }

    // Fetch complete assessment with scores
    const { data: fullAssessment } = await supabase
      .from("go_nogo_assessments")
      .select("*, go_nogo_criteria_scores(*)")
      .eq("id", assessment.id)
      .single();

    return NextResponse.json({ assessment: fullAssessment });
  } catch (error) {
    console.error("Go/no-go POST error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create assessment",
      },
      { status: 500 }
    );
  }
}
