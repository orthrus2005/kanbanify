import { create } from 'zustand';
import { supabase } from '../../../shared/api/supabase';

export const useAuthStore = create((set) => ({
  user: null,
  isLoading: true,
  error: '',

  checkSession: async () => {
    set({ isLoading: true, error: '' });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      set({ user: user || session.user || null, isLoading: false });
    } else {
      set({ user: null, isLoading: false });
    }

    supabase.auth.onAuthStateChange(async (_event, sessionData) => {
      if (!sessionData) {
        set({ user: null });
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      set({ user: user || sessionData.user || null });
    });
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user || data?.user) {
      set({ user: user || data.user, error: '' });
    }

    return user || data?.user || null;
  },
}));
