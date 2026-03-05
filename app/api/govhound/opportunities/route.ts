import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

export async function GET(request: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json(
      {
        error: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file.",
        error_code: "MISSING_SUPABASE_KEY",
      },
      { status: 503 }
    );
  }

  try {
    const supabase = getServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;
    const sort = searchParams.get("sort") || "posted_date";
    const order = searchParams.get("order") || "desc";
    const search = searchParams.get("search") || "";
    const naics = searchParams.get("naics") || "";
    const agency = searchParams.get("agency") || "";
    const setAside = searchParams.get("set_aside") || "";
    const analyzed = searchParams.get("analyzed") || "";
    const minFeasibility = searchParams.get("min_feasibility") || "";
    const deadlineFrom = searchParams.get("deadline_from") || "";
    const deadlineTo = searchParams.get("deadline_to") || "";
    const setAsideMulti = searchParams.get("set_aside_types") || ""; // comma-separated

    let query = supabase
      .from("opportunities")
      .select(
        "*, opportunity_analysis(*), saved_opportunities(*)",
        { count: "exact" }
      );

    // Full-text search: use Postgres tsvector for queries with 3+ chars,
    // fall back to ilike for very short queries
    if (search) {
      if (search.length >= 3) {
        // Use websearch_to_tsquery which handles natural language queries
        // e.g. "cloud security" -> 'cloud' & 'security'
        query = query.textSearch("search_vector", search, {
          type: "websearch",
          config: "english",
        });
      } else {
        query = query.or(
          `title.ilike.%${search}%,description.ilike.%${search}%,agency.ilike.%${search}%`
        );
      }
    }

    if (naics) {
      query = query.eq("naics_code", naics);
    }

    if (agency) {
      query = query.ilike("agency", `%${agency}%`);
    }

    if (setAside) {
      query = query.eq("set_aside_type", setAside);
    }

    // Multi-select set-aside types (comma-separated)
    if (setAsideMulti) {
      const types = setAsideMulti.split(",").map((t) => t.trim()).filter(Boolean);
      if (types.length > 0) {
        query = query.in("set_aside_type", types);
      }
    }

    // Deadline range filtering
    if (deadlineFrom) {
      query = query.gte("response_deadline", deadlineFrom);
    }
    if (deadlineTo) {
      query = query.lte("response_deadline", deadlineTo);
    }

    if (analyzed === "true") {
      query = query.not("opportunity_analysis", "is", null);
    }

    // Apply sorting
    const validSortColumns = [
      "posted_date",
      "response_deadline",
      "title",
      "agency",
      "created_at",
    ];
    const sortColumn = validSortColumns.includes(sort) ? sort : "posted_date";
    query = query.order(sortColumn, {
      ascending: order === "asc",
      nullsFirst: false,
    });

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    // Post-filter by feasibility if needed (since it's on the joined table)
    let filteredData = data || [];
    if (minFeasibility) {
      const minScore = parseInt(minFeasibility, 10);
      filteredData = filteredData.filter((opp) => {
        const analysis = Array.isArray(opp.opportunity_analysis)
          ? opp.opportunity_analysis[0]
          : opp.opportunity_analysis;
        return analysis && analysis.feasibility_score >= minScore;
      });
    }

    return NextResponse.json({
      opportunities: filteredData,
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("Opportunities fetch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch opportunities",
      },
      { status: 500 }
    );
  }
}
