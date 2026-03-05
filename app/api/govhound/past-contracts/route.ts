import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const naics = searchParams.get("naics") || "";
    const agency = searchParams.get("agency") || "";

    let query = supabase
      .from("past_contracts")
      .select("*, past_performance_ratings(*)", { count: "exact" });

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%,contract_number.ilike.%${search}%,agency.ilike.%${search}%`
      );
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (naics) {
      query = query.eq("naics_code", naics);
    }

    if (agency) {
      query = query.ilike("agency", `%${agency}%`);
    }

    query = query
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      contracts: data || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("Past contracts fetch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch past contracts",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const body = await request.json();

    const {
      company_id,
      contract_number,
      task_order_number,
      agency,
      sub_agency,
      title,
      description,
      naics_code,
      contract_type,
      total_value,
      annual_value,
      period_start,
      period_end,
      status,
      place_of_performance,
      technologies,
      key_personnel,
    } = body;

    if (!contract_number || !agency || !title) {
      return NextResponse.json(
        { error: "contract_number, agency, and title are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("past_contracts")
      .insert({
        company_id: company_id || null,
        contract_number,
        task_order_number: task_order_number || null,
        agency,
        sub_agency: sub_agency || null,
        title,
        description: description || null,
        naics_code: naics_code || null,
        contract_type: contract_type || "firm_fixed",
        total_value: total_value || null,
        annual_value: annual_value || null,
        period_start: period_start || null,
        period_end: period_end || null,
        status: status || "active",
        place_of_performance: place_of_performance || null,
        technologies: technologies || [],
        key_personnel: key_personnel || [],
      })
      .select("*, past_performance_ratings(*)")
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Past contract create error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create past contract",
      },
      { status: 500 }
    );
  }
}
