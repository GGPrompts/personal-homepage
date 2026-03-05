import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("opportunity_activity_log")
      .select("*")
      .eq("opportunity_id", id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ entries: data || [] });
  } catch (error) {
    console.error("Activity log fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch activity log" },
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

    if (!body.content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("opportunity_activity_log")
      .insert({
        opportunity_id: id,
        entry_type: body.entry_type || "note",
        content: body.content.trim(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, entry: data });
  } catch (error) {
    console.error("Activity log create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create activity entry" },
      { status: 500 }
    );
  }
}
