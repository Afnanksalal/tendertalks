import { create } from 'zustand';
import type { MerchItem } from '../db/schema';

interface MerchState {
  items: MerchItem[];
  isLoading: boolean;
  
  fetchMerch: () => Promise<void>;
  getMerchBySlug: (slug: string) => MerchItem | undefined;
}

export const useMerchStore = create<MerchState>((set, get) => ({
  items: [],
  isLoading: false,

  fetchMerch: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/merch');
      if (!response.ok) throw new Error('Failed to fetch merch');
      const data = await response.json();
      set({ items: data, isLoading: false });
    } catch (error) {
      console.error('Fetch merch error:', error);
      set({ isLoading: false });
    }
  },

  getMerchBySlug: (slug: string) => {
    return get().items.find((item) => item.slug === slug);
  },
}));
