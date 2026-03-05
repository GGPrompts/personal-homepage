import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();

    const { data: items, error } = await supabase
      .from("compliance_checklists")
      .select("*")
      .eq("opportunity_id", id)
      .order("id");

    if (error) throw error;

    return NextResponse.json({ items: items || [] });
  } catch (error) {
    console.error("Compliance GET error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch checklist",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = getServiceClient();

    // Handle both single item update and batch updates
    if (body.items && Array.isArray(body.items)) {
      // Batch update
      for (const item of body.items) {
        if (item.id) {
          const { error } = await supabase
            .from("compliance_checklists")
            .update({
              is_met: item.is_met ?? null,
              gap_notes: item.gap_notes ?? null,
              mapped_response_section: item.mapped_response_section ?? null,
            })
            .eq("id", item.id);

          if (error) throw error;
        }
      }
    } else if (body.id) {
      // Single item update
      const { error } = await supabase
        .from("compliance_checklists")
        .update({
          is_met: body.is_met ?? null,
          gap_notes: body.gap_notes ?? null,
          mapped_response_section: body.mapped_response_section ?? null,
        })
        .eq("id", body.id);

      if (error) throw error;
    } else if (body.requirement_text) {
      // Add new checklist item
      const { error } = await supabase.from("compliance_checklists").insert({
        opportunity_id: id,
        requirement_text: body.requirement_text,
        source_section: body.source_section || null,
        is_met: body.is_met ?? null,
        gap_notes: body.gap_notes ?? null,
        mapped_response_section: body.mapped_response_section ?? null,
      });

      if (error) throw error;
    }

    // Return updated list
    const { data: items, error: fetchError } = await supabase
      .from("compliance_checklists")
      .select("*")
      .eq("opportunity_id", id)
      .order("id");

    if (fetchError) throw fetchError;

    return NextResponse.json({ items: items || [] });
  } catch (error) {
    console.error("Compliance POST error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update checklist",
      },
      { status: 500 }
    );
  }
}
