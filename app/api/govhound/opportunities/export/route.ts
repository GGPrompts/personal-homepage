import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

function escapeCsv(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const sort = searchParams.get("sort") || "posted_date";
    const order = searchParams.get("order") || "desc";
    const search = searchParams.get("search") || "";
    const naics = searchParams.get("naics") || "";
    const agency = searchParams.get("agency") || "";
    const setAside = searchParams.get("set_aside") || "";
    const savedStatus = searchParams.get("saved_status") || "";

    // If requesting saved opportunities, query from saved_opportunities table
    if (savedStatus) {
      let query = supabase
        .from("saved_opportunities")
        .select("*, opportunities(*, opportunity_analysis(*))");

      if (savedStatus !== "all") {
        query = query.eq("status", savedStatus);
      }

      query = query.order("saved_at", { ascending: false });
      query = query.limit(1000);

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data || []).map((saved) => {
        const opp = saved.opportunities as Record<string, unknown> | null;
        if (!opp) return null;
        const analysis = Array.isArray(opp.opportunity_analysis)
          ? (opp.opportunity_analysis as Record<string, unknown>[])[0]
          : opp.opportunity_analysis as Record<string, unknown> | null;

        return {
          title: opp.title as string,
          agency: opp.agency as string | null,
          sol_number: opp.sol_number as string | null,
          naics_code: opp.naics_code as string | null,
          set_aside_type: opp.set_aside_type as string | null,
          posted_date: opp.posted_date as string | null,
          response_deadline: opp.response_deadline as string | null,
          estimated_value: opp.estimated_value as number | null,
          status: saved.status,
          saved_at: saved.saved_at,
          feasibility_score: analysis?.feasibility_score ?? null,
          complexity_score: analysis?.complexity_score ?? null,
          url: opp.url as string | null,
        };
      }).filter(Boolean);

      return buildCsvResponse(rows as Record<string, unknown>[]);
    }

    // Otherwise, query from opportunities table with filters
    let query = supabase
      .from("opportunities")
      .select("*, opportunity_analysis(*), saved_opportunities(*)");

    if (search) {
      if (search.length >= 3) {
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

    // Cap export at 1000 rows
    query = query.limit(1000);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data || []).map((opp) => {
      const analysis = Array.isArray(opp.opportunity_analysis)
        ? opp.opportunity_analysis[0]
        : opp.opportunity_analysis;
      const saved = Array.isArray(opp.saved_opportunities)
        ? opp.saved_opportunities[0]
        : opp.saved_opportunities;

      return {
        title: opp.title,
        agency: opp.agency,
        sol_number: opp.sol_number,
        naics_code: opp.naics_code,
        set_aside_type: opp.set_aside_type,
        posted_date: opp.posted_date,
        response_deadline: opp.response_deadline,
        estimated_value: opp.estimated_value,
        status: saved?.status ?? "",
        feasibility_score: analysis?.feasibility_score ?? null,
        complexity_score: analysis?.complexity_score ?? null,
        url: opp.url,
      };
    });

    return buildCsvResponse(rows);
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Export failed",
      },
      { status: 500 }
    );
  }
}

function buildCsvResponse(rows: Record<string, unknown>[]): NextResponse {
  if (rows.length === 0) {
    const csv = "No data to export\n";
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=govhound-export.csv",
      },
    });
  }

  const headers = Object.keys(rows[0]);
  const headerRow = headers.map((h) => escapeCsv(h)).join(",");
  const dataRows = rows.map((row) =>
    headers.map((h) => escapeCsv(String(row[h] ?? ""))).join(",")
  );

  const csv = [headerRow, ...dataRows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=govhound-export-${new Date().toISOString().slice(0, 10)}.csv`,
    },
  });
}
