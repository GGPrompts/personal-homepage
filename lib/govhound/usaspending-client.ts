/**
 * USASpending.gov REST API client.
 * Free, no API key required.
 * Docs: https://api.usaspending.gov/
 */

const BASE_URL = "https://api.usaspending.gov/api/v2";

export interface USASpendingAward {
  generated_internal_id: string;
  Award_ID: string;
  Recipient_Name: string;
  recipient_id: string | null;
  Recipient_UEI: string | null;
  Award_Amount: number;
  Total_Outlays: number | null;
  Award_Type: string;
  Award_Description: string | null;
  Start_Date: string | null;
  End_Date: string | null;
  Awarding_Agency: string | null;
  Awarding_Sub_Agency: string | null;
  Contract_Award_Type: string | null;
  NAICS_Code: string | null;
  NAICS_Description: string | null;
  "period_of_performance_start_date"?: string;
  "period_of_performance_current_end_date"?: string;
  [key: string]: unknown;
}

export interface USASpendingSearchParams {
  keywords?: string[];
  naics_codes?: string[];
  agency_name?: string;
  recipient_name?: string;
  award_type?: string[];
  date_range?: {
    start_date: string; // YYYY-MM-DD
    end_date: string;
  };
  limit?: number;
  page?: number;
}

interface SpendingByAwardResponse {
  results: USASpendingAward[];
  page_metadata: {
    page: number;
    hasNext: boolean;
    total: number;
  };
}

function buildFilters(params: USASpendingSearchParams): Record<string, unknown> {
  const filters: Record<string, unknown> = {
    // Default to contracts only
    award_type_codes: params.award_type ?? [
      "A", "B", "C", "D", // contract types
    ],
  };

  if (params.keywords && params.keywords.length > 0) {
    filters.keywords = params.keywords;
  }

  if (params.naics_codes && params.naics_codes.length > 0) {
    filters.naics_codes = params.naics_codes;
  }

  if (params.agency_name) {
    filters.agencies = [
      {
        type: "awarding",
        tier: "toptier",
        name: params.agency_name,
      },
    ];
  }

  if (params.recipient_name) {
    filters.recipient_search_text = [params.recipient_name];
  }

  if (params.date_range) {
    filters.time_period = [
      {
        start_date: params.date_range.start_date,
        end_date: params.date_range.end_date,
      },
    ];
  }

  return filters;
}

/**
 * Search awards by various criteria via the spending_by_award endpoint.
 */
export async function searchAwards(
  params: USASpendingSearchParams
): Promise<{ awards: USASpendingAward[]; total: number; hasNext: boolean }> {
  const limit = params.limit ?? 25;
  const page = params.page ?? 1;

  const body = {
    filters: buildFilters(params),
    fields: [
      "Award_ID",
      "Recipient_Name",
      "recipient_id",
      "Recipient_UEI",
      "Award_Amount",
      "Total_Outlays",
      "Award_Type",
      "Award_Description",
      "Start_Date",
      "End_Date",
      "Awarding_Agency",
      "Awarding_Sub_Agency",
      "Contract_Award_Type",
      "NAICS_Code",
      "NAICS_Description",
      "generated_internal_id",
      "period_of_performance_start_date",
      "period_of_performance_current_end_date",
    ],
    limit,
    page,
    sort: "Award_Amount",
    order: "desc",
    subawards: false,
  };

  const response = await fetch(`${BASE_URL}/search/spending_by_award/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `USASpending API error (${response.status}): ${errorText}`
    );
  }

  const data: SpendingByAwardResponse = await response.json();

  return {
    awards: data.results || [],
    total: data.page_metadata?.total ?? 0,
    hasNext: data.page_metadata?.hasNext ?? false,
  };
}

/**
 * Get detailed information about a specific award.
 */
export async function getAwardDetail(
  awardId: string
): Promise<Record<string, unknown> | null> {
  const response = await fetch(`${BASE_URL}/awards/${awardId}/`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`USASpending award detail error (${response.status})`);
  }

  return response.json();
}

/**
 * Search for recipients (contractors) by name or UEI.
 */
export async function searchRecipients(
  keyword: string,
  limit = 10
): Promise<{ results: Record<string, unknown>[]; total: number }> {
  const body = {
    keyword,
    award_type: "contracts",
    limit,
    page: 1,
  };

  const response = await fetch(`${BASE_URL}/recipient/duns/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `USASpending recipient search error (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();
  return {
    results: data.results || [],
    total: data.page_metadata?.total ?? 0,
  };
}
