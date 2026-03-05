import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

export async function GET() {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("boe_templates")
      .select("*")
      .order("name");

    if (error) throw error;
    return NextResponse.json({ templates: data });
  } catch (error) {
    console.error("Fetch BOE templates error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch BOE templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("boe_templates")
      .insert({
        name: body.name,
        description: body.description || null,
        structure: body.structure || [],
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ template: data });
  } catch (error) {
    console.error("Create BOE template error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create BOE template" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = getServiceClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("boe_templates")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete BOE template error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete BOE template" },
      { status: 500 }
    );
  }
}
