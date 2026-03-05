import { callClaude } from "./claude-helper";
import { getServiceClient } from "./supabase";
import type { Opportunity, OpportunityAnalysis, CompanyProfileFull } from "./types";

async function fetchCompanyProfile(): Promise<CompanyProfileFull | null> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("company_profile")
      .select(
        "*, company_certifications(*), company_naics_codes(*), company_contract_vehicles(*), team_members(*)"
      )
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as CompanyProfileFull;
  } catch {
    return null;
  }
}

function buildCompanyContext(profile: CompanyProfileFull): string {
  const lines: string[] = [];
  lines.push("\n--- COMPANY PROFILE (use this to personalize feasibility scoring) ---");
  lines.push(`Company: ${profile.name}`);
  if (profile.size_standard) lines.push(`Size Standard: ${profile.size_standard}`);
  if (profile.primary_naics) lines.push(`Primary NAICS: ${profile.primary_naics}`);
  if (profile.sam_status) lines.push(`SAM Status: ${profile.sam_status}`);

  if (profile.company_certifications.length > 0) {
    lines.push(`Certifications: ${profile.company_certifications.map((c) => c.cert_type).join(", ")}`);
  }

  if (profile.company_naics_codes.length > 0) {
    lines.push(
      `Registered NAICS Codes: ${profile.company_naics_codes.map((n) => n.naics_code).join(", ")}`
    );
  }

  if (profile.company_contract_vehicles.length > 0) {
    lines.push(
      `Contract Vehicles: ${profile.company_contract_vehicles.map((v) => v.vehicle_name).join(", ")}`
    );
  }

  if (profile.team_members.length > 0) {
    lines.push(`Team Size: ${profile.team_members.length}`);
    const clearances = profile.team_members
      .filter((m) => m.clearance_level && m.clearance_level !== "none")
      .map((m) => `${m.name}: ${m.clearance_level}`);
    if (clearances.length > 0) {
      lines.push(`Cleared Personnel: ${clearances.join("; ")}`);
    }
    const allSkills = new Set<string>();
    profile.team_members.forEach((m) => {
      if (m.skills) m.skills.forEach((s: string) => allSkills.add(s));
    });
    if (allSkills.size > 0) {
      lines.push(`Team Skills: ${Array.from(allSkills).join(", ")}`);
    }
    const allCerts = new Set<string>();
    profile.team_members.forEach((m) => {
      if (m.certifications) m.certifications.forEach((c: string) => allCerts.add(c));
    });
    if (allCerts.size > 0) {
      lines.push(`Team Certifications: ${Array.from(allCerts).join(", ")}`);
    }
  }

  lines.push("--- END COMPANY PROFILE ---");
  lines.push(
    "\nIMPORTANT: Score feasibility based on THIS SPECIFIC COMPANY's capabilities, certifications, clearances, NAICS codes, and team skills — not a generic small team. Flag compliance gaps where the company lacks required certifications or clearances."
  );

  return lines.join("\n");
}

const ANALYSIS_PROMPT = `You are an expert government contracting analyst specializing in IT contracts. Analyze the following federal contract opportunity and provide a structured assessment.

Consider the perspective of a small, technically skilled team (3-5 people) that leverages AI tools heavily to punch above their weight class.

Contract Details:
Title: {title}
Agency: {agency}
NAICS Code: {naics_code}
Set-Aside Type: {set_aside_type}
Solicitation Number: {sol_number}
Place of Performance: {place_of_performance}
Estimated Value: {estimated_value}
Response Deadline: {response_deadline}

Description:
{description}

Provide your analysis in the following JSON format (no markdown, just raw JSON):
{
  "requirements_summary": "A clear, plain-English summary of what the government is looking for (2-4 sentences)",
  "tech_stack_detected": "Technologies, frameworks, platforms, and technical skills mentioned or implied",
  "complexity_score": <1-5 integer, where 1=straightforward, 5=extremely complex>,
  "feasibility_score": <1-5 integer, where 1=very difficult for small AI-augmented team, 5=great fit>,
  "estimated_effort": "Estimated person-weeks of effort (e.g., '8-12 person-weeks')",
  "key_requirements": ["requirement 1", "requirement 2", ...],
  "red_flags": ["red flag 1", "red flag 2", ...],
  "recommended_approach": "A brief recommended technical approach for winning and executing this contract"
}

For red_flags, look for things like:
- Unrealistic timelines
- Security clearance requirements
- Incumbent advantage signals
- Unusually low budget for scope
- Excessive compliance requirements
- Geographic restrictions that are problematic
- Requirements that suggest the solicitation is wired for a specific vendor

Be honest and practical in your assessments. If the opportunity is a poor fit for a small team, say so.`;

interface AnalysisResult {
  requirements_summary: string;
  tech_stack_detected: string;
  complexity_score: number;
  feasibility_score: number;
  estimated_effort: string;
  key_requirements: string[];
  red_flags: string[];
  recommended_approach: string;
}

export async function analyzeOpportunity(
  opportunity: Opportunity
): Promise<OpportunityAnalysis> {
  // Fetch company profile for personalized analysis
  const companyProfile = await fetchCompanyProfile();

  let prompt = ANALYSIS_PROMPT
    .replace("{title}", opportunity.title || "N/A")
    .replace("{agency}", opportunity.agency || "N/A")
    .replace("{naics_code}", opportunity.naics_code || "N/A")
    .replace("{set_aside_type}", opportunity.set_aside_type || "N/A")
    .replace("{sol_number}", opportunity.sol_number || "N/A")
    .replace("{place_of_performance}", opportunity.place_of_performance || "N/A")
    .replace(
      "{estimated_value}",
      opportunity.estimated_value
        ? `$${opportunity.estimated_value.toLocaleString()}`
        : "Not specified"
    )
    .replace("{response_deadline}", opportunity.response_deadline || "N/A")
    .replace("{description}", opportunity.description || "No description provided");

  // Append company context if a profile exists
  if (companyProfile) {
    prompt += "\n" + buildCompanyContext(companyProfile);
  }

  const responseText = await callClaude(prompt);

  let analysis: AnalysisResult;
  try {
    // Try to parse the JSON response, handling potential markdown code blocks
    let jsonStr = responseText.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    analysis = JSON.parse(jsonStr);
  } catch {
    throw new Error(
      `Failed to parse Claude's analysis response: ${responseText.substring(0, 200)}`
    );
  }

  // Save to database
  const supabase = getServiceClient();

  const analysisRecord = {
    opportunity_id: opportunity.id,
    requirements_summary: analysis.requirements_summary,
    tech_stack_detected: analysis.tech_stack_detected,
    complexity_score: Math.min(5, Math.max(1, Math.round(analysis.complexity_score))),
    feasibility_score: Math.min(5, Math.max(1, Math.round(analysis.feasibility_score))),
    estimated_effort: analysis.estimated_effort,
    key_requirements: analysis.key_requirements,
    red_flags: analysis.red_flags,
    recommended_approach: analysis.recommended_approach,
    analyzed_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("opportunity_analysis")
    .upsert(analysisRecord, { onConflict: "opportunity_id" })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save analysis: ${error.message}`);
  }

  return data as OpportunityAnalysis;
}
