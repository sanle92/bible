import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { isSupabaseConfigured } from '@/services/supabaseClient';

export function ProtectedRoute() {
  const { user, initialized } = useAuthStore();
  const location = useLocation();

  // Local-only mode: Supabase not configured, allow full offline access without auth.
  if (!isSupabaseConfigured) {
    return <Outlet />;
  }

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)]">
        <Loader2 className="animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
