import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("saved_opportunities")
      .upsert(
        {
          opportunity_id: id,
          notes: body.notes || null,
          status: body.status || "watching",
        },
        { onConflict: "opportunity_id" }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, saved: data });
  } catch (error) {
    console.error("Save error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save opportunity",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();

    const { error } = await supabase
      .from("saved_opportunities")
      .delete()
      .eq("opportunity_id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete saved error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove saved opportunity",
      },
      { status: 500 }
    );
  }
}
