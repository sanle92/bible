import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { AppUser } from '@/types/user';
import { supabase } from '@/services/supabaseClient';

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  updateProfile: (updates: { displayName?: string; avatarUrl?: string }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  signOut: () => Promise<void>;
}

function mapUser(user: User | undefined | null): AppUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    displayName: user.user_metadata?.full_name ?? user.user_metadata?.display_name ?? null,
    avatarUrl: user.user_metadata?.avatar_url ?? null,
    emailVerified: Boolean(user.email_confirmed_at),
    provider: user.app_metadata?.provider ?? 'email',
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,
  init: async () => {
    const { data } = await supabase.auth.getSession();
    set({ user: mapUser(data.session?.user), initialized: true });
    supabase.auth.onAuthStateChange((_event, newSession) => {
      set({ user: mapUser(newSession?.user) });
    });
  },
  signInWithEmail: async (email, password) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } finally {
      set({ loading: false });
    }
  },
  signUpWithEmail: async (email, password, displayName) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: displayName ? { full_name: displayName } : undefined,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } finally {
      set({ loading: false });
    }
  },
  signInWithMagicLink: async (email) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } finally {
      set({ loading: false });
    }
  },
  signInWithGoogle: async () => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } finally {
      set({ loading: false });
    }
  },
  sendPasswordReset: async (email) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    } finally {
      set({ loading: false });
    }
  },
  updatePassword: async (newPassword) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    } finally {
      set({ loading: false });
    }
  },
  resendVerificationEmail: async (email) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } finally {
      set({ loading: false });
    }
  },
  updateProfile: async (updates) => {
    set({ loading: true });
    try {
      const data: Record<string, string> = {};
      if (updates.displayName !== undefined) data.full_name = updates.displayName;
      if (updates.avatarUrl !== undefined) data.avatar_url = updates.avatarUrl;
      const { data: result, error } = await supabase.auth.updateUser({ data });
      if (error) throw error;
      set({ user: mapUser(result.user) });
    } finally {
      set({ loading: false });
    }
  },
  uploadAvatar: async (file) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) throw new Error('Not authenticated');
    const ext = file.name.split('.').pop();
    const path = `${userId}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, cacheControl: '3600' });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
}));
