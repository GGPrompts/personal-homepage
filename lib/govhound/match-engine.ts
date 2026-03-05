import type { Opportunity, PastContract, MatchResult } from "./types";

/**
 * Score how relevant a past contract is to a given opportunity.
 * Returns a relevance score between 0 and 100.
 */
function scoreMatch(
  contract: PastContract,
  opportunity: Opportunity
): MatchResult {
  const details = {
    naics_match: false,
    agency_match: false,
    value_similarity: 0,
    technology_overlap: 0,
    recency_score: 0,
  };

  let totalScore = 0;

  // --- NAICS Match (weight: 30) ---
  if (contract.naics_code && opportunity.naics_code) {
    if (contract.naics_code === opportunity.naics_code) {
      details.naics_match = true;
      totalScore += 30;
    } else if (
      contract.naics_code.substring(0, 4) ===
      opportunity.naics_code.substring(0, 4)
    ) {
      // Partial NAICS match (same 4-digit prefix)
      details.naics_match = true;
      totalScore += 20;
    } else if (
      contract.naics_code.substring(0, 2) ===
      opportunity.naics_code.substring(0, 2)
    ) {
      // Same 2-digit sector
      details.naics_match = true;
      totalScore += 10;
    }
  }

  // --- Agency Match (weight: 25) ---
  if (contract.agency && opportunity.agency) {
    const contractAgency = contract.agency.toLowerCase();
    const oppAgency = opportunity.agency.toLowerCase();

    if (contractAgency === oppAgency) {
      details.agency_match = true;
      totalScore += 25;
    } else if (
      contractAgency.includes(oppAgency) ||
      oppAgency.includes(contractAgency)
    ) {
      // Partial match (one contains the other)
      details.agency_match = true;
      totalScore += 15;
    } else {
      // Check for common abbreviation overlap
      const contractWords = new Set(contractAgency.split(/\s+/));
      const oppWords = new Set(oppAgency.split(/\s+/));
      const overlap = [...contractWords].filter((w) =>
        oppWords.has(w)
      ).length;
      if (overlap >= 2) {
        details.agency_match = true;
        totalScore += 10;
      }
    }
  }

  // --- Value Similarity (weight: 15) ---
  if (contract.total_value && opportunity.estimated_value) {
    const ratio =
      Math.min(contract.total_value, opportunity.estimated_value) /
      Math.max(contract.total_value, opportunity.estimated_value);
    details.value_similarity = Math.round(ratio * 100) / 100;
    // Score based on how close the values are (ratio of 1 = perfect match)
    totalScore += Math.round(ratio * 15);
  }

  // --- Technology Overlap (weight: 15) ---
  if (
    contract.technologies &&
    contract.technologies.length > 0 &&
    opportunity.description
  ) {
    const descLower = opportunity.description.toLowerCase();
    const searchText = descLower;
    let matchCount = 0;

    for (const tech of contract.technologies) {
      if (searchText.includes(tech.toLowerCase())) {
        matchCount++;
      }
    }

    if (contract.technologies.length > 0) {
      const overlapRatio = matchCount / contract.technologies.length;
      details.technology_overlap =
        Math.round(overlapRatio * 100) / 100;
      totalScore += Math.round(overlapRatio * 15);
    }
  }

  // --- Recency (weight: 15) ---
  if (contract.period_end) {
    const endDate = new Date(contract.period_end);
    const now = new Date();
    const yearsSinceEnd =
      (now.getTime() - endDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    if (contract.status === "active" || yearsSinceEnd <= 0) {
      // Active contract = max recency
      details.recency_score = 1;
      totalScore += 15;
    } else if (yearsSinceEnd <= 3) {
      // Within 3 years -- strong relevance
      const score = 1 - yearsSinceEnd / 3;
      details.recency_score = Math.round(score * 100) / 100;
      totalScore += Math.round(score * 15);
    } else if (yearsSinceEnd <= 5) {
      // 3-5 years -- still counts but diminished
      const score = 0.3 * (1 - (yearsSinceEnd - 3) / 2);
      details.recency_score = Math.round(Math.max(score, 0) * 100) / 100;
      totalScore += Math.round(Math.max(score, 0) * 15);
    }
    // Beyond 5 years = 0 recency score
  }

  return {
    contract,
    relevance_score: Math.min(totalScore, 100),
    match_details: details,
  };
}

/**
 * Find the best matching past contracts for a given opportunity.
 * Returns up to `limit` matches sorted by relevance score (descending).
 * Only includes matches with a minimum score threshold.
 */
export function findMatches(
  pastContracts: PastContract[],
  opportunity: Opportunity,
  options: { limit?: number; minScore?: number } = {}
): MatchResult[] {
  const { limit = 5, minScore = 10 } = options;

  const scored = pastContracts
    .map((contract) => scoreMatch(contract, opportunity))
    .filter((result) => result.relevance_score >= minScore)
    .sort((a, b) => b.relevance_score - a.relevance_score);

  return scored.slice(0, limit);
}
