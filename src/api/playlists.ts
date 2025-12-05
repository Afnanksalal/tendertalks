import type { Playlist, PlaylistPodcast } from '../db/schema';

export interface PlaylistWithDetails extends Playlist {
  creator: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  podcasts?: (PlaylistPodcast & {
    title: string;
    description: string;
    thumbnailUrl: string | null;
    mediaType: 'audio' | 'video';
    duration: number | null;
  })[];
  podcastCount?: number;
}

// Get all playlists
export async function getPlaylists(params?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<PlaylistWithDetails[]> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.offset) query.append('offset', params.offset.toString());

  const response = await fetch(`/api/playlists?${query.toString()}`);
  if (!response.ok) return [];
  return response.json();
}

// Get playlist by ID
export async function getPlaylist(id: string): Promise<PlaylistWithDetails | null> {
  const response = await fetch(`/api/playlists/${id}`);
  if (!response.ok) return null;
  return response.json();
}

// Create playlist
export async function createPlaylist(
  data: {
    title: string;
    description?: string;
    price: number;
    coverUrl?: string;
    podcastIds?: string[];
  },
  _userId?: string // Deprecated, kept for signature compatibility but ignored
): Promise<Playlist | null> {
  // Dynamic import to avoid circular dependencies if any, or just use the store directly if possible.
  // Since this is a regular TS file, we can import the store.
  const { useAuthStore } = await import('../stores/authStore');

  const response = await fetch('/api/playlists/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...useAuthStore.getState().getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create playlist' }));
    throw new Error(error.error || 'Failed to create playlist');
  }

  return response.json();
}
