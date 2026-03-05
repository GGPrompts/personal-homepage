import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";
import { DEFAULT_MILESTONE_TEMPLATE } from "@/lib/govhound/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("opportunity_milestones")
      .select("*")
      .eq("opportunity_id", id)
      .order("sort_order", { ascending: true })
      .order("due_date", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ milestones: data || [] });
  } catch (error) {
    console.error("Milestones fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch milestones" },
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

    // If applying a template, generate milestones from the deadline
    if (body.apply_template) {
      // Get opportunity deadline
      const { data: opp, error: oppError } = await supabase
        .from("opportunities")
        .select("response_deadline")
        .eq("id", id)
        .single();

      if (oppError || !opp?.response_deadline) {
        return NextResponse.json(
          { error: "Opportunity not found or has no response deadline" },
          { status: 400 }
        );
      }

      const deadline = new Date(opp.response_deadline);
      const milestones = DEFAULT_MILESTONE_TEMPLATE.map((tmpl) => {
        const dueDate = new Date(deadline);
        dueDate.setDate(dueDate.getDate() - tmpl.days_before);
        return {
          opportunity_id: id,
          title: tmpl.title,
          milestone_type: tmpl.milestone_type,
          due_date: dueDate.toISOString(),
          status: "pending" as const,
          sort_order: tmpl.sort_order,
        };
      });

      const { data, error } = await supabase
        .from("opportunity_milestones")
        .insert(milestones)
        .select();

      if (error) throw error;

      // Log the template application
      await supabase.from("opportunity_activity_log").insert({
        opportunity_id: id,
        entry_type: "system",
        content: "Milestone template applied with default proposal timeline",
      });

      return NextResponse.json({ success: true, milestones: data });
    }

    // Single milestone creation
    const { data, error } = await supabase
      .from("opportunity_milestones")
      .insert({
        opportunity_id: id,
        title: body.title,
        description: body.description || null,
        due_date: body.due_date,
        status: body.status || "pending",
        milestone_type: body.milestone_type || "custom",
        sort_order: body.sort_order || 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, milestone: data });
  } catch (error) {
    console.error("Milestone create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create milestone" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params;
    const body = await request.json();
    const supabase = getServiceClient();

    if (!body.milestone_id) {
      return NextResponse.json({ error: "milestone_id required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.due_date !== undefined) updates.due_date = body.due_date;
    if (body.status !== undefined) updates.status = body.status;
    if (body.milestone_type !== undefined) updates.milestone_type = body.milestone_type;
    if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("opportunity_milestones")
      .update(updates)
      .eq("id", body.milestone_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, milestone: data });
  } catch (error) {
    console.error("Milestone update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update milestone" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params;
    const { searchParams } = new URL(request.url);
    const milestoneId = searchParams.get("milestone_id");
    const supabase = getServiceClient();

    if (!milestoneId) {
      return NextResponse.json({ error: "milestone_id required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("opportunity_milestones")
      .delete()
      .eq("id", milestoneId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Milestone delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete milestone" },
      { status: 500 }
    );
  }
}
