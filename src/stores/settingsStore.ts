import { create } from 'zustand';

interface FeatureSettings {
  feature_blog: boolean;
  feature_merch: boolean;
  feature_subscriptions: boolean;
  feature_downloads: boolean;
  feature_newsletter: boolean;
  site_name: string;
  site_tagline: string;
  maintenance_mode: boolean;
}

interface SettingsState {
  settings: FeatureSettings;
  isLoading: boolean;
  isLoaded: boolean;
  fetchSettings: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: FeatureSettings = {
  feature_blog: true,
  feature_merch: true,
  feature_subscriptions: true,
  feature_downloads: true,
  feature_newsletter: true,
  site_name: 'TenderTalks',
  site_tagline: 'AI, Tech & Human Connection',
  maintenance_mode: false,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  isLoading: false,
  isLoaded: false,

  fetchSettings: async () => {
    if (get().isLoaded) return;
    
    set({ isLoading: true });
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        set({
          settings: {
            feature_blog: data.feature_blog === 'true',
            feature_merch: data.feature_merch === 'true',
            feature_subscriptions: data.feature_subscriptions === 'true',
            feature_downloads: data.feature_downloads === 'true',
            feature_newsletter: data.feature_newsletter === 'true',
            site_name: data.site_name || 'TenderTalks',
            site_tagline: data.site_tagline || 'AI, Tech & Human Connection',
            maintenance_mode: data.maintenance_mode === 'true',
          },
          isLoaded: true,
        });
      }
    } catch {
      // Use defaults on error
      set({ isLoaded: true });
    }
    set({ isLoading: false });
  },

  // Force refresh settings (used after admin updates)
  refreshSettings: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        set({
          settings: {
            feature_blog: data.feature_blog === 'true',
            feature_merch: data.feature_merch === 'true',
            feature_subscriptions: data.feature_subscriptions === 'true',
            feature_downloads: data.feature_downloads === 'true',
            feature_newsletter: data.feature_newsletter === 'true',
            site_name: data.site_name || 'TenderTalks',
            site_tagline: data.site_tagline || 'AI, Tech & Human Connection',
            maintenance_mode: data.maintenance_mode === 'true',
          },
        });
      }
    } catch {
      // Refresh failed silently
    }
    set({ isLoading: false });
  },
}));
