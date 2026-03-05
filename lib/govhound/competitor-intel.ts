/**
 * Competitor intelligence orchestration.
 *
 * Given an opportunity, queries USASpending.gov and SAM.gov Awards API for:
 * 1. Awards to the same agency+office in the same NAICS in the last 5 years
 *    to identify likely incumbents.
 * 2. Similar-scope awards across agencies for market pricing data.
 *
 * Results are cached in the competitor_awards table to avoid redundant API calls.
 */

import { getServiceClient } from "./supabase";
import * as usaspending from "./usaspending-client";
import * as samAwards from "./sam-awards-client";
import type {
  Opportunity,
  CompetitorAward,
  IncumbentInfo,
  PriceRange,
  CompetitorIntelReport,
} from "./types";

const CACHE_TTL_HOURS = 24;

/**
 * Check if we have recent cached results for an opportunity.
 */
async function getCachedAwards(
  opportunityId: string
): Promise<CompetitorAward[] | null> {
  const supabase = getServiceClient();
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - CACHE_TTL_HOURS);

  const { data, error } = await supabase
    .from("competitor_awards")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .gte("fetched_at", cutoff.toISOString());

  if (error || !data || data.length === 0) {
    return null;
  }

  return data as CompetitorAward[];
}

/**
 * Store fetched awards in the database for caching.
 */
async function cacheAwards(
  awards: Omit<CompetitorAward, "id" | "fetched_at">[]
): Promise<void> {
  if (awards.length === 0) return;

  const supabase = getServiceClient();
  const { error } = await supabase.from("competitor_awards").insert(awards);

  if (error) {
    console.error("Failed to cache competitor awards:", error.message);
  }
}

/**
 * Fetch awards from USASpending.gov for a given NAICS code and agency.
 */
async function fetchUSASpendingAwards(
  opportunity: Opportunity
): Promise<Omit<CompetitorAward, "id" | "fetched_at">[]> {
  const awards: Omit<CompetitorAward, "id" | "fetched_at">[] = [];

  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  try {
    // Search by NAICS + agency for incumbent identification
    const searchParams: usaspending.USASpendingSearchParams = {
      date_range: {
        start_date: fiveYearsAgo.toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
      },
      limit: 50,
    };

    if (opportunity.naics_code) {
      searchParams.naics_codes = [opportunity.naics_code];
    }

    if (opportunity.agency) {
      searchParams.agency_name = opportunity.agency;
    }

    // Only search if we have at least one filter beyond date
    if (searchParams.naics_codes || searchParams.agency_name) {
      const result = await usaspending.searchAwards(searchParams);

      for (const award of result.awards) {
        awards.push({
          opportunity_id: opportunity.id,
          naics_code: award.NAICS_Code || opportunity.naics_code || null,
          agency: award.Awarding_Agency || opportunity.agency || null,
          awardee_name: award.Recipient_Name || "Unknown",
          awardee_uei: award.Recipient_UEI || null,
          award_amount: award.Award_Amount ?? null,
          award_date: award.Start_Date || null,
          contract_number: award.Award_ID || null,
          period_of_performance: formatPeriod(
            award.Start_Date,
            award.End_Date
          ),
          source: "usaspending",
        });
      }
    }
  } catch (err) {
    console.error("USASpending fetch error:", err);
    // Non-fatal: continue with SAM awards
  }

  return awards;
}

/**
 * Fetch awards from SAM.gov Awards API.
 */
async function fetchSamAwards(
  opportunity: Opportunity
): Promise<Omit<CompetitorAward, "id" | "fetched_at">[]> {
  const awards: Omit<CompetitorAward, "id" | "fetched_at">[] = [];

  try {
    if (opportunity.agency && opportunity.naics_code) {
      const samResults = await samAwards.searchByAgencyNaics(
        opportunity.agency,
        opportunity.naics_code
      );

      for (const award of samResults) {
        if (!award.award?.awardee?.name) continue;

        awards.push({
          opportunity_id: opportunity.id,
          naics_code: award.naicsCode || opportunity.naics_code || null,
          agency: award.department || award.agency || opportunity.agency || null,
          awardee_name: award.award.awardee.name,
          awardee_uei: award.award.awardee.ueiSAM || null,
          award_amount: award.award.amount ?? null,
          award_date: award.award.date || award.postedDate || null,
          contract_number: award.award.number || award.solicitationNumber || null,
          period_of_performance: null,
          source: "sam_awards",
        });
      }
    }
  } catch (err) {
    console.error("SAM Awards fetch error:", err);
    // Non-fatal
  }

  return awards;
}

function formatPeriod(
  start: string | null | undefined,
  end: string | null | undefined
): string | null {
  if (!start && !end) return null;
  const s = start ? start.split("T")[0] : "?";
  const e = end ? end.split("T")[0] : "?";
  return `${s} to ${e}`;
}

/**
 * Identify likely incumbents from a list of awards.
 * Groups awards by awardee and ranks by total contract value and recency.
 */
function identifyIncumbents(awards: CompetitorAward[]): IncumbentInfo[] {
  const byAwardee = new Map<
    string,
    {
      name: string;
      uei: string | null;
      awards: CompetitorAward[];
    }
  >();

  for (const award of awards) {
    const key = award.awardee_uei || award.awardee_name.toLowerCase();
    const existing = byAwardee.get(key);
    if (existing) {
      existing.awards.push(award);
    } else {
      byAwardee.set(key, {
        name: award.awardee_name,
        uei: award.awardee_uei,
        awards: [award],
      });
    }
  }

  const incumbents: IncumbentInfo[] = [];

  for (const [, entry] of byAwardee) {
    const totalValue = entry.awards.reduce(
      (sum, a) => sum + (a.award_amount ?? 0),
      0
    );

    const dates = entry.awards
      .map((a) => a.award_date)
      .filter((d): d is string => d != null)
      .sort()
      .reverse();

    const contracts = entry.awards
      .map((a) => a.contract_number)
      .filter((c): c is string => c != null);

    incumbents.push({
      awardee_name: entry.name,
      awardee_uei: entry.uei,
      total_awards: entry.awards.length,
      total_value: totalValue,
      most_recent_award: dates[0] || null,
      contracts: [...new Set(contracts)],
    });
  }

  // Sort by total value descending (highest value = most likely incumbent)
  incumbents.sort((a, b) => b.total_value - a.total_value);

  return incumbents;
}

/**
 * Calculate price range from historical awards.
 */
function calculatePriceRange(awards: CompetitorAward[]): PriceRange | null {
  const amounts = awards
    .map((a) => a.award_amount)
    .filter((a): a is number => a != null && a > 0)
    .sort((a, b) => a - b);

  if (amounts.length === 0) return null;

  const sum = amounts.reduce((a, b) => a + b, 0);
  const median =
    amounts.length % 2 === 0
      ? (amounts[amounts.length / 2 - 1] + amounts[amounts.length / 2]) / 2
      : amounts[Math.floor(amounts.length / 2)];

  return {
    min: amounts[0],
    max: amounts[amounts.length - 1],
    median,
    average: Math.round(sum / amounts.length),
    count: amounts.length,
  };
}

/**
 * Main entry point: fetch competitor intelligence for an opportunity.
 * Returns cached results if available, otherwise fetches from both APIs.
 */
export async function getCompetitorIntel(
  opportunity: Opportunity,
  forceRefresh = false
): Promise<CompetitorIntelReport> {
  // Check cache first
  if (!forceRefresh) {
    const cached = await getCachedAwards(opportunity.id);
    if (cached && cached.length > 0) {
      return {
        opportunity_id: opportunity.id,
        incumbents: identifyIncumbents(cached),
        market_awards: cached,
        price_range: calculatePriceRange(cached),
        fetched_at: cached[0].fetched_at,
      };
    }
  }

  // Clear old cached data for this opportunity before re-fetching
  if (forceRefresh) {
    const supabase = getServiceClient();
    await supabase
      .from("competitor_awards")
      .delete()
      .eq("opportunity_id", opportunity.id);
  }

  // Fetch from both sources in parallel
  const [usaAwards, samAwardsList] = await Promise.all([
    fetchUSASpendingAwards(opportunity),
    fetchSamAwards(opportunity),
  ]);

  const allAwards = [...usaAwards, ...samAwardsList];

  // Deduplicate by contract number when possible
  const seen = new Set<string>();
  const deduped = allAwards.filter((a) => {
    if (!a.contract_number) return true;
    const key = a.contract_number.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Cache results
  await cacheAwards(deduped);

  // Re-read from DB to get IDs and fetched_at
  const supabase = getServiceClient();
  const { data: cachedAwards } = await supabase
    .from("competitor_awards")
    .select("*")
    .eq("opportunity_id", opportunity.id)
    .order("award_amount", { ascending: false, nullsFirst: false });

  const finalAwards = (cachedAwards as CompetitorAward[]) || [];

  return {
    opportunity_id: opportunity.id,
    incumbents: identifyIncumbents(finalAwards),
    market_awards: finalAwards,
    price_range: calculatePriceRange(finalAwards),
    fetched_at: new Date().toISOString(),
  };
}
