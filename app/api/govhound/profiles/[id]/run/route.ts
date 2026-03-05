import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";
import { runProfileScan } from "@/lib/govhound/profile-scanner";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();

    // Fetch the profile
    const { data: profile, error: profileError } = await supabase
      .from("search_profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const result = await runProfileScan(profile);

    return NextResponse.json({
      success: true,
      scan_id: result.scan_id,
      total_synced: result.total_synced,
      new_flagged: result.new_flagged,
    });
  } catch (error) {
    console.error("Profile run error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Profile scan failed" },
      { status: 500 }
    );
  }
}
