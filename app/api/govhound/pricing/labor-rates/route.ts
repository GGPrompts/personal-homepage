import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

export async function GET() {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("labor_categories")
      .select("*")
      .order("category_name");

    if (error) throw error;
    return NextResponse.json({ labor_categories: data });
  } catch (error) {
    console.error("Fetch labor categories error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch labor categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("labor_categories")
      .insert({
        company_id: body.company_id || null,
        category_name: body.category_name,
        abbreviation: body.abbreviation,
        gsa_rate: body.gsa_rate || null,
        site_rate: body.site_rate || null,
        remote_rate: body.remote_rate || null,
        min_education: body.min_education || null,
        min_years_experience: body.min_years_experience || null,
        description: body.description || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ labor_category: data });
  } catch (error) {
    console.error("Create labor category error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create labor category" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = getServiceClient();
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("labor_categories")
      .update({
        category_name: body.category_name,
        abbreviation: body.abbreviation,
        gsa_rate: body.gsa_rate ?? null,
        site_rate: body.site_rate ?? null,
        remote_rate: body.remote_rate ?? null,
        min_education: body.min_education || null,
        min_years_experience: body.min_years_experience ?? null,
        description: body.description || null,
      })
      .eq("id", body.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ labor_category: data });
  } catch (error) {
    console.error("Update labor category error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update labor category" },
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
      .from("labor_categories")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete labor category error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete labor category" },
      { status: 500 }
    );
  }
}
