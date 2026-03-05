import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";
import { generateProposal } from "@/lib/govhound/proposal-generator";
import type { Opportunity } from "@/lib/govhound/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();

    const { data: proposal, error } = await supabase
      .from("proposals")
      .select("*, proposal_sections(*)")
      .eq("opportunity_id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!proposal) {
      return NextResponse.json({ proposal: null });
    }

    // Sort sections by volume then order
    const volumeOrder = {
      admin: 0,
      technical: 1,
      past_performance: 2,
      cost: 3,
    };
    if (proposal.proposal_sections) {
      proposal.proposal_sections.sort(
        (
          a: { volume: string; section_order: number },
          b: { volume: string; section_order: number }
        ) => {
          const vDiff =
            (volumeOrder[a.volume as keyof typeof volumeOrder] || 0) -
            (volumeOrder[b.volume as keyof typeof volumeOrder] || 0);
          if (vDiff !== 0) return vDiff;
          return a.section_order - b.section_order;
        }
      );
    }

    return NextResponse.json({ proposal });
  } catch (error) {
    console.error("Fetch proposal error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch proposal" },
      { status: 500 }
    );
  }
}

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

    const result = await generateProposal(opportunity as Opportunity);

    return NextResponse.json({
      success: true,
      proposalId: result.proposalId,
      sectionCount: result.sections.length,
    });
  } catch (error) {
    console.error("Proposal generation error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Proposal generation failed",
      },
      { status: 500 }
    );
  }
}
