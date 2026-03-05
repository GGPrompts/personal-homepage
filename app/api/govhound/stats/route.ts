import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

export async function GET() {
  try {
    const supabase = getServiceClient();

    // Total opportunities
    const { count: totalOpportunities } = await supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true });

    // High feasibility (score >= 4)
    const { count: highFeasibility } = await supabase
      .from("opportunity_analysis")
      .select("*", { count: "exact", head: true })
      .gte("feasibility_score", 4);

    // Upcoming deadlines (next 14 days)
    const now = new Date().toISOString();
    const twoWeeks = new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { count: upcomingDeadlines } = await supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .gte("response_deadline", now)
      .lte("response_deadline", twoWeeks);

    // Active bids
    const { count: activeBids } = await supabase
      .from("saved_opportunities")
      .select("*", { count: "exact", head: true })
      .eq("status", "bidding");

    return NextResponse.json({
      total_opportunities: totalOpportunities || 0,
      high_feasibility: highFeasibility || 0,
      upcoming_deadlines: upcomingDeadlines || 0,
      active_bids: activeBids || 0,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch stats",
      },
      { status: 500 }
    );
  }
}
