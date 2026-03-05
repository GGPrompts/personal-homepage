import { NextResponse } from "next/server";

export async function GET() {
  const hasSamKey = !!process.env.SAM_GOV_API_KEY;
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasSupabaseKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  return NextResponse.json({
    sam_gov_api_key: hasSamKey,
    supabase_url: hasSupabaseUrl,
    supabase_service_role_key: hasSupabaseKey,
    all_configured: hasSamKey && hasSupabaseUrl && hasSupabaseKey,
  });
}
