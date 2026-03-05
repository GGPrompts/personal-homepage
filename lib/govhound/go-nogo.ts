import type {
  Opportunity,
  CompanyProfileFull,
  CompanyCertification,
  MatchResult,
  GoNoGoRecommendation,
  ClearanceLevel,
  DEFAULT_GO_NOGO_CRITERIA,
} from "./types";

/**
 * Default go/no-go criteria with weights.
 * Used as seed data when creating a new assessment.
 */
export const DEFAULT_CRITERIA: typeof DEFAULT_GO_NOGO_CRITERIA = [
  { criterion: "Past performance relevance", weight: 0.2 },
  { criterion: "Technical capability match", weight: 0.2 },
  { criterion: "Set-aside/certification eligibility", weight: 0.15 },
  { criterion: "Clearance requirements met", weight: 0.1 },
  { criterion: "Price competitiveness", weight: 0.1 },
  { criterion: "Strategic value", weight: 0.1 },
  { criterion: "Resource availability", weight: 0.1 },
  { criterion: "Geographic feasibility", weight: 0.05 },
];

/**
 * Map of SAM.gov set-aside codes to the certification types they require.
 */
const SET_ASIDE_CERT_MAP: Record<string, string[]> = {
  SBA: ["8a"],
  "8(a)": ["8a"],
  "8A": ["8a"],
  HZC: ["hubzone"],
  HUBZone: ["hubzone"],
  SDVOSBC: ["sdvosb"],
  SDVOSB: ["sdvosb"],
  WOSB: ["wosb"],
  EDWOSB: ["edwosb"],
  SBP: [], // Small business preference -- no specific cert
};

/**
 * Clearance level hierarchy for comparison.
 * Higher index = higher clearance.
 */
const CLEARANCE_HIERARCHY: ClearanceLevel[] = [
  "none",
  "public_trust",
  "secret",
  "top_secret",
  "ts_sci",
];

interface AutoScoreResult {
  criterion: string;
  weight: number;
  score: number | null;
  notes: string | null;
  autoScored: boolean;
}

/**
 * Auto-score criteria that can be computed from company profile and opportunity data.
 * Returns null score for subjective criteria that require manual input.
 */
export function autoScoreCriteria(
  opportunity: Opportunity,
  companyProfile: CompanyProfileFull | null,
  pastMatches: MatchResult[]
): AutoScoreResult[] {
  return DEFAULT_CRITERIA.map(({ criterion, weight }) => {
    switch (criterion) {
      case "Past performance relevance":
        return scorePastPerformance(criterion, weight, pastMatches);
      case "Technical capability match":
        return scoreTechnicalCapability(
          criterion,
          weight,
          opportunity,
          companyProfile
        );
      case "Set-aside/certification eligibility":
        return scoreSetAsideEligibility(
          criterion,
          weight,
          opportunity,
          companyProfile
        );
      case "Clearance requirements met":
        return scoreClearanceRequirements(
          criterion,
          weight,
          opportunity,
          companyProfile
        );
      default:
        // Subjective criteria -- leave for manual scoring
        return {
          criterion,
          weight,
          score: null,
          notes: null,
          autoScored: false,
        };
    }
  });
}

function scorePastPerformance(
  criterion: string,
  weight: number,
  matches: MatchResult[]
): AutoScoreResult {
  if (matches.length === 0) {
    return {
      criterion,
      weight,
      score: 1,
      notes: "No relevant past contracts found.",
      autoScored: true,
    };
  }

  // Use the top match relevance score to derive a 1-5 score
  const topScore = matches[0].relevance_score;
  const avgScore =
    matches.reduce((sum, m) => sum + m.relevance_score, 0) / matches.length;

  // Weighted blend: 60% top match, 40% average
  const blended = topScore * 0.6 + avgScore * 0.4;

  let score: number;
  if (blended >= 60) score = 5;
  else if (blended >= 45) score = 4;
  else if (blended >= 30) score = 3;
  else if (blended >= 15) score = 2;
  else score = 1;

  const matchSummary = matches
    .slice(0, 3)
    .map((m) => `${m.contract.title} (${m.relevance_score}%)`)
    .join("; ");

  return {
    criterion,
    weight,
    score,
    notes: `Top ${matches.length} match(es): ${matchSummary}`,
    autoScored: true,
  };
}

function scoreTechnicalCapability(
  criterion: string,
  weight: number,
  opportunity: Opportunity,
  profile: CompanyProfileFull | null
): AutoScoreResult {
  if (!profile) {
    return {
      criterion,
      weight,
      score: null,
      notes: "No company profile configured. Set up your profile to auto-score.",
      autoScored: false,
    };
  }

  let score = 3; // Baseline
  const notes: string[] = [];

  // Check NAICS code match
  const companyNaics = profile.company_naics_codes.map((n) => n.naics_code);
  if (opportunity.naics_code) {
    if (companyNaics.includes(opportunity.naics_code)) {
      score += 1;
      notes.push(`NAICS ${opportunity.naics_code} is registered.`);
    } else {
      const partialMatch = companyNaics.some(
        (code) =>
          code.substring(0, 4) ===
          opportunity.naics_code!.substring(0, 4)
      );
      if (partialMatch) {
        notes.push(`Related NAICS found (4-digit prefix match).`);
      } else {
        score -= 1;
        notes.push(`NAICS ${opportunity.naics_code} not in company codes.`);
      }
    }
  }

  // Check team skills against description keywords
  if (opportunity.description && profile.team_members.length > 0) {
    const allSkills = profile.team_members.flatMap((m) =>
      m.skills.map((s) => s.toLowerCase())
    );
    const descLower = opportunity.description.toLowerCase();
    const matchedSkills = allSkills.filter((skill) =>
      descLower.includes(skill)
    );
    const uniqueMatched = [...new Set(matchedSkills)];

    if (uniqueMatched.length >= 5) {
      score = Math.min(score + 1, 5);
      notes.push(
        `${uniqueMatched.length} team skills match: ${uniqueMatched.slice(0, 5).join(", ")}.`
      );
    } else if (uniqueMatched.length >= 2) {
      notes.push(
        `${uniqueMatched.length} team skills match: ${uniqueMatched.join(", ")}.`
      );
    } else if (uniqueMatched.length === 0 && allSkills.length > 0) {
      score = Math.max(score - 1, 1);
      notes.push("No team skill matches found in description.");
    }
  }

  return {
    criterion,
    weight,
    score: Math.max(1, Math.min(5, score)),
    notes: notes.join(" ") || null,
    autoScored: true,
  };
}

function scoreSetAsideEligibility(
  criterion: string,
  weight: number,
  opportunity: Opportunity,
  profile: CompanyProfileFull | null
): AutoScoreResult {
  if (!opportunity.set_aside_type || opportunity.set_aside_type === "None") {
    return {
      criterion,
      weight,
      score: 5,
      notes: "No set-aside requirement -- full and open competition.",
      autoScored: true,
    };
  }

  if (!profile) {
    return {
      criterion,
      weight,
      score: null,
      notes: `Set-aside: ${opportunity.set_aside_type}. No company profile to verify eligibility.`,
      autoScored: false,
    };
  }

  const requiredCerts =
    SET_ASIDE_CERT_MAP[opportunity.set_aside_type] || [];
  const companyCertTypes = profile.company_certifications
    .filter((c) => c.status === "active")
    .map((c) => c.cert_type);

  // If no specific cert is mapped but set-aside exists, check small business
  if (requiredCerts.length === 0 && opportunity.set_aside_type) {
    return {
      criterion,
      weight,
      score: 3,
      notes: `Set-aside: ${opportunity.set_aside_type}. Verify eligibility manually.`,
      autoScored: false,
    };
  }

  const hasAllCerts = requiredCerts.every((cert) =>
    companyCertTypes.includes(cert as CompanyCertification["cert_type"])
  );

  if (hasAllCerts) {
    // Check expiration
    const relevantCerts = profile.company_certifications.filter(
      (c) =>
        requiredCerts.includes(c.cert_type) && c.status === "active"
    );
    const expiringSoon = relevantCerts.some((c) => {
      if (!c.expiration_date) return false;
      const daysUntilExpiry =
        (new Date(c.expiration_date).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24);
      return daysUntilExpiry < 90;
    });

    return {
      criterion,
      weight,
      score: expiringSoon ? 4 : 5,
      notes: expiringSoon
        ? `Eligible for ${opportunity.set_aside_type}, but certification expiring within 90 days.`
        : `Eligible for ${opportunity.set_aside_type} set-aside.`,
      autoScored: true,
    };
  }

  return {
    criterion,
    weight,
    score: 1,
    notes: `Missing required certification(s) for ${opportunity.set_aside_type}: ${requiredCerts.join(", ")}.`,
    autoScored: true,
  };
}

function scoreClearanceRequirements(
  criterion: string,
  weight: number,
  opportunity: Opportunity,
  profile: CompanyProfileFull | null
): AutoScoreResult {
  // Try to detect clearance requirements from description
  const desc = (opportunity.description || "").toLowerCase();

  let requiredLevel: ClearanceLevel = "none";
  if (
    desc.includes("ts/sci") ||
    desc.includes("ts-sci") ||
    desc.includes("top secret/sci")
  ) {
    requiredLevel = "ts_sci";
  } else if (
    desc.includes("top secret") &&
    !desc.includes("top secret/sci")
  ) {
    requiredLevel = "top_secret";
  } else if (desc.includes("secret") && !desc.includes("top secret")) {
    requiredLevel = "secret";
  } else if (desc.includes("public trust")) {
    requiredLevel = "public_trust";
  }

  if (requiredLevel === "none") {
    return {
      criterion,
      weight,
      score: 5,
      notes: "No clearance requirements detected in description.",
      autoScored: true,
    };
  }

  if (!profile || profile.team_members.length === 0) {
    return {
      criterion,
      weight,
      score: null,
      notes: `Detected ${requiredLevel.replace(/_/g, " ")} clearance requirement. No team data to verify.`,
      autoScored: false,
    };
  }

  const requiredIdx = CLEARANCE_HIERARCHY.indexOf(requiredLevel);
  const clearedMembers = profile.team_members.filter((m) => {
    const memberIdx = CLEARANCE_HIERARCHY.indexOf(m.clearance_level);
    return memberIdx >= requiredIdx;
  });

  const totalMembers = profile.team_members.length;
  const clearanceRatio =
    totalMembers > 0 ? clearedMembers.length / totalMembers : 0;

  let score: number;
  if (clearanceRatio >= 0.8) score = 5;
  else if (clearanceRatio >= 0.5) score = 4;
  else if (clearanceRatio >= 0.3) score = 3;
  else if (clearedMembers.length > 0) score = 2;
  else score = 1;

  return {
    criterion,
    weight,
    score,
    notes: `Requires ${requiredLevel.replace(/_/g, " ")}. ${clearedMembers.length}/${totalMembers} team members cleared.`,
    autoScored: true,
  };
}

/**
 * Detect compliance requirements from the opportunity description.
 * Extracts certification mentions, framework references, etc.
 */
export function detectComplianceRequirements(
  opportunity: Opportunity
): { requirement_text: string; source_section: string }[] {
  const desc = opportunity.description || "";
  const items: { requirement_text: string; source_section: string }[] = [];

  const patterns: { regex: RegExp; label: string }[] = [
    { regex: /CMMC\s*(Level\s*)?[12]/gi, label: "CMMC Certification" },
    { regex: /FedRAMP/gi, label: "FedRAMP Authorization" },
    { regex: /ISO\s*27001/gi, label: "ISO 27001 Certification" },
    { regex: /SOC\s*2/gi, label: "SOC 2 Compliance" },
    { regex: /Section\s*508/gi, label: "Section 508 Accessibility" },
    { regex: /FISMA/gi, label: "FISMA Compliance" },
    { regex: /NIST\s*(SP\s*)?800-171/gi, label: "NIST 800-171 Compliance" },
    { regex: /NIST\s*(SP\s*)?800-53/gi, label: "NIST 800-53 Controls" },
    {
      regex: /top\s*secret(?:\/sci)?|ts[/-]sci/gi,
      label: "Security Clearance Required",
    },
    { regex: /secret\s+clearance/gi, label: "Secret Clearance Required" },
    {
      regex: /public\s+trust/gi,
      label: "Public Trust Clearance Required",
    },
    { regex: /FAR\s+52\.\d+/gi, label: "FAR Clause Compliance" },
    { regex: /DFARS/gi, label: "DFARS Compliance" },
    {
      regex: /small\s+business\s+(?:sub)?contracting\s+plan/gi,
      label: "Small Business Subcontracting Plan",
    },
    {
      regex: /past\s+performance\s+(?:questionnaire|evaluation)/gi,
      label: "Past Performance Documentation",
    },
    {
      regex: /oral\s+presentation/gi,
      label: "Oral Presentation Required",
    },
    {
      regex: /key\s+personnel/gi,
      label: "Key Personnel Requirements",
    },
  ];

  const seen = new Set<string>();
  for (const { regex, label } of patterns) {
    const match = regex.exec(desc);
    if (match && !seen.has(label)) {
      seen.add(label);
      // Extract surrounding context
      const start = Math.max(0, match.index - 50);
      const end = Math.min(desc.length, match.index + match[0].length + 50);
      const context = desc.substring(start, end).replace(/\n/g, " ").trim();

      items.push({
        requirement_text: label,
        source_section: `"...${context}..."`,
      });
    }
  }

  // Always add standard compliance items for federal contracts
  const standardItems = [
    "SAM.gov registration current",
    "UEI number active",
    "Representations and certifications current",
  ];

  for (const item of standardItems) {
    if (!seen.has(item)) {
      seen.add(item);
      items.push({
        requirement_text: item,
        source_section: "Standard federal requirement",
      });
    }
  }

  return items;
}

/**
 * Calculate the overall weighted score from individual criterion scores.
 * Returns a value between 0 and 5.
 */
export function calculateOverallScore(
  scores: { weight: number; score: number | null }[]
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const { weight, score } of scores) {
    if (score != null) {
      totalWeight += weight;
      weightedSum += weight * score;
    }
  }

  if (totalWeight === 0) return 0;

  // Normalize to account for un-scored criteria
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

/**
 * Determine the recommendation based on overall score.
 */
export function deriveRecommendation(
  overallScore: number
): GoNoGoRecommendation {
  if (overallScore >= 4.0) return "strong_go";
  if (overallScore >= 3.0) return "go";
  if (overallScore >= 2.0) return "conditional_go";
  return "no_go";
}
