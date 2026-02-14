import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, UserPreferences } from '../types/database';


// Track auth subscription outside store to avoid serialization issues
let _authSubscription: { unsubscribe: () => void } | null = null;

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  preferences: UserPreferences | null;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<{ error: Error | null }>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
  session: null,
  user: null,
  profile: null,
  preferences: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (session && !sessionError) {
        set({ session, user: session.user });

        // Validate session by actually fetching profile
        // If this fails, the session is likely stale
        try {
          await get().fetchProfile();
        } catch (profileError) {
          console.warn('Profile fetch failed, clearing stale session:', profileError);
          await supabase.auth.signOut();
          set({ session: null, user: null, profile: null, preferences: null });
        }
      } else if (sessionError) {
        console.warn('Session error, clearing auth state:', sessionError);
        await supabase.auth.signOut();
        set({ session: null, user: null, profile: null, preferences: null });
      }

      // Unsubscribe previous listener to prevent memory leaks on re-init
      _authSubscription?.unsubscribe();

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        // Handle token refresh errors
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('Token refresh failed, signing out');
          set({ session: null, user: null, profile: null, preferences: null });
          return;
        }

        set({ session, user: session?.user ?? null });
        if (session) {
          await get().fetchProfile();
        } else {
          set({ profile: null, preferences: null });
        }
      });

      _authSubscription = subscription;
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  signInWithEmail: async (email, password) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error };
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    } finally {
      set({ isLoading: false });
    }
  },

  signUpWithEmail: async (email, password, displayName) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error };

      if (data.user) {
        await supabase.from('user_profiles').insert({
          id: data.user.id,
          display_name: displayName ?? null,
        });

        await supabase.from('user_preferences').insert({
          user_id: data.user.id,
        });
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithApple: async () => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
      });
      if (error) return { error };
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      // Unsubscribe auth listener
      _authSubscription?.unsubscribe();
      _authSubscription = null;

      await supabase.auth.signOut();
      set({ session: null, user: null, profile: null, preferences: null });

      // Clear persisted auth data from AsyncStorage
      await AsyncStorage.multiRemove(['dialectica-auth', 'dialectica-preferences']);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    const [profileResult, preferencesResult] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', user.id).single(),
      supabase.from('user_preferences').select('*').eq('user_id', user.id).single(),
    ]);

    // Check for auth errors (indicates stale session)
    if (profileResult.error?.code === 'PGRST301' || preferencesResult.error?.code === 'PGRST301') {
      throw new Error('Authentication required');
    }

    // If profile doesn't exist, create it (handles users created outside the app)
    if (!profileResult.data && profileResult.error?.code === 'PGRST116') {
      const { data: newProfile, error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          display_name: user.email?.split('@')[0] ?? 'User',
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      if (newProfile) {
        await supabase.from('user_preferences').insert({ user_id: user.id });
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        set({ profile: newProfile, preferences: prefs });
        return;
      }
    }

    // If profile exists but preferences row is missing, create it
    if (profileResult.data && !preferencesResult.data) {
      await supabase.from('user_preferences').insert({ user_id: user.id });
      const { data: newPrefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      set({ profile: profileResult.data, preferences: newPrefs });
      return;
    }

    set({
      profile: profileResult.data,
      preferences: preferencesResult.data,
    });
  },

  updateProfile: async (updates) => {
    const { user } = get();
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('user_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      console.error('[authStore] updateProfile failed:', error);
    } else {
      await get().fetchProfile();
    }

    return { error: error as Error | null };
  },

  updatePreferences: async (updates) => {
    const { user, preferences } = get();
    if (!user) return { error: new Error('Not authenticated') };

    // Optimistic update: apply changes to store immediately
    // so the UI reflects the change without waiting for DB
    if (preferences) {
      set({
        preferences: { ...preferences, ...updates, updated_at: new Date().toISOString() },
      });
    }

    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        { user_id: user.id, ...updates, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('[authStore] updatePreferences failed:', error);
      // Revert optimistic update on failure by re-fetching from DB
      await get().fetchProfile();
    }

    return { error: error as Error | null };
  },
    }),
    {
      name: 'dialectica-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Persist profile and preferences locally so they survive app restarts
        // even before the DB fetch completes.
        // SECURITY: Strip is_admin from persisted state to prevent device-level
        // tampering. The real value is always fetched from DB on initialize().
        profile: state.profile
          ? { ...state.profile, is_admin: false }
          : null,
        preferences: state.preferences,
      }),
    },
  ),
);
