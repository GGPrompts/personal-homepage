import { NextResponse } from "next/server";
import { checkForAmendments } from "@/lib/govhound/sam-gov";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await checkForAmendments(id);

    return NextResponse.json({
      success: true,
      updated: result.updated,
      changes: result.changes,
    });
  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to refresh opportunity",
      },
      { status: 500 }
    );
  }
}
