import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

/**
 * GET /api/competitors
 * List all tracked competitors.
 */
export async function GET() {
  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("competitors")
      .select("*")
      .order("tracked_since", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ competitors: data || [] });
  } catch (error) {
    console.error("Competitors GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch competitors" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/competitors
 * Add a new tracked competitor.
 * Body: { name: string, uei?: string, notes?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, uei, notes } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Competitor name is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("competitors")
      .insert({
        name: name.trim(),
        uei: uei?.trim() || null,
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Competitors POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create competitor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/competitors
 * Delete a tracked competitor by ID.
 * Query param: ?id=<uuid>
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Competitor ID is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    const { error } = await supabase
      .from("competitors")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Competitors DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete competitor" },
      { status: 500 }
    );
  }
}
