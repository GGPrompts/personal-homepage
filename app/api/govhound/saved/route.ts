import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;
    const status = searchParams.get("status") || "";
    const sort = searchParams.get("sort") || "saved_at";
    const order = searchParams.get("order") || "desc";

    // Query saved_opportunities joined with opportunities and analysis
    let query = supabase
      .from("saved_opportunities")
      .select(
        "*, opportunities(*, opportunity_analysis(*))",
        { count: "exact" }
      );

    // Filter by status
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    // Apply sorting
    const ascending = order === "asc";
    if (sort === "deadline" || sort === "response_deadline") {
      query = query.order("response_deadline", {
        ascending,
        nullsFirst: false,
        referencedTable: "opportunities",
      });
    } else {
      // Default: sort by saved_at
      query = query.order("saved_at", { ascending, nullsFirst: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    // Reshape the data to match OpportunityWithAnalysis format
    // that the frontend expects (opportunity as top-level, with nested saved/analysis)
    const opportunities = (data || []).map((saved) => {
      const opp = saved.opportunities as Record<string, unknown> | null;
      if (!opp) return null;

      const analysisData = opp.opportunity_analysis;
      const analysis = Array.isArray(analysisData)
        ? analysisData[0] || null
        : analysisData || null;

      // Remove the nested join keys from the opportunity
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { opportunity_analysis: _, ...oppFields } = opp as Record<string, unknown>;

      return {
        ...oppFields,
        opportunity_analysis: analysis,
        saved_opportunities: {
          id: saved.id,
          opportunity_id: saved.opportunity_id,
          notes: saved.notes,
          status: saved.status,
          saved_at: saved.saved_at,
        },
      };
    }).filter(Boolean);

    return NextResponse.json({
      opportunities,
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("Saved opportunities fetch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch saved opportunities",
      },
      { status: 500 }
    );
  }
}
