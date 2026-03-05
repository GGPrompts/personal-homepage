import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("past_contracts")
      .select("*, past_performance_ratings(*)")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Past contract not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Past contract fetch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch past contract",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (contract_number !== undefined) updateData.contract_number = contract_number;
    if (task_order_number !== undefined) updateData.task_order_number = task_order_number;
    if (agency !== undefined) updateData.agency = agency;
    if (sub_agency !== undefined) updateData.sub_agency = sub_agency;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (naics_code !== undefined) updateData.naics_code = naics_code;
    if (contract_type !== undefined) updateData.contract_type = contract_type;
    if (total_value !== undefined) updateData.total_value = total_value;
    if (annual_value !== undefined) updateData.annual_value = annual_value;
    if (period_start !== undefined) updateData.period_start = period_start;
    if (period_end !== undefined) updateData.period_end = period_end;
    if (status !== undefined) updateData.status = status;
    if (place_of_performance !== undefined) updateData.place_of_performance = place_of_performance;
    if (technologies !== undefined) updateData.technologies = technologies;
    if (key_personnel !== undefined) updateData.key_personnel = key_personnel;
    if (company_id !== undefined) updateData.company_id = company_id;

    const { data, error } = await supabase
      .from("past_contracts")
      .update(updateData)
      .eq("id", id)
      .select("*, past_performance_ratings(*)")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Past contract not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Past contract update error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update past contract",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();

    const { error } = await supabase
      .from("past_contracts")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Past contract delete error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete past contract",
      },
      { status: 500 }
    );
  }
}
