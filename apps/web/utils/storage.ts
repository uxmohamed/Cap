import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@cap/env";

// Minimal Supabase client for server-side storage operations
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = serverEnv().SUPABASE_SERVICE_ROLE;
  if (!url || !serviceKey) throw new Error("Supabase URL or service role key missing");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export function getSupabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Supabase URL or anon key missing");
  return createClient(url, anon, { auth: { persistSession: false } });
}

export const SUPABASE_BUCKET = process.env.CAP_AWS_BUCKET || "capso-videos";

// Create a signed upload URL (Supabase Storage signed upload)
export async function createSignedUpload(path: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    // 30 minutes
    .createSignedUploadUrl(path, 60 * 30);
  if (error) throw error;
  return data; // { signedUrl, path, token }
}

export async function uploadToSignedUrl(signedUrl: string, token: string, file: Blob | ArrayBuffer | Uint8Array, contentType: string) {
  const res = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      "x-upsert": "true",
      "Content-Type": contentType,
      "Authorization": `Bearer ${token}`,
    },
    body: file as any,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Upload failed: ${res.status} ${body}`);
  }
}

export async function createSignedDownload(path: string, expiresIn = 60 * 60) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}


