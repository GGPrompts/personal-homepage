import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const body = await request.json();

    const { id, company_id, naics_code, is_primary, size_standard_value } =
      body;

    if (!company_id || !naics_code) {
      return NextResponse.json(
        { error: "company_id and naics_code are required" },
        { status: 400 }
      );
    }

    const record = {
      company_id,
      naics_code,
      is_primary: is_primary || false,
      size_standard_value: size_standard_value || null,
    };

    let data;
    let error;

    if (id) {
      const result = await supabase
        .from("company_naics_codes")
        .update(record)
        .eq("id", id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from("company_naics_codes")
        .insert(record)
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) throw error;

    return NextResponse.json({ naics: data });
  } catch (error) {
    console.error("NAICS save error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save NAICS code",
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
      .from("company_naics_codes")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("NAICS delete error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete NAICS code",
      },
      { status: 500 }
    );
  }
}
