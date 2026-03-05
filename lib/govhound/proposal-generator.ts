import { callClaude } from "./claude-helper";
import { getServiceClient } from "./supabase";
import type {
  Opportunity,
  OpportunityAnalysis,
  CompanyProfileFull,
  PastContractWithRatings,
  MatchResult,
  CompetitorIntelReport,
  ProposalVolume,
  ProposalSection,
} from "./types";

// --- Section definitions for each volume ---

interface SectionDef {
  volume: ProposalVolume;
  section_title: string;
  section_order: number;
  prompt_context: string;
}

const VOLUME_SECTIONS: SectionDef[] = [
  // Vol I: Administrative
  {
    volume: "admin",
    section_title: "Cover Letter",
    section_order: 1,
    prompt_context:
      "Write a professional cover letter for this federal proposal. Include the solicitation number, company name, CAGE code, UEI, and a brief overview of the company's qualifications. Keep it to one page equivalent in markdown.",
  },
  {
    volume: "admin",
    section_title: "Representations & Certifications",
    section_order: 2,
    prompt_context:
      "Generate a representations and certifications section. List all applicable certifications, small business designations, SAM registration status, and socioeconomic classifications. Format as a checklist/table.",
  },
  {
    volume: "admin",
    section_title: "Teaming Arrangement",
    section_order: 3,
    prompt_context:
      "Draft a teaming arrangement summary section. If no teaming partners are identified, provide a template structure for prime/sub relationships, roles and responsibilities, and work share percentages.",
  },

  // Vol II: Technical
  {
    volume: "technical",
    section_title: "Executive Summary",
    section_order: 1,
    prompt_context:
      "Write an executive summary for the technical volume. Summarize the understanding of requirements, proposed approach highlights, key differentiators, and why the team is uniquely qualified. Keep concise (1-2 pages equivalent).",
  },
  {
    volume: "technical",
    section_title: "Technical Approach",
    section_order: 2,
    prompt_context:
      "Write a detailed technical approach section. Address how each key requirement from the SOW will be met. Include methodology, tools, technologies, and technical innovations. Reference specific technologies detected in the opportunity. Be concrete and specific, not generic.",
  },
  {
    volume: "technical",
    section_title: "Management Approach",
    section_order: 3,
    prompt_context:
      "Write a management approach section covering project management methodology, communication plans, risk management, quality assurance processes, and reporting structure. Tailor to the specific contract requirements and agency expectations.",
  },
  {
    volume: "technical",
    section_title: "Staffing Plan",
    section_order: 4,
    prompt_context:
      "Write a staffing plan section. Include proposed organizational structure, key personnel qualifications, labor categories, and how staffing will scale. Reference actual team members from the company profile where applicable.",
  },
  {
    volume: "technical",
    section_title: "Transition Plan",
    section_order: 5,
    prompt_context:
      "Write a transition-in plan covering knowledge transfer, onboarding, systems access, and timeline to full operational capability. Include a phased approach with milestones. Also briefly address transition-out responsibilities.",
  },

  // Vol III: Past Performance
  {
    volume: "past_performance",
    section_title: "Past Performance Summary",
    section_order: 1,
    prompt_context:
      "Write a past performance narrative introduction. Summarize the company's relevant experience and track record. Highlight contracts that are most relevant to this opportunity in terms of scope, agency, technology, and contract size.",
  },
  {
    volume: "past_performance",
    section_title: "Contract References",
    section_order: 2,
    prompt_context:
      "Generate detailed past performance write-ups for each relevant contract. For each, include: contract number, agency, period of performance, contract value, description of work, relevance to current opportunity, and performance outcomes. Use the matched past contracts provided.",
  },

  // Vol IV: Cost/Price
  {
    volume: "cost",
    section_title: "Cost Narrative",
    section_order: 1,
    prompt_context:
      "Write a cost/price narrative explaining the pricing methodology, basis of estimate, and how the proposed price represents best value to the government. Note: actual pricing figures should be developed separately -- this is the narrative explanation only.",
  },
  {
    volume: "cost",
    section_title: "Pricing Structure",
    section_order: 2,
    prompt_context:
      "Create a placeholder pricing structure template with labor categories, rates table skeleton, and ODC categories. Mark all figures as [TBD] since actual pricing will be developed separately. Include the structure for CLINs based on the SOW requirements.",
  },
];

// --- Context builders ---

function buildOpportunityContext(
  opportunity: Opportunity,
  analysis: OpportunityAnalysis | null
): string {
  const lines: string[] = [];
  lines.push("=== OPPORTUNITY DETAILS ===");
  lines.push(`Title: ${opportunity.title}`);
  lines.push(`Agency: ${opportunity.agency || "N/A"}`);
  lines.push(`Solicitation Number: ${opportunity.sol_number || "N/A"}`);
  lines.push(`NAICS Code: ${opportunity.naics_code || "N/A"}`);
  lines.push(`Set-Aside: ${opportunity.set_aside_type || "Full & Open"}`);
  lines.push(
    `Place of Performance: ${opportunity.place_of_performance || "N/A"}`
  );
  lines.push(
    `Estimated Value: ${opportunity.estimated_value ? `$${opportunity.estimated_value.toLocaleString()}` : "Not specified"}`
  );
  lines.push(`Response Deadline: ${opportunity.response_deadline || "N/A"}`);
  lines.push("");
  lines.push("Description/SOW:");
  lines.push(opportunity.description || "No description available.");

  if (analysis) {
    lines.push("");
    lines.push("=== AI ANALYSIS SUMMARY ===");
    lines.push(
      `Requirements Summary: ${analysis.requirements_summary || "N/A"}`
    );
    lines.push(
      `Tech Stack Detected: ${analysis.tech_stack_detected || "N/A"}`
    );
    lines.push(`Complexity: ${analysis.complexity_score}/5`);
    lines.push(`Feasibility: ${analysis.feasibility_score}/5`);
    lines.push(`Estimated Effort: ${analysis.estimated_effort || "N/A"}`);
    if (analysis.key_requirements?.length) {
      lines.push(
        `Key Requirements: ${analysis.key_requirements.join("; ")}`
      );
    }
    if (analysis.recommended_approach) {
      lines.push(
        `Recommended Approach: ${analysis.recommended_approach}`
      );
    }
  }

  return lines.join("\n");
}

function buildCompanyContext(profile: CompanyProfileFull): string {
  const lines: string[] = [];
  lines.push("=== COMPANY PROFILE ===");
  lines.push(`Company Name: ${profile.name}`);
  if (profile.uei) lines.push(`UEI: ${profile.uei}`);
  if (profile.cage_code) lines.push(`CAGE Code: ${profile.cage_code}`);
  if (profile.size_standard) lines.push(`Size Standard: ${profile.size_standard}`);
  if (profile.primary_naics) lines.push(`Primary NAICS: ${profile.primary_naics}`);
  if (profile.sam_status) lines.push(`SAM Status: ${profile.sam_status}`);
  if (profile.sam_expiration)
    lines.push(`SAM Expiration: ${profile.sam_expiration}`);

  if (profile.company_certifications.length > 0) {
    lines.push(
      `Certifications: ${profile.company_certifications.map((c) => c.cert_type).join(", ")}`
    );
  }

  if (profile.company_naics_codes.length > 0) {
    lines.push(
      `Registered NAICS Codes: ${profile.company_naics_codes.map((n) => `${n.naics_code}${n.is_primary ? " (primary)" : ""}`).join(", ")}`
    );
  }

  if (profile.company_contract_vehicles.length > 0) {
    lines.push(
      `Contract Vehicles: ${profile.company_contract_vehicles.map((v) => v.vehicle_name).join(", ")}`
    );
  }

  if (profile.team_members.length > 0) {
    lines.push(`\nTeam Members (${profile.team_members.length}):`);
    for (const member of profile.team_members) {
      const parts = [`  - ${member.name}`];
      if (member.title) parts.push(member.title);
      if (member.role) parts.push(`(${member.role})`);
      if (member.clearance_level && member.clearance_level !== "none")
        parts.push(`[${member.clearance_level}]`);
      if (member.years_experience)
        parts.push(`${member.years_experience}yr exp`);
      lines.push(parts.join(" | "));
      if (member.skills?.length) {
        lines.push(`    Skills: ${member.skills.join(", ")}`);
      }
    }
  }

  return lines.join("\n");
}

function buildPastPerformanceContext(matches: MatchResult[]): string {
  if (matches.length === 0) return "";
  const lines: string[] = [];
  lines.push("\n=== MATCHED PAST PERFORMANCE ===");
  for (const match of matches) {
    const c = match.contract;
    lines.push(`\nContract: ${c.title}`);
    lines.push(`  Number: ${c.contract_number}`);
    lines.push(`  Agency: ${c.agency}${c.sub_agency ? ` / ${c.sub_agency}` : ""}`);
    lines.push(`  Type: ${c.contract_type}`);
    lines.push(`  Status: ${c.status}`);
    if (c.total_value) lines.push(`  Value: $${c.total_value.toLocaleString()}`);
    if (c.period_start) lines.push(`  Period: ${c.period_start} to ${c.period_end || "present"}`);
    if (c.description) lines.push(`  Description: ${c.description}`);
    if (c.technologies?.length)
      lines.push(`  Technologies: ${c.technologies.join(", ")}`);
    lines.push(`  Relevance Score: ${match.relevance_score}%`);
  }
  return lines.join("\n");
}

function buildCompetitorContext(intel: CompetitorIntelReport | null): string {
  if (!intel) return "";
  const lines: string[] = [];
  lines.push("\n=== COMPETITOR INTELLIGENCE ===");
  if (intel.incumbents.length > 0) {
    lines.push("Known Incumbents:");
    for (const inc of intel.incumbents) {
      lines.push(
        `  - ${inc.awardee_name}: ${inc.total_awards} awards, $${inc.total_value.toLocaleString()} total`
      );
    }
  }
  if (intel.price_range) {
    lines.push(
      `Market Price Range: $${intel.price_range.min.toLocaleString()} - $${intel.price_range.max.toLocaleString()} (median: $${intel.price_range.median.toLocaleString()})`
    );
  }
  return lines.join("\n");
}

// --- Core generation ---

const SYSTEM_PROMPT = `You are an expert federal government proposal writer with deep experience in IT services contracts. You write clear, compliant, and compelling proposal sections that follow federal acquisition best practices.

Your writing style:
- Professional but not stuffy
- Specific and concrete, avoiding vague platitudes
- Uses action verbs and quantifiable outcomes where possible
- Follows the "ghost the competition" approach -- highlighting strengths without directly naming competitors
- Addresses evaluation criteria directly
- Uses proper federal contracting terminology

Output your response in clean markdown format. Use headers, bullet points, and tables where appropriate. Do not include any meta-commentary -- just the section content.`;

export async function generateSection(
  sectionDef: SectionDef,
  opportunityContext: string,
  companyContext: string,
  pastPerfContext: string,
  competitorContext: string
): Promise<string> {
  const userPrompt = `Generate the following proposal section:

SECTION: ${sectionDef.section_title} (${sectionDef.volume === "admin" ? "Volume I: Administrative" : sectionDef.volume === "technical" ? "Volume II: Technical" : sectionDef.volume === "past_performance" ? "Volume III: Past Performance" : "Volume IV: Cost/Price"})

INSTRUCTIONS: ${sectionDef.prompt_context}

${opportunityContext}

${companyContext}

${pastPerfContext}

${competitorContext}

Generate this section now. Write substantive, tailored content based on the opportunity details and company profile provided. Where specific information is not available, use reasonable placeholders marked with [PLACEHOLDER: description].`;

  return callClaude(userPrompt, SYSTEM_PROMPT);
}

// --- Data fetching helpers ---

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

async function fetchAnalysis(
  opportunityId: string
): Promise<OpportunityAnalysis | null> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("opportunity_analysis")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .maybeSingle();
    if (error || !data) return null;
    return data as OpportunityAnalysis;
  } catch {
    return null;
  }
}

async function fetchMatches(opportunityId: string): Promise<MatchResult[]> {
  try {
    const supabase = getServiceClient();

    const { data: opp } = await supabase
      .from("opportunities")
      .select("*")
      .eq("id", opportunityId)
      .single();
    if (!opp) return [];

    const { data: contracts } = await supabase
      .from("past_contracts")
      .select("*, past_performance_ratings(*)")
      .order("period_end", { ascending: false });

    if (!contracts || contracts.length === 0) return [];

    const matches: MatchResult[] = [];
    for (const contract of contracts as PastContractWithRatings[]) {
      let score = 0;
      const naicsMatch = contract.naics_code === opp.naics_code;
      const agencyMatch =
        contract.agency?.toLowerCase() === opp.agency?.toLowerCase();

      if (naicsMatch) score += 30;
      if (agencyMatch) score += 20;
      if (score > 0) {
        matches.push({
          contract,
          relevance_score: Math.min(100, score),
          match_details: {
            naics_match: naicsMatch,
            agency_match: agencyMatch,
            value_similarity: 0,
            technology_overlap: 0,
            recency_score: 0,
          },
        });
      }
    }

    return matches.sort((a, b) => b.relevance_score - a.relevance_score);
  } catch {
    return [];
  }
}

async function fetchCompetitorIntel(
  opportunityId: string
): Promise<CompetitorIntelReport | null> {
  try {
    const supabase = getServiceClient();
    const { data: awards } = await supabase
      .from("competitor_awards")
      .select("*")
      .eq("opportunity_id", opportunityId);

    if (!awards || awards.length === 0) return null;

    const incumbentMap = new Map<
      string,
      { total_awards: number; total_value: number; most_recent: string | null; contracts: string[] }
    >();

    for (const award of awards) {
      const name = award.awardee_name;
      const existing = incumbentMap.get(name) || {
        total_awards: 0,
        total_value: 0,
        most_recent: null,
        contracts: [],
      };
      existing.total_awards++;
      existing.total_value += award.award_amount || 0;
      if (award.contract_number) existing.contracts.push(award.contract_number);
      if (
        award.award_date &&
        (!existing.most_recent || award.award_date > existing.most_recent)
      ) {
        existing.most_recent = award.award_date;
      }
      incumbentMap.set(name, existing);
    }

    return {
      opportunity_id: opportunityId,
      incumbents: Array.from(incumbentMap.entries()).map(([name, info]) => ({
        awardee_name: name,
        awardee_uei: null,
        total_awards: info.total_awards,
        total_value: info.total_value,
        most_recent_award: info.most_recent,
        contracts: info.contracts,
      })),
      market_awards: awards,
      price_range: null,
      fetched_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// --- Main generation function ---

export interface GenerateProposalResult {
  proposalId: string;
  sections: ProposalSection[];
}

export async function generateProposal(
  opportunity: Opportunity
): Promise<GenerateProposalResult> {
  const supabase = getServiceClient();

  // Fetch all context in parallel
  const [companyProfile, analysis, matches, competitorIntel] =
    await Promise.all([
      fetchCompanyProfile(),
      fetchAnalysis(opportunity.id),
      fetchMatches(opportunity.id),
      fetchCompetitorIntel(opportunity.id),
    ]);

  // Build context strings
  const opportunityContext = buildOpportunityContext(opportunity, analysis);
  const companyContext = companyProfile
    ? buildCompanyContext(companyProfile)
    : "=== COMPANY PROFILE ===\nNo company profile configured. Using generic placeholders.";
  const pastPerfContext = buildPastPerformanceContext(matches);
  const competitorContext = buildCompetitorContext(competitorIntel);

  // Create or get existing proposal
  const { data: existingProposal } = await supabase
    .from("proposals")
    .select("id")
    .eq("opportunity_id", opportunity.id)
    .maybeSingle();

  let proposalId: string;

  if (existingProposal) {
    proposalId = existingProposal.id;
    await supabase
      .from("proposal_sections")
      .delete()
      .eq("proposal_id", proposalId);
    await supabase
      .from("proposals")
      .update({ status: "draft", updated_at: new Date().toISOString() })
      .eq("id", proposalId);
  } else {
    const { data: newProposal, error } = await supabase
      .from("proposals")
      .insert({ opportunity_id: opportunity.id, status: "draft" })
      .select("id")
      .single();
    if (error || !newProposal)
      throw new Error(`Failed to create proposal: ${error?.message}`);
    proposalId = newProposal.id;
  }

  // Generate all sections sequentially
  const generatedSections: ProposalSection[] = [];

  for (const sectionDef of VOLUME_SECTIONS) {
    const content = await generateSection(
      sectionDef,
      opportunityContext,
      companyContext,
      pastPerfContext,
      competitorContext
    );

    const { data: section, error } = await supabase
      .from("proposal_sections")
      .insert({
        proposal_id: proposalId,
        volume: sectionDef.volume,
        section_title: sectionDef.section_title,
        section_order: sectionDef.section_order,
        content,
        ai_generated: true,
        last_edited_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !section) {
      throw new Error(
        `Failed to save section "${sectionDef.section_title}": ${error?.message}`
      );
    }

    generatedSections.push(section as ProposalSection);
  }

  return { proposalId, sections: generatedSections };
}

export async function regenerateSection(
  sectionId: string,
  opportunity: Opportunity
): Promise<ProposalSection> {
  const supabase = getServiceClient();

  const { data: existingSection, error: fetchError } = await supabase
    .from("proposal_sections")
    .select("*")
    .eq("id", sectionId)
    .single();

  if (fetchError || !existingSection) {
    throw new Error("Section not found");
  }

  const sectionDef = VOLUME_SECTIONS.find(
    (s) =>
      s.volume === existingSection.volume &&
      s.section_title === existingSection.section_title
  );

  if (!sectionDef) {
    throw new Error("Unknown section type");
  }

  const [companyProfile, analysis, matches, competitorIntel] =
    await Promise.all([
      fetchCompanyProfile(),
      fetchAnalysis(opportunity.id),
      fetchMatches(opportunity.id),
      fetchCompetitorIntel(opportunity.id),
    ]);

  const opportunityContext = buildOpportunityContext(opportunity, analysis);
  const companyContext = companyProfile
    ? buildCompanyContext(companyProfile)
    : "=== COMPANY PROFILE ===\nNo company profile configured.";
  const pastPerfContext = buildPastPerformanceContext(matches);
  const competitorContext = buildCompetitorContext(competitorIntel);

  const content = await generateSection(
    sectionDef,
    opportunityContext,
    companyContext,
    pastPerfContext,
    competitorContext
  );

  const { data: updated, error } = await supabase
    .from("proposal_sections")
    .update({
      content,
      ai_generated: true,
      last_edited_at: new Date().toISOString(),
    })
    .eq("id", sectionId)
    .select()
    .single();

  if (error || !updated) {
    throw new Error(`Failed to update section: ${error?.message}`);
  }

  return updated as ProposalSection;
}

export { VOLUME_SECTIONS };
