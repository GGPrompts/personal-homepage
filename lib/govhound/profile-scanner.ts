import { getServiceClient } from "./supabase";
import { syncOpportunities } from "./sam-gov";
import type { ScanParams } from "./types";

interface ProfileRecord {
  id: string;
  name: string;
  keywords: string | null;
  naics_codes: string[];
  set_aside_types: string[];
  agencies: string[];
  classification_codes: string[];
  date_range_days: number;
  is_active: boolean;
  last_run_at: string | null;
}

interface ProfileScanResult {
  scan_id: string;
  total_synced: number;
  new_flagged: number;
}

/**
 * Convert a search profile into ScanParams and run a SAM.gov sync.
 * After syncing, flags any opportunities that were not previously seen
 * by this profile as new.
 */
export async function runProfileScan(
  profile: ProfileRecord
): Promise<ProfileScanResult> {
  const supabase = getServiceClient();

  // Build date range based on profile settings
  const now = new Date();
  const dateFrom = new Date(now);
  dateFrom.setDate(dateFrom.getDate() - profile.date_range_days);

  const params: ScanParams = {
    keywords: profile.keywords || undefined,
    naics_codes:
      profile.naics_codes.length > 0 ? profile.naics_codes : undefined,
    set_aside_types:
      profile.set_aside_types.length > 0
        ? profile.set_aside_types
        : undefined,
    agency:
      profile.agencies.length > 0 ? profile.agencies[0] : undefined,
    classification_codes:
      profile.classification_codes.length > 0
        ? profile.classification_codes
        : undefined,
    date_from: dateFrom.toISOString().split("T")[0],
    date_to: now.toISOString().split("T")[0],
  };

  // Run the sync (reuses existing SAM.gov logic)
  const result = await syncOpportunities(params);

  // Find all opportunities matching the scan params that don't already
  // have a flag for this profile
  let query = supabase
    .from("opportunities")
    .select("id");

  // Apply the same filters the scan used to narrow results
  if (profile.naics_codes.length > 0) {
    query = query.in("naics_code", profile.naics_codes);
  }
  if (profile.set_aside_types.length > 0) {
    query = query.in("set_aside_type", profile.set_aside_types);
  }
  if (profile.agencies.length > 0) {
    query = query.in("agency", profile.agencies);
  }
  if (profile.keywords) {
    query = query.ilike("title", `%${profile.keywords}%`);
  }

  // Only flag opportunities posted within the date range
  query = query.gte(
    "posted_date",
    dateFrom.toISOString()
  );

  const { data: matchingOpps, error: matchError } = await query;

  if (matchError) {
    console.error("Error fetching matching opportunities:", matchError);
  }

  let newFlagged = 0;

  if (matchingOpps && matchingOpps.length > 0) {
    // Get existing flags for this profile
    const oppIds = matchingOpps.map((o) => o.id);
    const { data: existingFlags } = await supabase
      .from("new_opportunity_flags")
      .select("opportunity_id")
      .eq("profile_id", profile.id)
      .in("opportunity_id", oppIds);

    const existingSet = new Set(
      (existingFlags || []).map((f) => f.opportunity_id)
    );

    // Insert flags for truly new opportunities
    const newFlags = oppIds
      .filter((id) => !existingSet.has(id))
      .map((opportunity_id) => ({
        opportunity_id,
        profile_id: profile.id,
      }));

    if (newFlags.length > 0) {
      const { error: insertError } = await supabase
        .from("new_opportunity_flags")
        .insert(newFlags);

      if (insertError) {
        console.error("Error inserting flags:", insertError);
      } else {
        newFlagged = newFlags.length;
      }
    }
  }

  // Update the profile's last_run_at
  await supabase
    .from("search_profiles")
    .update({ last_run_at: new Date().toISOString() })
    .eq("id", profile.id);

  return {
    scan_id: result.scan_id,
    total_synced: result.count,
    new_flagged: newFlagged,
  };
}
