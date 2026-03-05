import { getServiceClient } from "./supabase";
import type { ScanParams, Opportunity, AmendmentDiff } from "./types";

const SAM_API_BASE = "https://api.sam.gov/opportunities/v2/search";

// IT-related NAICS codes (Computer Systems Design and Related Services)
export const IT_NAICS_CODES = [
  "541511", // Custom Computer Programming Services
  "541512", // Computer Systems Design Services
  "541513", // Computer Facilities Management Services
  "541519", // Other Computer Related Services
  "541514", // Computer and Computer Peripheral Equipment and Software Merchant Wholesalers
  "541515", // Computer Systems Design and Related Services
  "518210", // Data Processing, Hosting, and Related Services
  "511210", // Software Publishers
];

// IT classification codes
export const IT_CLASSIFICATION_CODES = [
  "D", // IT and Telecom
  "70", // General Purpose IT Equipment
  "7030", // IT Software
];

// Set-aside type mappings
export const SET_ASIDE_TYPES: Record<string, string> = {
  SBA: "Small Business Set-Aside",
  "8A": "8(a) Set-Aside",
  HZC: "HUBZone Set-Aside",
  SDVOSBC: "Service-Disabled Veteran-Owned Small Business",
  WOSB: "Women-Owned Small Business",
  EDWOSB: "Economically Disadvantaged WOSB",
  SBP: "Small Business Program",
};

interface SamApiResponse {
  totalRecords: number;
  opportunitiesData: SamOpportunity[];
}

interface SamOpportunity {
  noticeId: string;
  title: string;
  department?: string;
  agency?: string;
  postedDate?: string;
  responseDeadLine?: string;
  naicsCode?: string;
  typeOfSetAside?: string;
  description?: string;
  placeOfPerformance?: {
    streetAddress?: string;
    city?: string | { code?: string; name?: string };
    state?: string | { code?: string; name?: string };
    country?: string | { code?: string; name?: string };
    zip?: string;
  };
  award?: {
    amount?: number;
    date?: string;
    awardee?: {
      name?: string;
      ueiSAM?: string;
    };
  };
  solicitationNumber?: string;
  classificationCode?: string;
  uiLink?: string;
  type?: string;
  subtier?: string;
  office?: string;
  pointOfContact?: Array<{
    fullName?: string;
    email?: string;
    phone?: string;
  }>;
  resourceLinks?: Array<{ url: string; description?: string }>;
  additionalInfoLink?: string;
  modifiedDate?: string;
  active?: string;
  fullParentPathName?: string;
  [key: string]: unknown;
}

function getApiKey(): string {
  const key = process.env.SAM_GOV_API_KEY;
  if (!key) {
    throw new Error("SAM_GOV_API_KEY environment variable is not set");
  }
  return key;
}

function formatDateForSam(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function buildSearchUrl(params: ScanParams, offset = 0, limit = 25): string {
  const url = new URL(SAM_API_BASE);

  url.searchParams.set("api_key", getApiKey());
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  if (params.keywords) {
    url.searchParams.set("title", params.keywords);
  }

  if (params.naics_codes && params.naics_codes.length > 0) {
    url.searchParams.set("ncode", params.naics_codes.join(","));
  }

  if (params.set_aside_types && params.set_aside_types.length > 0) {
    url.searchParams.set("typeOfSetAside", params.set_aside_types.join(","));
  }

  // postedFrom and postedTo are required by SAM.gov API
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  url.searchParams.set("postedFrom", params.date_from || formatDateForSam(thirtyDaysAgo));
  url.searchParams.set("postedTo", params.date_to || formatDateForSam(now));

  if (params.agency) {
    url.searchParams.set("deptname", params.agency);
  }

  if (params.classification_codes && params.classification_codes.length > 0) {
    url.searchParams.set("ccode", params.classification_codes.join(","));
  }

  // Only active opportunities
  url.searchParams.set("ptype", "o,k,p"); // opportunities, combined synopsis/solicitation, presolicitation

  return url.toString();
}

function extractName(field: unknown): string | null {
  if (!field) return null;
  if (typeof field === "string") return field;
  if (typeof field === "object" && field !== null && "name" in field) {
    return (field as { name?: string }).name || null;
  }
  return null;
}

function formatPlaceOfPerformance(
  pop?: SamOpportunity["placeOfPerformance"]
): string | null {
  if (!pop) return null;
  if (pop.streetAddress) return pop.streetAddress;
  const parts = [extractName(pop.city), extractName(pop.state), extractName(pop.country)].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function mapSamOpportunity(
  raw: SamOpportunity
): Omit<Opportunity, "id" | "created_at"> {
  const primaryContact = raw.pointOfContact?.[0];

  return {
    notice_id: raw.noticeId,
    title: raw.title || "Untitled",
    agency: raw.department || raw.agency || null,
    posted_date: raw.postedDate || null,
    response_deadline: raw.responseDeadLine || null,
    naics_code: raw.naicsCode || null,
    set_aside_type: raw.typeOfSetAside || null,
    description: raw.description || null,
    place_of_performance: formatPlaceOfPerformance(raw.placeOfPerformance),
    estimated_value: raw.award?.amount || null,
    sol_number: raw.solicitationNumber || null,
    classification_code: raw.classificationCode || null,
    url: raw.uiLink || null,
    raw_json: raw as Record<string, unknown>,
    notice_type: raw.type || null,
    contracting_office: raw.subtier || raw.office || null,
    contact_name: primaryContact?.fullName || null,
    contact_email: primaryContact?.email || null,
    contact_phone: primaryContact?.phone || null,
    awardee_name: raw.award?.awardee?.name || null,
    awardee_uei: raw.award?.awardee?.ueiSAM || null,
    award_date: raw.award?.date || null,
    award_amount: raw.award?.amount || null,
    resource_links: raw.resourceLinks || null,
    additional_info_link: raw.additionalInfoLink || null,
    modified_date: raw.modifiedDate || null,
    active: raw.active != null ? raw.active === "Yes" : null,
    pop_zip: raw.placeOfPerformance?.zip || null,
    full_parent_path: raw.fullParentPathName || null,
  };
}

export async function searchOpportunities(
  params: ScanParams,
  offset = 0,
  limit = 25
): Promise<{ total: number; opportunities: Omit<Opportunity, "id" | "created_at">[] }> {
  const url = buildSearchUrl(params, offset, limit);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `SAM.gov API error (${response.status}): ${errorText}`
    );
  }

  const data: SamApiResponse = await response.json();

  return {
    total: data.totalRecords || 0,
    opportunities: (data.opportunitiesData || []).map(mapSamOpportunity),
  };
}

export async function getOpportunityDetail(
  noticeId: string
): Promise<Omit<Opportunity, "id" | "created_at"> | null> {
  const url = new URL(SAM_API_BASE);
  url.searchParams.set("api_key", getApiKey());
  url.searchParams.set("noticeid", noticeId);
  url.searchParams.set("limit", "1");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`SAM.gov API error (${response.status})`);
  }

  const data: SamApiResponse = await response.json();

  if (!data.opportunitiesData || data.opportunitiesData.length === 0) {
    return null;
  }

  return mapSamOpportunity(data.opportunitiesData[0]);
}

export async function syncOpportunities(
  params: ScanParams
): Promise<{ scan_id: string; count: number }> {
  const supabase = getServiceClient();

  // Create scan record
  const { data: scan, error: scanError } = await supabase
    .from("scans")
    .insert({
      query_params: params,
      status: "running",
    })
    .select()
    .single();

  if (scanError || !scan) {
    throw new Error(`Failed to create scan record: ${scanError?.message}`);
  }

  try {
    let offset = 0;
    const limit = 25;
    let totalInserted = 0;
    let hasMore = true;

    while (hasMore) {
      const result = await searchOpportunities(params, offset, limit);

      if (result.opportunities.length === 0) {
        hasMore = false;
        break;
      }

      // Upsert opportunities (update if notice_id already exists)
      const { error: upsertError } = await supabase
        .from("opportunities")
        .upsert(
          result.opportunities.map((opp) => ({
            ...opp,
            // Let Supabase generate the ID for new records
          })),
          { onConflict: "notice_id" }
        );

      if (upsertError) {
        console.error("Upsert error:", upsertError);
      }

      totalInserted += result.opportunities.length;
      offset += limit;

      // Stop if we've fetched all or hit a reasonable limit
      if (offset >= result.total || offset >= 200) {
        hasMore = false;
      }

      // Be respectful to the API
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Update scan record
    await supabase
      .from("scans")
      .update({
        results_count: totalInserted,
        completed_at: new Date().toISOString(),
        status: "completed",
      })
      .eq("id", scan.id);

    return { scan_id: scan.id, count: totalInserted };
  } catch (error) {
    // Mark scan as failed
    await supabase
      .from("scans")
      .update({
        completed_at: new Date().toISOString(),
        status: "failed",
      })
      .eq("id", scan.id);

    throw error;
  }
}

/**
 * Re-fetch a single opportunity from SAM.gov by notice_id and diff against
 * stored data. Returns detected changes and creates activity log entries
 * for any amendments found.
 */
export async function checkForAmendments(
  opportunityId: string
): Promise<{ updated: boolean; changes: AmendmentDiff[] }> {
  const supabase = getServiceClient();

  // Fetch the stored opportunity
  const { data: stored, error: fetchError } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", opportunityId)
    .single();

  if (fetchError || !stored) {
    throw new Error(`Opportunity not found: ${fetchError?.message}`);
  }

  // Re-fetch from SAM.gov
  const fresh = await getOpportunityDetail(stored.notice_id);
  if (!fresh) {
    return { updated: false, changes: [] };
  }

  // Fields to diff
  const diffFields: { key: string; label: string }[] = [
    { key: "response_deadline", label: "Response Deadline" },
    { key: "description", label: "Description" },
    { key: "modified_date", label: "Modified Date" },
  ];

  const changes: AmendmentDiff[] = [];

  for (const field of diffFields) {
    const oldVal = (stored as Record<string, unknown>)[field.key];
    const newVal = (fresh as Record<string, unknown>)[field.key];
    const oldStr = oldVal != null ? String(oldVal) : null;
    const newStr = newVal != null ? String(newVal) : null;
    if (oldStr !== newStr) {
      changes.push({
        field: field.label,
        old_value: oldStr,
        new_value: newStr,
      });
    }
  }

  // Check resource_links changes by JSON comparison
  const oldLinks = JSON.stringify(stored.resource_links || []);
  const newLinks = JSON.stringify(fresh.resource_links || []);
  if (oldLinks !== newLinks) {
    changes.push({
      field: "Resource Links",
      old_value: `${(stored.resource_links || []).length} links`,
      new_value: `${(fresh.resource_links || []).length} links`,
    });
  }

  if (changes.length > 0) {
    // Update the stored opportunity
    const { error: updateError } = await supabase
      .from("opportunities")
      .update({
        response_deadline: fresh.response_deadline,
        description: fresh.description,
        modified_date: fresh.modified_date,
        resource_links: fresh.resource_links,
        raw_json: fresh.raw_json,
      })
      .eq("id", opportunityId);

    if (updateError) {
      console.error("Failed to update opportunity:", updateError);
    }

    // Create activity log entry for the amendment
    const changesSummary = changes
      .map((c) => `${c.field}: "${c.old_value || "(empty)"}" -> "${c.new_value || "(empty)"}"`)
      .join("\n");

    await supabase.from("opportunity_activity_log").insert({
      opportunity_id: opportunityId,
      entry_type: "amendment",
      content: `Amendment detected from SAM.gov:\n${changesSummary}`,
    });
  }

  return { updated: changes.length > 0, changes };
}
