import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

export async function GET() {
  try {
    const supabase = getServiceClient();

    // Fetch all profiles with unseen flag counts
    const { data: profiles, error } = await supabase
      .from("search_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    // Get unseen counts per profile
    const profileIds = (profiles || []).map((p) => p.id);
    let flagCounts: Record<string, number> = {};

    if (profileIds.length > 0) {
      const { data: flags, error: flagError } = await supabase
        .from("new_opportunity_flags")
        .select("profile_id")
        .in("profile_id", profileIds)
        .eq("seen", false);

      if (!flagError && flags) {
        flagCounts = flags.reduce(
          (acc: Record<string, number>, f) => {
            acc[f.profile_id] = (acc[f.profile_id] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );
      }
    }

    const profilesWithStats = (profiles || []).map((p) => ({
      ...p,
      new_count: flagCounts[p.id] || 0,
    }));

    return NextResponse.json({ profiles: profilesWithStats });
  } catch (error) {
    console.error("Profiles fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch profiles" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = getServiceClient();

    const profile = {
      name: body.name,
      keywords: body.keywords || null,
      naics_codes: body.naics_codes || [],
      set_aside_types: body.set_aside_types || [],
      agencies: body.agencies || [],
      classification_codes: body.classification_codes || [],
      date_range_days: body.date_range_days || 30,
      is_active: body.is_active !== undefined ? body.is_active : true,
    };

    if (!profile.name) {
      return NextResponse.json(
        { error: "Profile name is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("search_profiles")
      .insert(profile)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    console.error("Profile create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const supabase = getServiceClient();

    if (!body.id) {
      return NextResponse.json(
        { error: "Profile ID is required" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.keywords !== undefined) updates.keywords = body.keywords || null;
    if (body.naics_codes !== undefined) updates.naics_codes = body.naics_codes;
    if (body.set_aside_types !== undefined) updates.set_aside_types = body.set_aside_types;
    if (body.agencies !== undefined) updates.agencies = body.agencies;
    if (body.classification_codes !== undefined) updates.classification_codes = body.classification_codes;
    if (body.date_range_days !== undefined) updates.date_range_days = body.date_range_days;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    const { data, error } = await supabase
      .from("search_profiles")
      .update(updates)
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update profile" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Profile ID is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    const { error } = await supabase
      .from("search_profiles")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete profile" },
      { status: 500 }
    );
  }
}
