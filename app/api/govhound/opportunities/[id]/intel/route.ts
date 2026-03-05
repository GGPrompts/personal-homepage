import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";
import { getCompetitorIntel } from "@/lib/govhound/competitor-intel";
import type { Opportunity } from "@/lib/govhound/types";

/**
 * GET /api/opportunities/[id]/intel
 * Returns cached competitor intelligence for an opportunity.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();

    const { data: opportunity, error } = await supabase
      .from("opportunities")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !opportunity) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 }
      );
    }

    const report = await getCompetitorIntel(
      opportunity as Opportunity,
      false
    );

    return NextResponse.json(report);
  } catch (error) {
    console.error("Competitor intel GET error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch competitor intelligence",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/opportunities/[id]/intel
 * Triggers a fresh fetch of competitor intelligence (ignores cache).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();

    const { data: opportunity, error } = await supabase
      .from("opportunities")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !opportunity) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 }
      );
    }

    const report = await getCompetitorIntel(
      opportunity as Opportunity,
      true // force refresh
    );

    return NextResponse.json(report);
  } catch (error) {
    console.error("Competitor intel POST error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch competitor intelligence",
      },
      { status: 500 }
    );
  }
}
