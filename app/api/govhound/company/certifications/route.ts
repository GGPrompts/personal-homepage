import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const companyId = request.nextUrl.searchParams.get("company_id");

    if (!companyId) {
      return NextResponse.json(
        { error: "company_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("company_certifications")
      .select("*")
      .eq("company_id", companyId)
      .order("cert_type");

    if (error) throw error;

    return NextResponse.json({ certifications: data });
  } catch (error) {
    console.error("Certifications fetch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch certifications",
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
      id,
      company_id,
      cert_type,
      cert_number,
      issued_date,
      expiration_date,
      status,
    } = body;

    if (!company_id || !cert_type) {
      return NextResponse.json(
        { error: "company_id and cert_type are required" },
        { status: 400 }
      );
    }

    const record = {
      company_id,
      cert_type,
      cert_number: cert_number || null,
      issued_date: issued_date || null,
      expiration_date: expiration_date || null,
      status: status || "active",
    };

    let data;
    let error;

    if (id) {
      const result = await supabase
        .from("company_certifications")
        .update(record)
        .eq("id", id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from("company_certifications")
        .insert(record)
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) throw error;

    return NextResponse.json({ certification: data });
  } catch (error) {
    console.error("Certification save error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save certification",
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
      .from("company_certifications")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Certification delete error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete certification",
      },
      { status: 500 }
    );
  }
}
