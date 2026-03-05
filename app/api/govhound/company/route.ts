import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

export async function GET() {
  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("company_profile")
      .select(
        "*, company_certifications(*), company_naics_codes(*), company_contract_vehicles(*), team_members(*)"
      )
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ company: data });
  } catch (error) {
    console.error("Company profile fetch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch company profile",
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
      name,
      uei,
      cage_code,
      sam_status,
      sam_expiration,
      duns,
      website,
      size_standard,
      primary_naics,
      founded_date,
    } = body;

    const record = {
      name,
      uei: uei || null,
      cage_code: cage_code || null,
      sam_status: sam_status || null,
      sam_expiration: sam_expiration || null,
      duns: duns || null,
      website: website || null,
      size_standard: size_standard || null,
      primary_naics: primary_naics || null,
      founded_date: founded_date || null,
      updated_at: new Date().toISOString(),
    };

    let data;
    let error;

    if (id) {
      // Update existing
      const result = await supabase
        .from("company_profile")
        .update(record)
        .eq("id", id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // Create new
      const result = await supabase
        .from("company_profile")
        .insert(record)
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) throw error;

    return NextResponse.json({ company: data });
  } catch (error) {
    console.error("Company profile save error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save company profile",
      },
      { status: 500 }
    );
  }
}
