import { create } from 'zustand';
import type { Purchase, Subscription, PricingPlan } from '../db/schema';
import { useAuthStore } from './authStore';
import type { SubscriptionWithDetails } from '../api/subscriptions';

interface UserStoreState {
  purchases: any[];
  subscription: SubscriptionWithDetails | null;
  pricingPlans: PricingPlan[];
  isLoading: boolean;
  
  // Actions
  fetchPurchases: () => Promise<void>;
  fetchSubscription: () => Promise<void>;
  fetchPricingPlans: () => Promise<void>;
  hasPurchased: (podcastId: string) => boolean;
  hasActiveSubscription: () => boolean;
  canAccessPodcast: (podcastId: string, isFree: boolean) => boolean;
  clearSubscription: () => void;
}

// Default plans for fallback
const defaultPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    slug: 'free',
    price: '0',
    currency: 'INR',
    interval: 'month',
    description: 'Get started with free content',
    features: ['Access to free podcasts', 'Standard audio quality', 'Web player access'],
    allowDownloads: false,
    allowOffline: false,
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
    description: 'For serious listeners',
    features: ['All free content', 'Premium podcasts', 'HD audio quality', 'Download for offline', 'Early access'],
    allowDownloads: true,
    allowOffline: true,
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
    description: 'Best value for power users',
    features: ['Everything in Pro', 'Exclusive video content', 'Priority support', 'Community access', 'Save 30%'],
    allowDownloads: true,
    allowOffline: true,
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

  fetchPurchases: async () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ purchases: [] });
      return;
    }

    set({ isLoading: true });
    try {
      const response = await fetch('/api/users/purchases', {
        headers: { 'X-User-Id': user.id },
      });
      
      if (!response.ok) {
        set({ purchases: [], isLoading: false });
        return;
      }
      
      const data = await response.json();
      set({ purchases: Array.isArray(data) ? data : [], isLoading: false });
    } catch (error) {
      console.error('Fetch purchases error:', error);
      set({ purchases: [], isLoading: false });
    }
  },

  fetchSubscription: async () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ subscription: null });
      return;
    }

    try {
      const response = await fetch('/api/users/subscription', {
        headers: { 'X-User-Id': user.id },
      });
      
      if (!response.ok) {
        set({ subscription: null });
        return;
      }
      
      const data = await response.json();
      set({ subscription: data });
    } catch (error) {
      console.error('Fetch subscription error:', error);
      set({ subscription: null });
    }
  },

  fetchPricingPlans: async () => {
    try {
      const response = await fetch('/api/pricing-plans');
      
      if (!response.ok) {
        // Use default plans if API fails
        set({ pricingPlans: defaultPlans });
        return;
      }
      
      const data = await response.json();
      set({ pricingPlans: data.length > 0 ? data : defaultPlans });
    } catch (error) {
      console.error('Fetch pricing plans error:', error);
      set({ pricingPlans: defaultPlans });
    }
  },

  hasPurchased: (podcastId: string) => {
    const purchases = get().purchases;
    return purchases.some((p: any) => {
      const pId = p.podcastId || p.purchase?.podcastId;
      const status = p.status || p.purchase?.status;
      return pId === podcastId && status === 'completed';
    });
  },

  hasActiveSubscription: () => {
    const { subscription } = get();
    if (!subscription) return false;
    // Active or pending_downgrade both have access
    const validStatuses = ['active', 'pending_downgrade'];
    return (
      validStatuses.includes(subscription.status) &&
      new Date(subscription.currentPeriodEnd) > new Date()
    );
  },

  canAccessPodcast: (podcastId: string, isFree: boolean) => {
    if (isFree) return true;
    if (get().hasActiveSubscription()) return true;
    return get().hasPurchased(podcastId);
  },

  clearSubscription: () => {
    set({ subscription: null });
  },
}));
