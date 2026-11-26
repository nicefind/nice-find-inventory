import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

export const PHOTOS_BUCKET = "item-photos";

/** Upload a photo file to Supabase Storage and return its public URL, or null on failure. */
export async function uploadPhotoToSupabase(
  itemId: string,
  file: File,
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${itemId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, file, { upsert: false });
  if (error) {
    console.error("Photo upload failed:", error.message);
    return null;
  }
  const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
