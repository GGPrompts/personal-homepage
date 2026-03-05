import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/govhound/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();

    const { data: documents, error } = await supabase
      .from("proposal_documents")
      .select("*")
      .eq("opportunity_id", id)
      .order("uploaded_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents: documents || [] });
  } catch (error) {
    console.error("Fetch documents error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch documents" },
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
    const supabase = getServiceClient();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const docType = (formData.get("doc_type") as string) || "other";
    const proposalId = formData.get("proposal_id") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Upload to Supabase Storage
    const fileName = `${id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("proposal-documents")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      // If bucket doesn't exist, provide a helpful error
      if (uploadError.message.includes("not found")) {
        return NextResponse.json(
          {
            error:
              'Storage bucket "proposal-documents" not found. Create it in Supabase Storage settings.',
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage
      .from("proposal-documents")
      .getPublicUrl(fileName);

    // Save document record
    const { data: document, error: dbError } = await supabase
      .from("proposal_documents")
      .insert({
        opportunity_id: id,
        proposal_id: proposalId || null,
        doc_type: docType,
        file_name: file.name,
        file_url: publicUrl,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json(
        { error: `Failed to save document record: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to upload document",
      },
      { status: 500 }
    );
  }
}
