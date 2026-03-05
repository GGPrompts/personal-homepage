import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";
import { analyzeOpportunity } from "@/lib/govhound/analyze";
import type { Opportunity } from "@/lib/govhound/types";

type BulkAction = "analyze" | "save" | "change_status" | "unsave";

interface BulkRequest {
  ids: string[];
  action: BulkAction;
  status?: string; // For save/change_status
}

export async function POST(request: NextRequest) {
  try {
    const body: BulkRequest = await request.json();
    const { ids, action, status } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids must be a non-empty array" },
        { status: 400 }
      );
    }

    if (ids.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 items per bulk operation" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();
    const results: { id: string; success: boolean; error?: string }[] = [];

    switch (action) {
      case "analyze": {
        // Fetch all opportunities that need analysis
        const { data: opps, error: fetchErr } = await supabase
          .from("opportunities")
          .select("*")
          .in("id", ids);

        if (fetchErr) throw fetchErr;

        // Analyze each one (sequentially to avoid rate limits)
        for (const opp of opps || []) {
          try {
            await analyzeOpportunity(opp as Opportunity);
            results.push({ id: opp.id, success: true });
          } catch (err) {
            results.push({
              id: opp.id,
              success: false,
              error: err instanceof Error ? err.message : "Analysis failed",
            });
          }
        }
        break;
      }

      case "save": {
        const saveStatus = status || "watching";
        const rows = ids.map((id) => ({
          opportunity_id: id,
          status: saveStatus,
        }));

        const { error: saveErr } = await supabase
          .from("saved_opportunities")
          .upsert(rows, { onConflict: "opportunity_id" });

        if (saveErr) throw saveErr;

        for (const id of ids) {
          results.push({ id, success: true });
        }
        break;
      }

      case "change_status": {
        if (!status) {
          return NextResponse.json(
            { error: "status is required for change_status action" },
            { status: 400 }
          );
        }

        for (const id of ids) {
          const { error: updateErr } = await supabase
            .from("saved_opportunities")
            .update({ status })
            .eq("opportunity_id", id);

          if (updateErr) {
            results.push({
              id,
              success: false,
              error: updateErr.message,
            });
          } else {
            results.push({ id, success: true });
          }
        }
        break;
      }

      case "unsave": {
        const { error: delErr } = await supabase
          .from("saved_opportunities")
          .delete()
          .in("opportunity_id", ids);

        if (delErr) throw delErr;

        for (const id of ids) {
          results.push({ id, success: true });
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      results,
      summary: { total: ids.length, succeeded, failed },
    });
  } catch (error) {
    console.error("Bulk operation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Bulk operation failed",
      },
      { status: 500 }
    );
  }
}
