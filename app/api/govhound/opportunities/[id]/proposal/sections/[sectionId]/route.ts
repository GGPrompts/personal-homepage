import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";
import { regenerateSection } from "@/lib/govhound/proposal-generator";
import type { Opportunity } from "@/lib/govhound/types";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const { id, sectionId } = await params;
    const body = await request.json();
    const supabase = getServiceClient();

    // If regenerate flag is set, use AI to regenerate
    if (body.regenerate) {
      const { data: opportunity, error: oppError } = await supabase
        .from("opportunities")
        .select("*")
        .eq("id", id)
        .single();

      if (oppError || !opportunity) {
        return NextResponse.json(
          { error: "Opportunity not found" },
          { status: 404 }
        );
      }

      const updated = await regenerateSection(
        sectionId,
        opportunity as Opportunity
      );
      return NextResponse.json({ success: true, section: updated });
    }

    // Otherwise, manual edit
    const updateData: Record<string, unknown> = {
      last_edited_at: new Date().toISOString(),
    };

    if (body.content !== undefined) {
      updateData.content = body.content;
      updateData.ai_generated = false; // Mark as manually edited
    }

    if (body.section_title !== undefined) {
      updateData.section_title = body.section_title;
    }

    const { data: section, error } = await supabase
      .from("proposal_sections")
      .update(updateData)
      .eq("id", sectionId)
      .select()
      .single();

    if (error || !section) {
      return NextResponse.json(
        { error: error?.message || "Section not found" },
        { status: error ? 500 : 404 }
      );
    }

    return NextResponse.json({ success: true, section });
  } catch (error) {
    console.error("Section update error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update section",
      },
      { status: 500 }
    );
  }
}
