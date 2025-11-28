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
  BLOGS: 'blogs',
} as const;

// Upload file to Supabase Storage
export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  options?: { upsert?: boolean }
): Promise<{ url: string; path: string; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: options?.upsert ?? false,
      });

    if (error) {
      return { url: '', path: '', error };
    }

    // For private buckets (podcasts), store the path instead of public URL
    // For public buckets (thumbnails, merch, avatars), return public URL
    const isPrivateBucket = bucket === STORAGE_BUCKETS.PODCASTS;
    
    if (isPrivateBucket) {
      // Store bucket:path format for later signed URL generation
      return { url: `supabase://${bucket}/${data.path}`, path: data.path, error: null };
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return { url: urlData.publicUrl, path: data.path, error: null };
  } catch (err) {
    return { url: '', path: '', error: err instanceof Error ? err : new Error('Upload failed') };
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
