import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json(
      {
        error: "Supabase is not configured.",
        error_code: "MISSING_SUPABASE_KEY",
      },
      { status: 503 }
    );
  }

  try {
    const supabase = getServiceClient();

    // Fetch distinct agencies, naics_codes, and set_aside_types in parallel
    const [agenciesRes, naicsRes, setAsideRes] = await Promise.all([
      supabase
        .from("opportunities")
        .select("agency")
        .not("agency", "is", null)
        .neq("agency", "")
        .order("agency", { ascending: true })
        .limit(500),
      supabase
        .from("opportunities")
        .select("naics_code")
        .not("naics_code", "is", null)
        .neq("naics_code", "")
        .order("naics_code", { ascending: true })
        .limit(500),
      supabase
        .from("opportunities")
        .select("set_aside_type")
        .not("set_aside_type", "is", null)
        .neq("set_aside_type", "")
        .order("set_aside_type", { ascending: true })
        .limit(500),
    ]);

    if (agenciesRes.error) throw agenciesRes.error;
    if (naicsRes.error) throw naicsRes.error;
    if (setAsideRes.error) throw setAsideRes.error;

    // Deduplicate
    const agencies = [...new Set((agenciesRes.data || []).map((r) => r.agency as string))];
    const naicsCodes = [...new Set((naicsRes.data || []).map((r) => r.naics_code as string))];
    const setAsideTypes = [...new Set((setAsideRes.data || []).map((r) => r.set_aside_type as string))];

    return NextResponse.json({
      agencies,
      naics_codes: naicsCodes,
      set_aside_types: setAsideTypes,
    });
  } catch (error) {
    console.error("Facets fetch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch facets",
      },
      { status: 500 }
    );
  }
}
