import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const body = await request.json();

    const { id, company_id, vehicle_name, contract_number, ordering_period_end } =
      body;

    if (!company_id || !vehicle_name) {
      return NextResponse.json(
        { error: "company_id and vehicle_name are required" },
        { status: 400 }
      );
    }

    const record = {
      company_id,
      vehicle_name,
      contract_number: contract_number || null,
      ordering_period_end: ordering_period_end || null,
    };

    let data;
    let error;

    if (id) {
      const result = await supabase
        .from("company_contract_vehicles")
        .update(record)
        .eq("id", id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from("company_contract_vehicles")
        .insert(record)
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) throw error;

    return NextResponse.json({ vehicle: data });
  } catch (error) {
    console.error("Vehicle save error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save contract vehicle",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("company_contract_vehicles")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Vehicle delete error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete contract vehicle",
      },
      { status: 500 }
    );
  }
}
