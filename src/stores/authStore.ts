import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { User } from '../db/schema';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;

  // Actions
  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: true,
      isAdmin: false,

      initialize: async () => {
        try {
          set({ isLoading: true });

          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error) {
            console.error('Session error:', error);
            set({ session: null, user: null, isAdmin: false, isLoading: false });
            return;
          }

          if (session?.user) {
            const userData = await syncUserToDatabase(session.user, session.access_token);
            set({
              session,
              user: userData,
              isAdmin: userData?.role === 'admin',
              isLoading: false,
            });
          } else {
            set({ session: null, user: null, isAdmin: false, isLoading: false });
          }

          // Listen for auth changes - but avoid unnecessary re-syncs
          supabase.auth.onAuthStateChange(async (event, session) => {
            // Auth state changed event

            // Skip INITIAL_SESSION as we already handled it above
            if (event === 'INITIAL_SESSION') {
              return;
            }

            if (event === 'SIGNED_OUT') {
              set({ session: null, user: null, isAdmin: false });
            } else if (event === 'SIGNED_IN') {
              // Only sync on actual sign in, not on tab focus
              if (session?.user) {
                const userData = await syncUserToDatabase(session.user, session.access_token);
                set({
                  session,
                  user: userData,
                  isAdmin: userData?.role === 'admin',
                });
              }
            } else if (event === 'TOKEN_REFRESHED') {
              // Just update the session, don't re-sync user data
              if (session) {
                set({ session });
              }
            } else if (event === 'USER_UPDATED') {
              if (session?.user) {
                const userData = await syncUserToDatabase(session.user, session.access_token);
                set({
                  session,
                  user: userData,
                  isAdmin: userData?.role === 'admin',
                });
              }
            }
          });
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ isLoading: false });
        }
      },

      signInWithGoogle: async () => {
        // Use the configured app URL for redirects to ensure consistency
        const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${appUrl}/auth/callback`,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });
        if (error) throw error;
      },

      signInWithEmail: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Provide user-friendly error messages
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password');
          }
          throw error;
        }

        if (data.user && data.session) {
          const userData = await syncUserToDatabase(data.user, data.session.access_token);
          set({
            session: data.session,
            user: userData,
            isAdmin: userData?.role === 'admin',
          });
        }
      },

      signUpWithEmail: async (email: string, password: string, name: string) => {
        const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              full_name: name,
            },
            emailRedirectTo: `${appUrl}/auth/callback`,
          },
        });

        if (error) {
          if (error.message.includes('already registered')) {
            throw new Error('An account with this email already exists');
          }
          throw error;
        }

        // If email confirmation is disabled, user is signed in immediately
        if (data.user && data.session) {
          const userData = await syncUserToDatabase(data.user, data.session.access_token);
          set({
            session: data.session,
            user: userData,
            isAdmin: userData?.role === 'admin',
          });
        }

        // Return indication that confirmation email was sent
        if (data.user && !data.session) {
          throw new Error('Please check your email to confirm your account');
        }
      },

      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        set({ user: null, session: null, isAdmin: false });

        // Clear persisted storage
        localStorage.removeItem('auth-storage');
      },

      updateProfile: async (data: Partial<User>) => {
        const { user } = get();
        if (!user) throw new Error('Not authenticated');

        const response = await fetch('/api/users/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': user.id,
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Failed to update profile' }));
          throw new Error(error.error || 'Failed to update profile');
        }

        const updatedUser = await response.json();
        set({ user: updatedUser });
      },

      getAuthHeaders: () => {
        const { user } = get();
        return user ? { 'X-User-Id': user.id } : {};
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAdmin: state.isAdmin,
      }),
    }
  )
);

// Sync Supabase Auth user to our Neon database
async function syncUserToDatabase(supabaseUser: SupabaseUser, token: string): Promise<User> {
  try {
    const response = await fetch('/api/users/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: supabaseUser.id,
        email: supabaseUser.email,
        name:
          supabaseUser.user_metadata?.name ||
          supabaseUser.user_metadata?.full_name ||
          supabaseUser.email?.split('@')[0],
        avatarUrl: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to sync user:', errorData);

      // Return a fallback user object
      return createFallbackUser(supabaseUser);
    }

    const user = await response.json();
    return user;
  } catch (error) {
    console.error('User sync error:', error);
    return createFallbackUser(supabaseUser);
  }
}

// Create a fallback user object when sync fails
function createFallbackUser(supabaseUser: SupabaseUser): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name:
      supabaseUser.user_metadata?.name ||
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.email?.split('@')[0] ||
      null,
    avatarUrl:
      supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null,
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
