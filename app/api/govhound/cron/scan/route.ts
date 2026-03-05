import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";
import { runProfileScan } from "@/lib/govhound/profile-scanner";

/**
 * Cron endpoint: runs all active search profiles.
 *
 * Designed to be called by Vercel Cron (see vercel.json) or an external
 * scheduler. Protected by CRON_SECRET environment variable when set.
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret if configured
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    const supabase = getServiceClient();

    // Get all active profiles
    const { data: profiles, error } = await supabase
      .from("search_profiles")
      .select("*")
      .eq("is_active", true)
      .order("last_run_at", { ascending: true, nullsFirst: true });

    if (error) {
      throw new Error(error.message);
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active profiles to scan",
        results: [],
      });
    }

    const results = [];

    for (const profile of profiles) {
      try {
        const result = await runProfileScan(profile);
        results.push({
          profile_id: profile.id,
          profile_name: profile.name,
          success: true,
          scan_id: result.scan_id,
          total_synced: result.total_synced,
          new_flagged: result.new_flagged,
        });
      } catch (profileError) {
        console.error(
          `Failed to scan profile ${profile.name}:`,
          profileError
        );
        results.push({
          profile_id: profile.id,
          profile_name: profile.name,
          success: false,
          error:
            profileError instanceof Error
              ? profileError.message
              : "Scan failed",
        });
      }

      // Delay between profiles to avoid API rate limits
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return NextResponse.json({
      success: true,
      profiles_scanned: results.length,
      results,
    });
  } catch (error) {
    console.error("Cron scan error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Cron scan failed",
      },
      { status: 500 }
    );
  }
}
