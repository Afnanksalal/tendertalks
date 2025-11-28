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

interface PodcastState {
  podcasts: Podcast[];
  categories: Category[];
  tags: Tag[];
  currentPodcast: Podcast | null;
  isLoading: boolean;
  filters: PodcastFilters;
  lastFetched: { podcasts: number; categories: number; tags: number };
  
  fetchPodcasts: (filters?: PodcastFilters) => Promise<void>;
  fetchPodcastBySlug: (slug: string) => Promise<Podcast | null>;
  fetchCategories: () => Promise<void>;
  fetchTags: () => Promise<void>;
  setFilters: (filters: PodcastFilters) => void;
  clearFilters: () => void;
  createPodcast: (data: any) => Promise<Podcast>;
  updatePodcast: (id: string, data: any) => Promise<Podcast>;
  deletePodcast: (id: string) => Promise<void>;
  publishPodcast: (id: string) => Promise<void>;
}

const CACHE_DURATION = 60000;

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
  lastFetched: { podcasts: 0, categories: 0, tags: 0 },

  fetchPodcasts: async (filters?: PodcastFilters) => {
    const now = Date.now();
    const { podcasts, lastFetched, isLoading } = get();
    if (isLoading) return;
    if (!filters && podcasts.length > 0 && now - lastFetched.podcasts < CACHE_DURATION) return;

    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      const activeFilters = filters || get().filters;
      Object.entries(activeFilters).forEach(([k, v]) => v !== undefined && params.set(k, String(v)));

      const response = await fetch(`/api/podcasts?${params}`);
      if (!response.ok) throw new Error();
      
      set({ podcasts: await response.json(), isLoading: false, lastFetched: { ...get().lastFetched, podcasts: now } });
    } catch {
      set({ podcasts: [], isLoading: false });
    }
  },

  fetchPodcastBySlug: async (slug) => {
    set({ isLoading: true });
    try {
      const response = await fetch(`/api/podcasts/${slug}`, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error();
      const podcast = await response.json();
      set({ currentPodcast: podcast, isLoading: false });
      return podcast;
    } catch {
      set({ currentPodcast: null, isLoading: false });
      return null;
    }
  },

  fetchCategories: async () => {
    const now = Date.now();
    if (get().categories.length > 0 && now - get().lastFetched.categories < CACHE_DURATION) return;
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error();
      set({ categories: await response.json(), lastFetched: { ...get().lastFetched, categories: now } });
    } catch {
      set({ categories: [] });
    }
  },

  fetchTags: async () => {
    const now = Date.now();
    if (get().tags.length > 0 && now - get().lastFetched.tags < CACHE_DURATION) return;
    try {
      const response = await fetch('/api/tags');
      if (!response.ok) throw new Error();
      set({ tags: await response.json(), lastFetched: { ...get().lastFetched, tags: now } });
    } catch {
      set({ tags: [] });
    }
  },

  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters }, lastFetched: { ...get().lastFetched, podcasts: 0 } });
    get().fetchPodcasts();
  },

  clearFilters: () => {
    set({ filters: {}, lastFetched: { ...get().lastFetched, podcasts: 0 } });
    get().fetchPodcasts();
  },

  createPodcast: async (data) => {
    const response = await fetch('/api/admin/podcasts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to create podcast');
    }
    const podcast = await response.json();
    set({ podcasts: [podcast, ...get().podcasts] });
    return podcast;
  },

  updatePodcast: async (id, data) => {
    const response = await fetch(`/api/admin/podcasts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to update podcast');
    }
    const podcast = await response.json();
    set({
      podcasts: get().podcasts.map((p) => (p.id === id ? podcast : p)),
      currentPodcast: get().currentPodcast?.id === id ? podcast : get().currentPodcast,
    });
    return podcast;
  },

  deletePodcast: async (id) => {
    const response = await fetch(`/api/admin/podcasts/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to delete podcast');
    }
    set({
      podcasts: get().podcasts.filter((p) => p.id !== id),
      currentPodcast: get().currentPodcast?.id === id ? null : get().currentPodcast,
    });
  },

  publishPodcast: async (id) => {
    const response = await fetch(`/api/admin/podcasts/${id}/publish`, { method: 'POST', headers: getAuthHeaders() });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to publish podcast');
    }
    const podcast = await response.json();
    set({ podcasts: get().podcasts.map((p) => (p.id === id ? podcast : p)) });
  },
}));
