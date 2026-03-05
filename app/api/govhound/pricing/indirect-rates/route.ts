import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

export async function GET() {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("indirect_rates")
      .select("*")
      .order("rate_type")
      .order("rate_name");

    if (error) throw error;
    return NextResponse.json({ indirect_rates: data });
  } catch (error) {
    console.error("Fetch indirect rates error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch indirect rates" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("indirect_rates")
      .insert({
        company_id: body.company_id || null,
        rate_type: body.rate_type,
        rate_name: body.rate_name,
        percentage: body.percentage,
        effective_date: body.effective_date || null,
        notes: body.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ indirect_rate: data });
  } catch (error) {
    console.error("Create indirect rate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create indirect rate" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = getServiceClient();
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("indirect_rates")
      .update({
        rate_type: body.rate_type,
        rate_name: body.rate_name,
        percentage: body.percentage,
        effective_date: body.effective_date || null,
        notes: body.notes || null,
      })
      .eq("id", body.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ indirect_rate: data });
  } catch (error) {
    console.error("Update indirect rate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update indirect rate" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = getServiceClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("indirect_rates")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete indirect rate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete indirect rate" },
      { status: 500 }
    );
  }
}
