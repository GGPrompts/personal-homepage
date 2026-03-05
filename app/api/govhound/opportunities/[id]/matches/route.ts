import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";
import { findMatches } from "@/lib/govhound/match-engine";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();

    // Fetch the opportunity
    const { data: opportunity, error: oppError } = await supabase
      .from("opportunities")
      .select("*")
      .eq("id", id)
      .single();

    if (oppError) {
      if (oppError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Opportunity not found" },
          { status: 404 }
        );
      }
      throw oppError;
    }

    // Fetch all past contracts
    const { data: contracts, error: contractsError } = await supabase
      .from("past_contracts")
      .select("*");

    if (contractsError) throw contractsError;

    // Run match engine
    const matches = findMatches(contracts || [], opportunity, {
      limit: 5,
      minScore: 10,
    });

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("Match engine error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to find matches",
      },
      { status: 500 }
    );
  }
}
