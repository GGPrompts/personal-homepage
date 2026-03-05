/**
 * SAM.gov Contract Awards API client.
 * Uses the same SAM_GOV_API_KEY as the opportunities API.
 * Queries historical contract awards from FPDS data via SAM.gov.
 */

const SAM_AWARDS_BASE = "https://api.sam.gov/opportunities/v1/search";

export interface SamAward {
  noticeId: string;
  title: string;
  department?: string;
  agency?: string;
  office?: string;
  naicsCode?: string;
  award?: {
    amount?: number;
    date?: string;
    number?: string;
    awardee?: {
      name?: string;
      ueiSAM?: string;
      duns?: string;
      location?: {
        city?: string;
        state?: string;
        country?: string;
      };
    };
  };
  postedDate?: string;
  type?: string;
  solicitationNumber?: string;
  placeOfPerformance?: {
    city?: string;
    state?: string;
  };
  [key: string]: unknown;
}

export interface SamAwardsSearchParams {
  naics_code?: string;
  agency?: string;
  contractor_name?: string;
  date_from?: string; // MM/DD/YYYY
  date_to?: string;
  limit?: number;
  offset?: number;
}

interface SamAwardsResponse {
  totalRecords: number;
  opportunitiesData: SamAward[];
}

function getApiKey(): string {
  const key = process.env.SAM_GOV_API_KEY;
  if (!key) {
    throw new Error("SAM_GOV_API_KEY environment variable is not set");
  }
  return key;
}

/**
 * Search SAM.gov for historical award notices.
 * Uses ptype=a (award notices) to find contract awards.
 */
export async function searchAwards(
  params: SamAwardsSearchParams
): Promise<{ awards: SamAward[]; total: number }> {
  const url = new URL(SAM_AWARDS_BASE);

  url.searchParams.set("api_key", getApiKey());
  url.searchParams.set("limit", String(params.limit ?? 25));
  url.searchParams.set("offset", String(params.offset ?? 0));

  // Only award notices
  url.searchParams.set("ptype", "a");

  if (params.naics_code) {
    url.searchParams.set("ncode", params.naics_code);
  }

  if (params.agency) {
    url.searchParams.set("deptname", params.agency);
  }

  if (params.contractor_name) {
    url.searchParams.set("title", params.contractor_name);
  }

  if (params.date_from) {
    url.searchParams.set("postedFrom", params.date_from);
  }

  if (params.date_to) {
    url.searchParams.set("postedTo", params.date_to);
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `SAM.gov Awards API error (${response.status}): ${errorText}`
    );
  }

  const data: SamAwardsResponse = await response.json();

  return {
    awards: data.opportunitiesData || [],
    total: data.totalRecords || 0,
  };
}

/**
 * Search for awards by a specific contractor name across all agencies.
 */
export async function searchByContractor(
  contractorName: string,
  naicsCode?: string
): Promise<SamAward[]> {
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  const dateFrom = `${String(fiveYearsAgo.getMonth() + 1).padStart(2, "0")}/${String(fiveYearsAgo.getDate()).padStart(2, "0")}/${fiveYearsAgo.getFullYear()}`;

  const result = await searchAwards({
    contractor_name: contractorName,
    naics_code: naicsCode,
    date_from: dateFrom,
    limit: 100,
  });

  return result.awards;
}

/**
 * Search for awards in a specific agency + NAICS code combination
 * to identify likely incumbents.
 */
export async function searchByAgencyNaics(
  agency: string,
  naicsCode: string
): Promise<SamAward[]> {
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  const dateFrom = `${String(fiveYearsAgo.getMonth() + 1).padStart(2, "0")}/${String(fiveYearsAgo.getDate()).padStart(2, "0")}/${fiveYearsAgo.getFullYear()}`;

  const result = await searchAwards({
    agency,
    naics_code: naicsCode,
    date_from: dateFrom,
    limit: 100,
  });

  return result.awards;
}
