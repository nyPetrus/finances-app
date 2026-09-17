import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildGoogleAuthorizeUrl } from "@/lib/google-drive/client";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.nextUrl.origin));

  const redirectUri = `${request.nextUrl.origin}/api/google-drive/callback`;
  return NextResponse.redirect(buildGoogleAuthorizeUrl(redirectUri));
}
