import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";
import { analyzeOpportunity } from "@/lib/govhound/analyze";
import type { Opportunity } from "@/lib/govhound/types";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();

    // Fetch the opportunity
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

    const analysis = await analyzeOpportunity(opportunity as Opportunity);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Analysis failed",
      },
      { status: 500 }
    );
  }
}
