import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

/**
 * GET /api/profiles/flags — returns all unseen opportunity IDs across all profiles
 * GET /api/profiles/flags?profile_id=xxx — returns unseen opportunity IDs for a specific profile
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const profileId = request.nextUrl.searchParams.get("profile_id");

    let query = supabase
      .from("new_opportunity_flags")
      .select("opportunity_id, profile_id, flagged_at")
      .eq("seen", false);

    if (profileId) {
      query = query.eq("profile_id", profileId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Return as a set of unique opportunity IDs
    const opportunityIds = [
      ...new Set((data || []).map((f) => f.opportunity_id)),
    ];

    return NextResponse.json({
      flagged_opportunity_ids: opportunityIds,
      flags: data || [],
    });
  } catch (error) {
    console.error("Flags fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch flags" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profiles/flags — mark flags as seen
 * Body: { opportunity_ids: string[] } or { profile_id: string } to mark all for a profile
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = getServiceClient();

    let query = supabase
      .from("new_opportunity_flags")
      .update({ seen: true })
      .eq("seen", false);

    if (body.opportunity_ids && Array.isArray(body.opportunity_ids)) {
      query = query.in("opportunity_id", body.opportunity_ids);
    } else if (body.profile_id) {
      query = query.eq("profile_id", body.profile_id);
    } else {
      // Mark all as seen
    }

    const { error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Flags update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update flags" },
      { status: 500 }
    );
  }
}
