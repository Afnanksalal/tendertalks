import { create } from 'zustand';
import type { MerchItem } from '../db/schema';

interface MerchState {
  items: MerchItem[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number;
  
  fetchMerch: (category?: string) => Promise<void>;
  getMerchBySlug: (slug: string) => MerchItem | undefined;
}

const CACHE_DURATION = 60000;

export const useMerchStore = create<MerchState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,
  lastFetched: 0,

  fetchMerch: async (category?: string) => {
    const now = Date.now();
    const { items, lastFetched, isLoading } = get();
    
    // Skip if already loading or cache is fresh
    if (isLoading) return;
    if (items.length > 0 && now - lastFetched < CACHE_DURATION) return;

    set({ isLoading: true, error: null });
    try {
      const params = category && category !== 'all' ? `?category=${category}` : '';
      const response = await fetch(`/api/merch${params}`);
      
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      set({ items: Array.isArray(data) ? data : [], isLoading: false, lastFetched: now });
    } catch (error) {
      set({ 
        items: [], 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch merch' 
      });
    }
  },

  getMerchBySlug: (slug) => get().items.find((item) => item.slug === slug),
}));
