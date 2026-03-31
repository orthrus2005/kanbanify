import { create } from 'zustand';
import { supabase } from '../../../shared/api/supabase';

let authSubscription = null;
let checkSessionPromise = null;

export const useAuthStore = create((set) => ({
  user: null,
  isLoading: true,
  error: '',

  checkSession: async () => {
    if (checkSessionPromise) {
      return checkSessionPromise;
    }

    set({ isLoading: true, error: '' });

    if (!authSubscription) {
      const { data } = supabase.auth.onAuthStateChange((_event, sessionData) => {
        set({
          user: sessionData?.user ?? null,
          isLoading: false,
          error: '',
        });
      });

      authSubscription = data.subscription;
    }

    checkSessionPromise = (async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        set({
          user: session?.user ?? null,
          isLoading: false,
          error: '',
        });

        return session?.user ?? null;
      } catch (error) {
        if (error?.name === 'AuthSessionMissingError') {
          set({ user: null, isLoading: false, error: '' });
          return null;
        }

        if (error?.name === 'AbortError') {
          set({ isLoading: false });
          return null;
        }

        set({
          user: null,
          isLoading: false,
          error: error?.message || 'Не удалось проверить сессию',
        });
        return null;
      } finally {
        checkSessionPromise = null;
      }
    })();

    return checkSessionPromise;
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: '' });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      set({ isLoading: false, error: error.message });
      return null;
    }

    set({ isLoading: false, error: '' });
    return data;
  },

  signUp: async (email, password) => {
    set({ isLoading: true, error: '' });
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      set({ isLoading: false, error: error.message });
      return null;
    }

    set({ isLoading: false, error: '' });
    return data;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, error: '' });
  },

  updateUserMetadata: async (updates) => {
    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...(updates || {}),
      },
    });

    if (error) {
      set({ error: error.message });
      return null;
    }

    if (data?.user) {
      set({ user: data.user, error: '' });
    }

    return data?.user || null;
  },
}));
