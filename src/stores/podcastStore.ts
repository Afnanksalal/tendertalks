import { create } from 'zustand';
import type { Podcast, Category, Tag } from '../db/schema';
import { useAuthStore } from './authStore';

interface PodcastFilters {
  categoryId?: string;
  tagId?: string;
  isFree?: boolean;
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

interface PodcastFormData {
  title: string;
  description: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  mediaType?: 'audio' | 'video';
  duration?: number;
  isFree?: boolean;
  price?: string;
  isDownloadable?: boolean;
  categoryId?: string;
  status?: string;
}

interface PodcastState {
  podcasts: Podcast[];
  categories: Category[];
  tags: Tag[];
  currentPodcast: Podcast | null;
  isLoading: boolean;
  filters: PodcastFilters;
  
  // Actions
  fetchPodcasts: (filters?: PodcastFilters) => Promise<void>;
  fetchPodcastBySlug: (slug: string) => Promise<Podcast | null>;
  fetchCategories: () => Promise<void>;
  fetchTags: () => Promise<void>;
  setFilters: (filters: PodcastFilters) => void;
  clearFilters: () => void;
  
  // Admin actions
  createPodcast: (data: PodcastFormData) => Promise<Podcast>;
  updatePodcast: (id: string, data: Partial<PodcastFormData>) => Promise<Podcast>;
  deletePodcast: (id: string) => Promise<void>;
  publishPodcast: (id: string) => Promise<void>;
}

// Helper to get auth headers
function getAuthHeaders(): Record<string, string> {
  const user = useAuthStore.getState().user;
  return user ? { 'X-User-Id': user.id } : {};
}

export const usePodcastStore = create<PodcastState>((set, get) => ({
  podcasts: [],
  categories: [],
  tags: [],
  currentPodcast: null,
  isLoading: false,
  filters: {},

  fetchPodcasts: async (filters?: PodcastFilters) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      const activeFilters = filters || get().filters;
      
      if (activeFilters.categoryId) params.set('categoryId', activeFilters.categoryId);
      if (activeFilters.tagId) params.set('tagId', activeFilters.tagId);
      if (activeFilters.isFree !== undefined) params.set('isFree', String(activeFilters.isFree));
      if (activeFilters.search) params.set('search', activeFilters.search);
      if (activeFilters.status) params.set('status', activeFilters.status);
      if (activeFilters.limit) params.set('limit', String(activeFilters.limit));
      if (activeFilters.offset) params.set('offset', String(activeFilters.offset));

      const response = await fetch(`/api/podcasts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch podcasts');
      
      const data = await response.json();
      set({ podcasts: data, isLoading: false });
    } catch (error) {
      console.error('Fetch podcasts error:', error);
      set({ podcasts: [], isLoading: false });
    }
  },

  fetchPodcastBySlug: async (slug: string) => {
    set({ isLoading: true });
    try {
      const response = await fetch(`/api/podcasts/${slug}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Podcast not found');
      
      const podcast = await response.json();
      set({ currentPodcast: podcast, isLoading: false });
      return podcast;
    } catch (error) {
      console.error('Fetch podcast error:', error);
      set({ currentPodcast: null, isLoading: false });
      return null;
    }
  },

  fetchCategories: async () => {
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      
      const data = await response.json();
      set({ categories: data });
    } catch (error) {
      console.error('Fetch categories error:', error);
      set({ categories: [] });
    }
  },

  fetchTags: async () => {
    try {
      const response = await fetch('/api/tags');
      if (!response.ok) throw new Error('Failed to fetch tags');
      
      const data = await response.json();
      set({ tags: data });
    } catch (error) {
      console.error('Fetch tags error:', error);
      set({ tags: [] });
    }
  },

  setFilters: (filters: PodcastFilters) => {
    set({ filters: { ...get().filters, ...filters } });
    get().fetchPodcasts();
  },

  clearFilters: () => {
    set({ filters: {} });
    get().fetchPodcasts();
  },

  createPodcast: async (data: PodcastFormData) => {
    const response = await fetch('/api/admin/podcasts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create podcast' }));
      throw new Error(error.error || error.message || 'Failed to create podcast');
    }

    const podcast = await response.json();
    set({ podcasts: [podcast, ...get().podcasts] });
    return podcast;
  },

  updatePodcast: async (id: string, data: Partial<PodcastFormData>) => {
    const response = await fetch(`/api/admin/podcasts/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update podcast' }));
      throw new Error(error.error || error.message || 'Failed to update podcast');
    }

    const podcast = await response.json();
    set({
      podcasts: get().podcasts.map((p) => (p.id === id ? podcast : p)),
      currentPodcast: get().currentPodcast?.id === id ? podcast : get().currentPodcast,
    });
    return podcast;
  },

  deletePodcast: async (id: string) => {
    const response = await fetch(`/api/admin/podcasts/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete podcast' }));
      throw new Error(error.error || 'Failed to delete podcast');
    }

    set({
      podcasts: get().podcasts.filter((p) => p.id !== id),
      currentPodcast: get().currentPodcast?.id === id ? null : get().currentPodcast,
    });
  },

  publishPodcast: async (id: string) => {
    const response = await fetch(`/api/admin/podcasts/${id}/publish`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to publish podcast' }));
      throw new Error(error.error || 'Failed to publish podcast');
    }

    const podcast = await response.json();
    set({
      podcasts: get().podcasts.map((p) => (p.id === id ? podcast : p)),
    });
  },
}));
