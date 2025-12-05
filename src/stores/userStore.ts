import { create } from 'zustand';
import type { PricingPlan, Purchase, Podcast } from '../db/schema';
import { useAuthStore } from './authStore';
import type { SubscriptionWithDetails } from '../api/subscriptions';

export type PurchaseItem = Partial<Purchase> & {
  purchase?: Purchase;
  podcast?: Podcast;
};

interface UserStoreState {
  purchases: PurchaseItem[];
  subscription: SubscriptionWithDetails | null;
  pricingPlans: PricingPlan[];
  isLoading: boolean;
  lastFetched: { purchases: number; subscription: number; plans: number };

  fetchPurchases: () => Promise<void>;
  fetchSubscription: () => Promise<void>;
  fetchPricingPlans: () => Promise<void>;
  hasPurchased: (podcastId: string) => boolean;
  hasActiveSubscription: () => boolean;
  canAccessPodcast: (podcastId: string, isFree: boolean) => boolean;
  clearSubscription: () => void;
}

const CACHE_DURATION = 60000;

const defaultPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    slug: 'free',
    price: '0',
    currency: 'INR',
    interval: 'month',
    description: 'Get started',
    features: ['Free podcasts', 'Standard quality'],
    allowDownloads: false,
    allowOffline: false,
    includesPlaylists: false,
    isActive: true,
    sortOrder: 0,
    createdAt: new Date(),
  },
  {
    id: 'pro',
    name: 'Pro',
    slug: 'pro',
    price: '299',
    currency: 'INR',
    interval: 'month',
    description: 'For listeners',
    features: ['All content', 'HD audio', 'Downloads'],
    allowDownloads: true,
    allowOffline: true,
    includesPlaylists: false,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date(),
  },
  {
    id: 'premium',
    name: 'Premium',
    slug: 'premium',
    price: '2499',
    currency: 'INR',
    interval: 'year',
    description: 'Best value',
    features: ['Everything', 'Priority support'],
    allowDownloads: true,
    allowOffline: true,
    includesPlaylists: true,
    isActive: true,
    sortOrder: 2,
    createdAt: new Date(),
  },
];

export const useUserStore = create<UserStoreState>((set, get) => ({
  purchases: [],
  subscription: null,
  pricingPlans: defaultPlans,
  isLoading: false,
  lastFetched: { purchases: 0, subscription: 0, plans: 0 },

  fetchPurchases: async () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ purchases: [] });
      return;
    }
    const now = Date.now();
    if (get().purchases.length > 0 && now - get().lastFetched.purchases < CACHE_DURATION) return;
    set({ isLoading: true });
    try {
      const res = await fetch('/api/users/purchases', { headers: { 'X-User-Id': user.id } });
      const data = res.ok ? await res.json() : [];
      set({
        purchases: Array.isArray(data) ? data : [],
        isLoading: false,
        lastFetched: { ...get().lastFetched, purchases: now },
      });
    } catch {
      set({ purchases: [], isLoading: false });
    }
  },

  fetchSubscription: async () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ subscription: null });
      return;
    }
    const now = Date.now();
    if (get().subscription && now - get().lastFetched.subscription < CACHE_DURATION) return;
    try {
      const res = await fetch('/api/users/subscription', { headers: { 'X-User-Id': user.id } });
      set({
        subscription: res.ok ? await res.json() : null,
        lastFetched: { ...get().lastFetched, subscription: now },
      });
    } catch {
      set({ subscription: null });
    }
  },

  fetchPricingPlans: async () => {
    const now = Date.now();
    const { pricingPlans, lastFetched } = get();
    if (
      pricingPlans.length > 0 &&
      pricingPlans[0].id !== 'free' &&
      now - lastFetched.plans < CACHE_DURATION
    )
      return;
    try {
      const res = await fetch('/api/pricing-plans');
      const data = res.ok ? await res.json() : [];
      set({
        pricingPlans: data.length > 0 ? data : defaultPlans,
        lastFetched: { ...get().lastFetched, plans: now },
      });
    } catch {
      set({ pricingPlans: defaultPlans });
    }
  },

  hasPurchased: (podcastId) =>
    get().purchases.some(
      (p) =>
        (p.podcastId || p.purchase?.podcastId) === podcastId &&
        (p.status || p.purchase?.status) === 'completed'
    ),
  hasActiveSubscription: () => {
    const s = get().subscription;
    return s
      ? ['active', 'pending_downgrade'].includes(s.status) &&
          new Date(s.currentPeriodEnd) > new Date()
      : false;
  },
  canAccessPodcast: (podcastId, isFree) =>
    isFree || get().hasActiveSubscription() || get().hasPurchased(podcastId),
  clearSubscription: () =>
    set({ subscription: null, lastFetched: { ...get().lastFetched, subscription: 0 } }),
}));
