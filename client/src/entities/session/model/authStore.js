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

    set({ user: session?.user || null, isLoading: false });

    supabase.auth.onAuthStateChange((_event, sessionData) => {
      set({ user: sessionData?.user || null });
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

    if (data?.user) {
      set({ user: data.user, error: '' });
    }

    return data?.user || null;
  },
}));
