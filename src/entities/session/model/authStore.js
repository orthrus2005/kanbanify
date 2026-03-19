import { create } from 'zustand';
import { supabase } from '../../../shared/api/supabase';

export const useAuthStore = create((set) => ({
  user: null,
  isLoading: true,
  checkSession: async () => {
    set({ isLoading: true });
    const { data: { session } } = await supabase.auth.getSession();
    set({ user: session?.user || null, isLoading: false });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user || null });
    });
  },
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  }
}));