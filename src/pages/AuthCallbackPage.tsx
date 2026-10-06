import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { useAuthStore } from '@/stores/authStore';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data.session) {
          await useAuthStore.getState().init();
          navigate('/read', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    };
    void run();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[var(--bg-app)]">
      {error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : (
        <>
          <Loader2 className="animate-spin text-[var(--accent)]" />
          <p className="text-sm text-[var(--text-tertiary)]">Signing you in…</p>
        </>
      )}
    </div>
  );
}
