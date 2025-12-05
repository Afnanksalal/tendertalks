// Client-side API functions for podcasts
import type { Podcast, Category } from '../db/schema';
import { useAuthStore } from '../stores/authStore';

// Get all published podcasts with filters
export async function getPodcasts(
  filters: {
    categoryId?: string;
    tagId?: string;
    isFree?: boolean;
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<Podcast[]> {
  const params = new URLSearchParams();

  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.tagId) params.set('tagId', filters.tagId);
  if (filters.isFree !== undefined) params.set('isFree', String(filters.isFree));
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));

  const response = await fetch(`/api/podcasts?${params}`);
  if (!response.ok) throw new Error('Failed to fetch podcasts');
  return response.json();
}

// Get single podcast by slug
export async function getPodcastBySlug(slug: string): Promise<Podcast | null> {
  const response = await fetch(`/api/podcasts/${slug}`);
  if (!response.ok) return null;
  return response.json();
}

// Get all categories
export async function getCategories(): Promise<Category[]> {
  const response = await fetch('/api/categories');
  if (!response.ok) throw new Error('Failed to fetch categories');
  return response.json();
}

// Track play progress
export async function updatePlayProgress(
  podcastId: string,
  progress: number,
  userId: string,
  completed: boolean = false
): Promise<void> {
  await fetch('/api/podcasts/progress', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...useAuthStore.getState().getAuthHeaders(),
    },
    body: JSON.stringify({ podcastId, progress, completed }),
  });
}

// Get play history
export async function getPlayHistory(): Promise<any[]> {
  const response = await fetch('/api/users/history', {
    headers: { ...useAuthStore.getState().getAuthHeaders() },
  });
  if (!response.ok) return [];
  return response.json();
}
