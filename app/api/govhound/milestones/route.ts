import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const supabase = getServiceClient();

    let query = supabase
      .from("opportunity_milestones")
      .select("*, opportunities(id, title, notice_id, response_deadline, agency)")
      .order("due_date", { ascending: true });

    if (from) {
      query = query.gte("due_date", from);
    }
    if (to) {
      query = query.lte("due_date", to);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Also fetch opportunities with response deadlines in range
    let deadlineQuery = supabase
      .from("opportunities")
      .select("id, title, notice_id, response_deadline, agency")
      .not("response_deadline", "is", null);

    if (from) {
      deadlineQuery = deadlineQuery.gte("response_deadline", from);
    }
    if (to) {
      deadlineQuery = deadlineQuery.lte("response_deadline", to);
    }

    const { data: deadlines, error: deadlineError } = await deadlineQuery
      .order("response_deadline", { ascending: true });

    if (deadlineError) throw deadlineError;

    return NextResponse.json({
      milestones: data || [],
      deadlines: deadlines || [],
    });
  } catch (error) {
    console.error("Calendar milestones error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch milestones" },
      { status: 500 }
    );
  }
}
