"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  extractDriveFolderId,
  listDriveFilesInFolder,
  refreshGoogleAccessToken,
  revokeGoogleToken,
  type DriveFile,
} from "@/lib/google-drive/client";

// 60s safety margin so a token that's about to expire mid-request still
// gets refreshed rather than failing the Drive call that follows.
const EXPIRY_SAFETY_MARGIN_MS = 60_000;

async function getValidAccessToken(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("google_drive_tokens")
    .select("refresh_token, access_token, access_token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Google Drive isn't connected.");

  const expiresAt = data.access_token_expires_at ? new Date(data.access_token_expires_at).getTime() : 0;
  if (data.access_token && expiresAt - Date.now() > EXPIRY_SAFETY_MARGIN_MS) {
    return data.access_token as string;
  }

  const refreshed = await refreshGoogleAccessToken(data.refresh_token as string);

  const { error: updateError } = await supabase
    .from("google_drive_tokens")
    .update({
      access_token: refreshed.access_token,
      access_token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) throw new Error(updateError.message);

  return refreshed.access_token;
}

export async function listGoogleDriveFolderFiles(folderInput: string): Promise<DriveFile[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const folderId = extractDriveFolderId(folderInput);
  if (!folderId) throw new Error("Enter a Drive folder link or ID.");

  const accessToken = await getValidAccessToken(supabase, user.id);

  try {
    return await listDriveFilesInFolder(accessToken, folderId);
  } catch (err) {
    throw new Error(
      err instanceof Error
        ? `Failed to list that folder — check the link/ID and that this Google account can access it.`
        : "Failed to list that folder.",
    );
  }
}

export async function disconnectGoogleDrive() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data } = await supabase
    .from("google_drive_tokens")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (data) {
    // Best-effort — a hiccup on Google's end shouldn't block disconnecting.
    await revokeGoogleToken(data.refresh_token as string).catch(() => {});
  }

  const { error } = await supabase.from("google_drive_tokens").delete().eq("user_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/accounts");
}
