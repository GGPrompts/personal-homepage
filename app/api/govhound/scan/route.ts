import { NextResponse } from "next/server";
import { syncOpportunities } from "@/lib/govhound/sam-gov";
import { getServiceClient } from "@/lib/govhound/supabase";
import { runProfileScan } from "@/lib/govhound/profile-scanner";
import type { ScanParams } from "@/lib/govhound/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // If a profile_id is provided, run the profile scan instead
    if (body.profile_id) {
      const supabase = getServiceClient();
      const { data: profile, error: profileError } = await supabase
        .from("search_profiles")
        .select("*")
        .eq("id", body.profile_id)
        .single();

      if (profileError || !profile) {
        return NextResponse.json(
          { success: false, error: "Profile not found" },
          { status: 404 }
        );
      }

      const result = await runProfileScan(profile);

      return NextResponse.json({
        success: true,
        scan_id: result.scan_id,
        count: result.total_synced,
        new_flagged: result.new_flagged,
      });
    }

    // Standard manual scan
    const params: ScanParams = {
      keywords: body.keywords || undefined,
      naics_codes: body.naics_codes || undefined,
      set_aside_types: body.set_aside_types || undefined,
      date_from: body.date_from || undefined,
      date_to: body.date_to || undefined,
      agency: body.agency || undefined,
      classification_codes: body.classification_codes || undefined,
    };

    const result = await syncOpportunities(params);

    return NextResponse.json({
      success: true,
      scan_id: result.scan_id,
      count: result.count,
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Scan failed",
      },
      { status: 500 }
    );
  }
}
