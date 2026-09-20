import "server-only";

// Kept to just the Google API calls, no Supabase access — the DB
// read/write/refresh orchestration lives in the server actions that call
// these, mirroring how pluggyClient (src/lib/pluggy/client.ts) stays a pure
// API client too.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

// drive.readonly (not drive.file) so a folder can be read by ID without
// routing the user through Google's file/folder Picker first — see the
// spike discussion: since every Drive read is a user-initiated button
// click rather than an unattended background job, an expired/stale grant
// just means "click Connect again," so the narrower drive.file scope's
// verification-avoidance benefit isn't worth its extra Picker-UI cost here.
const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

function clientId() {
  return process.env.GOOGLE_CLIENT_ID!;
}

function clientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET!;
}

export function buildGoogleAuthorizeUrl(redirectUri: string) {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    // Forces Google to re-issue a refresh_token even if this user already
    // granted access before — without it, a second connect attempt (e.g.
    // after a revoked/expired grant) silently returns no refresh_token.
    prompt: "consent",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
};

export async function exchangeGoogleAuthCode(code: string, redirectUri: string): Promise<TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${await response.text()}`);
  }

  return response.json();
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token refresh failed: ${await response.text()}`);
  }

  return response.json();
}

export async function revokeGoogleToken(token: string) {
  await fetch(`${REVOKE_URL}?token=${encodeURIComponent(token)}`, { method: "POST" });
}

export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { email?: string };
  return data.email ?? null;
}

export type DriveFile = {
  id: string;
  name: string;
  modifiedTime: string;
  mimeType: string;
};

// Accepts either a bare folder id or a full
// https://drive.google.com/drive/folders/<id> link, since that's what a
// user will actually paste in from their browser's address bar.
export function extractDriveFolderId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : trimmed;
}

// Follows nextPageToken so a folder with more files than one page holds
// isn't silently truncated (same failure mode as PostgREST's 1000-row cap,
// see PITFALLS.md).
export async function listDriveFilesInFolder(accessToken: string, folderId: string): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken,files(id,name,modifiedTime,mimeType)",
      orderBy: "modifiedTime desc",
      pageSize: "1000",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to list Drive folder: ${await response.text()}`);
    }

    const data = (await response.json()) as { files?: DriveFile[]; nextPageToken?: string };
    files.push(...(data.files ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return files;
}

// Downloads a plain (non-Google-native) file such as a .csv as UTF-8 text.
export async function downloadDriveFileText(accessToken: string, fileId: string): Promise<string> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to download Drive file: ${await response.text()}`);
  }

  return response.text();
}
