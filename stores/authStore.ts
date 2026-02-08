import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, UserPreferences } from '../types/database';

// Dev mode: set to true to use mock data without Supabase
const DEV_MODE = false;

const MOCK_USER: User = {
  id: 'dev-user-123',
  email: 'dev@dialectica.app',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

const MOCK_PROFILE: UserProfile = {
  id: 'dev-user-123',
  display_name: 'Developer',
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  onboarding_completed: true,
  current_level: 1,
  total_sessions: 5,
  streak_days: 3,
  last_session_at: new Date().toISOString(),
  is_admin: true,
};

const MOCK_PREFERENCES: UserPreferences = {
  user_id: 'dev-user-123',
  preferred_challenge_intensity: 5,
  tts_enabled: false,
  voice_input_enabled: false,
  notification_daily_challenge: true,
  notification_time: '09:00',
  theme: 'dark',
  preferred_persona_ids: null,
  avoided_topics: null,
  immersive_chat_enabled: true,
  user_gender: null,
  interested_in: null,
  updated_at: new Date().toISOString(),
};

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

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  preferences: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    // Dev mode: use mock data
    if (DEV_MODE) {
      set({
        user: MOCK_USER,
        profile: MOCK_PROFILE,
        preferences: MOCK_PREFERENCES,
        isLoading: false,
        isInitialized: true,
      });
      return;
    }

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

      supabase.auth.onAuthStateChange(async (event, session) => {
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
      await supabase.auth.signOut();
      set({ session: null, user: null, profile: null, preferences: null });
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

    if (!error) {
      await get().fetchProfile();
    }

    return { error: error as Error | null };
  },

  updatePreferences: async (updates) => {
    const { user } = get();
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        { user_id: user.id, ...updates, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );

    if (!error) {
      await get().fetchProfile();
    }

    return { error: error as Error | null };
  },
}));
