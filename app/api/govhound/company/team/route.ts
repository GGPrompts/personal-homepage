import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const companyId = request.nextUrl.searchParams.get("company_id");

    if (!companyId) {
      return NextResponse.json(
        { error: "company_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("company_id", companyId)
      .order("name");

    if (error) throw error;

    return NextResponse.json({ members: data });
  } catch (error) {
    console.error("Team members fetch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch team members",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const body = await request.json();

    const {
      id,
      company_id,
      name,
      title,
      role,
      clearance_level,
      years_experience,
      certifications,
      skills,
      bio,
    } = body;

    if (!company_id || !name) {
      return NextResponse.json(
        { error: "company_id and name are required" },
        { status: 400 }
      );
    }

    const record = {
      company_id,
      name,
      title: title || null,
      role: role || null,
      clearance_level: clearance_level || "none",
      years_experience: years_experience || null,
      certifications: certifications || [],
      skills: skills || [],
      bio: bio || null,
      updated_at: new Date().toISOString(),
    };

    let data;
    let error;

    if (id) {
      const result = await supabase
        .from("team_members")
        .update(record)
        .eq("id", id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from("team_members")
        .insert(record)
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) throw error;

    return NextResponse.json({ member: data });
  } catch (error) {
    console.error("Team member save error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save team member",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Team member delete error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete team member",
      },
      { status: 500 }
    );
  }
}
