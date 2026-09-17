import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeGoogleAuthCode, fetchGoogleEmail } from "@/lib/google-drive/client";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");
  const accountsUrl = new URL("/accounts", request.nextUrl.origin);

  if (oauthError || !code) {
    accountsUrl.searchParams.set("google_drive", "error");
    return NextResponse.redirect(accountsUrl);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.nextUrl.origin));

  const redirectUri = `${request.nextUrl.origin}/api/google-drive/callback`;

  try {
    const tokens = await exchangeGoogleAuthCode(code, redirectUri);

    // Google only omits this if the user already granted access before
    // without going through `prompt=consent` — shouldn't happen given how
    // buildGoogleAuthorizeUrl is built, but a stale refresh_token in the DB
    // is worse than surfacing an error and asking the user to retry.
    if (!tokens.refresh_token) {
      accountsUrl.searchParams.set("google_drive", "error");
      return NextResponse.redirect(accountsUrl);
    }

    const email = await fetchGoogleEmail(tokens.access_token);

    const { error: upsertError } = await supabase.from("google_drive_tokens").upsert({
      user_id: user.id,
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      access_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      google_email: email,
      updated_at: new Date().toISOString(),
    });

    if (upsertError) throw new Error(upsertError.message);
  } catch (err) {
    console.error("Google Drive OAuth callback failed:", err);
    accountsUrl.searchParams.set("google_drive", "error");
    return NextResponse.redirect(accountsUrl);
  }

  accountsUrl.searchParams.set("google_drive", "connected");
  return NextResponse.redirect(accountsUrl);
}
