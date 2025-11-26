import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Auth features will not work.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  }
);

// Storage bucket names
export const STORAGE_BUCKETS = {
  PODCASTS: 'podcasts',
  THUMBNAILS: 'thumbnails',
  AVATARS: 'avatars',
  MERCH: 'merch',
} as const;

// Upload file to Supabase Storage
export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  options?: { upsert?: boolean }
): Promise<{ url: string; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: options?.upsert ?? false,
      });

    if (error) {
      return { url: '', error };
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return { url: urlData.publicUrl, error: null };
  } catch (err) {
    return { url: '', error: err instanceof Error ? err : new Error('Upload failed') };
  }
}

// Delete file from Supabase Storage
export async function deleteFile(bucket: string, path: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    return { error };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Delete failed') };
  }
}

// Get signed URL for private files
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<{ url: string; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      return { url: '', error };
    }

    return { url: data.signedUrl, error: null };
  } catch (err) {
    return { url: '', error: err instanceof Error ? err : new Error('Failed to get signed URL') };
  }
}
