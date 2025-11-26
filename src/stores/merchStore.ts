import { create } from 'zustand';
import type { MerchItem } from '../db/schema';

interface MerchState {
  items: MerchItem[];
  isLoading: boolean;
  error: string | null;
  
  fetchMerch: (category?: string) => Promise<void>;
  getMerchBySlug: (slug: string) => MerchItem | undefined;
}

export const useMerchStore = create<MerchState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchMerch: async (category?: string) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (category && category !== 'all') {
        params.set('category', category);
      }
      
      const url = `/api/merch${params.toString() ? `?${params}` : ''}`;
      console.log('Fetching merch from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched merch items:', data);
      
      set({ items: Array.isArray(data) ? data : [], isLoading: false });
    } catch (error) {
      console.error('Fetch merch error:', error);
      set({ 
        items: [], 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch merch' 
      });
    }
  },

  getMerchBySlug: (slug: string) => {
    return get().items.find((item) => item.slug === slug);
  },
}));
