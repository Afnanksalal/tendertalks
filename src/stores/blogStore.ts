import { create } from 'zustand';
import type { Blog, Tag } from '../db/schema';
import { useAuthStore } from './authStore';

interface BlogFilters {
  tagId?: string;
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

interface BlogWithMeta extends Blog {
  creator?: { id: string; name: string | null; avatarUrl: string | null };
  tags?: Tag[];
  content?: string;
}

interface BlogState {
  blogs: BlogWithMeta[];
  currentBlog: BlogWithMeta | null;
  isLoading: boolean;
  filters: BlogFilters;
  lastFetched: number;
  
  fetchBlogs: (filters?: BlogFilters) => Promise<void>;
  fetchBlogBySlug: (slug: string) => Promise<BlogWithMeta | null>;
  setFilters: (filters: BlogFilters) => void;
  clearFilters: () => void;
  createBlog: (data: any) => Promise<Blog>;
  updateBlog: (id: string, data: any) => Promise<Blog>;
  deleteBlog: (id: string) => Promise<void>;
  publishBlog: (id: string) => Promise<void>;
}

const CACHE_DURATION = 60000;

function getAuthHeaders(): Record<string, string> {
  const user = useAuthStore.getState().user;
  return user ? { 'X-User-Id': user.id } : {};
}

export const useBlogStore = create<BlogState>((set, get) => ({
  blogs: [],
  currentBlog: null,
  isLoading: false,
  filters: {},
  lastFetched: 0,

  fetchBlogs: async (filters?: BlogFilters) => {
    const now = Date.now();
    const { blogs, lastFetched, isLoading } = get();
    if (isLoading) return;
    
    // Skip cache if filters are provided (admin panel uses filters)
    const hasFilters = filters && Object.keys(filters).length > 0;
    if (!hasFilters && blogs.length > 0 && now - lastFetched < CACHE_DURATION) return;

    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      const activeFilters = filters || get().filters;
      Object.entries(activeFilters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.set(k, String(v));
        }
      });

      // Use admin endpoint if status filter is present (admin panel)
      const isAdminFetch = activeFilters.status !== undefined;
      const endpoint = isAdminFetch 
        ? `/api/admin/blogs${params.toString() ? `?${params}` : ''}`
        : `/api/blogs${params.toString() ? `?${params}` : ''}`;
      
      const response = await fetch(endpoint, {
        headers: isAdminFetch ? getAuthHeaders() : {},
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to fetch blogs');
      }
      
      set({ blogs: await response.json(), isLoading: false, lastFetched: now });
    } catch (error) {
      console.error('Error fetching blogs:', error);
      set({ blogs: [], isLoading: false });
    }
  },

  fetchBlogBySlug: async (slug) => {
    set({ isLoading: true });
    try {
      const response = await fetch(`/api/blogs/${slug}`, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error();
      const blog = await response.json();
      set({ currentBlog: blog, isLoading: false });
      return blog;
    } catch {
      set({ currentBlog: null, isLoading: false });
      return null;
    }
  },

  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters }, lastFetched: 0 });
    get().fetchBlogs();
  },

  clearFilters: () => {
    set({ filters: {}, lastFetched: 0 });
    get().fetchBlogs();
  },

  createBlog: async (data) => {
    const response = await fetch('/api/admin/blogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to create blog');
    }
    const blog = await response.json();
    set({ blogs: [blog, ...get().blogs] });
    return blog;
  },

  updateBlog: async (id, data) => {
    const response = await fetch(`/api/admin/blogs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to update blog');
    }
    const blog = await response.json();
    set({
      blogs: get().blogs.map((b) => (b.id === id ? blog : b)),
      currentBlog: get().currentBlog?.id === id ? blog : get().currentBlog,
    });
    return blog;
  },

  deleteBlog: async (id) => {
    const response = await fetch(`/api/admin/blogs/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to delete blog');
    }
    set({
      blogs: get().blogs.filter((b) => b.id !== id),
      currentBlog: get().currentBlog?.id === id ? null : get().currentBlog,
    });
  },

  publishBlog: async (id) => {
    const response = await fetch(`/api/admin/blogs/${id}/publish`, { method: 'POST', headers: getAuthHeaders() });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to publish blog');
    }
    const blog = await response.json();
    set({ blogs: get().blogs.map((b) => (b.id === id ? blog : b)) });
  },
}));
