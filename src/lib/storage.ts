import { supabase } from './supabase';

// Storage bucket names
export const BUCKETS = {
  PODCASTS: 'podcasts',
  THUMBNAILS: 'thumbnails',
  MERCH: 'merch',
  AVATARS: 'avatars',
  BLOGS: 'blogs',
} as const;

type BucketName = typeof BUCKETS[keyof typeof BUCKETS];

// Get public URL for a file
export function getPublicUrl(bucket: BucketName, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Get signed URL for private files (podcasts)
export async function getSignedUrl(
  bucket: BucketName,
  path: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }

  return data.signedUrl;
}

// Upload file to storage
export async function uploadFile(
  bucket: BucketName,
  path: string,
  file: File,
  options?: {
    cacheControl?: string;
    upsert?: boolean;
  }
): Promise<{ url: string; path: string } | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: options?.cacheControl || '3600',
      upsert: options?.upsert || false,
    });

  if (error) {
    console.error('Error uploading file:', error);
    throw new Error(error.message);
  }

  // Return public URL for public buckets, path for private
  const isPublicBucket = bucket !== BUCKETS.PODCASTS;
  const url = isPublicBucket 
    ? getPublicUrl(bucket, data.path)
    : data.path;

  return { url, path: data.path };
}

// Delete file from storage
export async function deleteFile(bucket: BucketName, path: string): Promise<boolean> {
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    console.error('Error deleting file:', error);
    return false;
  }

  return true;
}

// Upload podcast media (audio/video)
export async function uploadPodcastMedia(
  file: File,
  podcastId: string,
  _onProgress?: (progress: number) => void // Reserved for future resumable upload support
): Promise<{ url: string; path: string } | null> {
  const ext = file.name.split('.').pop();
  const path = `${podcastId}/media.${ext}`;

  // For large files, we might want to use resumable uploads
  // For now, using standard upload
  return uploadFile(BUCKETS.PODCASTS, path, file, { upsert: true });
}

// Upload podcast thumbnail
export async function uploadThumbnail(
  file: File,
  podcastId: string
): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const path = `podcasts/${podcastId}/thumbnail.${ext}`;

  const result = await uploadFile(BUCKETS.THUMBNAILS, path, file, { upsert: true });
  return result?.url || null;
}

// Upload merch image
export async function uploadMerchImage(
  file: File,
  merchId: string
): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const path = `${merchId}/image.${ext}`;

  const result = await uploadFile(BUCKETS.MERCH, path, file, { upsert: true });
  return result?.url || null;
}

// Upload user avatar
export async function uploadAvatar(
  file: File,
  userId: string
): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const path = `${userId}/avatar.${ext}`;

  const result = await uploadFile(BUCKETS.AVATARS, path, file, { upsert: true });
  return result?.url || null;
}

// Get podcast media URL (signed for private access)
export async function getPodcastMediaUrl(
  podcastId: string,
  filename: string = 'media'
): Promise<string | null> {
  // Try common extensions
  const extensions = ['mp3', 'mp4', 'm4a', 'wav', 'webm'];
  
  for (const ext of extensions) {
    const path = `${podcastId}/${filename}.${ext}`;
    const url = await getSignedUrl(BUCKETS.PODCASTS, path, 7200); // 2 hours
    if (url) return url;
  }

  return null;
}

// List files in a bucket folder
export async function listFiles(
  bucket: BucketName,
  folder: string
): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder);

  if (error) {
    console.error('Error listing files:', error);
    return [];
  }

  return data.map(file => `${folder}/${file.name}`);
}
