import { create } from 'zustand';
import type { Podcast, Category, Tag } from '../db/schema';

interface PodcastFilters {
  categoryId?: string;
  tagId?: string;
  isFree?: boolean;
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
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
  createPodcast: (data: FormData) => Promise<Podcast>;
  updatePodcast: (id: string, data: FormData) => Promise<Podcast>;
  deletePodcast: (id: string) => Promise<void>;
  publishPodcast: (id: string) => Promise<void>;
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
      set({ isLoading: false });
    }
  },

  fetchPodcastBySlug: async (slug: string) => {
    set({ isLoading: true });
    try {
      const response = await fetch(`/api/podcasts/${slug}`);
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

  createPodcast: async (data: FormData) => {
    const response = await fetch('/api/admin/podcasts', {
      method: 'POST',
      body: data,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create podcast');
    }

    const podcast = await response.json();
    set({ podcasts: [podcast, ...get().podcasts] });
    return podcast;
  },

  updatePodcast: async (id: string, data: FormData) => {
    const response = await fetch(`/api/admin/podcasts/${id}`, {
      method: 'PATCH',
      body: data,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update podcast');
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
    });

    if (!response.ok) throw new Error('Failed to delete podcast');

    set({
      podcasts: get().podcasts.filter((p) => p.id !== id),
      currentPodcast: get().currentPodcast?.id === id ? null : get().currentPodcast,
    });
  },

  publishPodcast: async (id: string) => {
    const response = await fetch(`/api/admin/podcasts/${id}/publish`, {
      method: 'POST',
    });

    if (!response.ok) throw new Error('Failed to publish podcast');

    const podcast = await response.json();
    set({
      podcasts: get().podcasts.map((p) => (p.id === id ? podcast : p)),
    });
  },
}));
