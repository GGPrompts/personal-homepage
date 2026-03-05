import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("opportunity_pricing")
      .select("*")
      .eq("opportunity_id", id)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ pricing: data });
  } catch (error) {
    console.error("Fetch opportunity pricing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch pricing" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("opportunity_pricing")
      .upsert(
        {
          opportunity_id: id,
          boe_data: body.boe_data || [],
          total_direct_labor: body.total_direct_labor || 0,
          total_odcs: body.total_odcs || 0,
          total_subcontractor: body.total_subcontractor || 0,
          total_indirect: body.total_indirect || 0,
          total_price: body.total_price || 0,
          notes: body.notes || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "opportunity_id" }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ pricing: data });
  } catch (error) {
    console.error("Save opportunity pricing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save pricing" },
      { status: 500 }
    );
  }
}
