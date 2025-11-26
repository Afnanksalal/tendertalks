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
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            const userData = await syncUserToDatabase(session.user);
            set({ 
              session, 
              user: userData, 
              isAdmin: userData?.role === 'admin',
              isLoading: false 
            });
          } else {
            set({ session: null, user: null, isAdmin: false, isLoading: false });
          }

          // Listen for auth changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
              set({ session: null, user: null, isAdmin: false });
            } else if (session?.user) {
              const userData = await syncUserToDatabase(session.user);
              set({ 
                session, 
                user: userData, 
                isAdmin: userData?.role === 'admin' 
              });
            }
          });
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ isLoading: false });
        }
      },

      signInWithGoogle: async () => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
      },

      signInWithEmail: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        if (data.user) {
          const userData = await syncUserToDatabase(data.user);
          set({ 
            session: data.session, 
            user: userData, 
            isAdmin: userData?.role === 'admin' 
          });
        }
      },

      signUpWithEmail: async (email: string, password: string, name: string) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
      },

      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        set({ user: null, session: null, isAdmin: false });
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
      partialize: (state) => ({ user: state.user }),
    }
  )
);

// Sync Supabase Auth user to our database
async function syncUserToDatabase(supabaseUser: SupabaseUser): Promise<User | null> {
  try {
    const response = await fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name,
        avatarUrl: supabaseUser.user_metadata?.avatar_url,
      }),
    });

    if (!response.ok) {
      console.error('Failed to sync user');
      // Return a minimal user object if sync fails
      return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.user_metadata?.name || null,
        avatarUrl: supabaseUser.user_metadata?.avatar_url || null,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return response.json();
  } catch (error) {
    console.error('User sync error:', error);
    // Return a minimal user object if sync fails
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: supabaseUser.user_metadata?.name || null,
      avatarUrl: supabaseUser.user_metadata?.avatar_url || null,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
