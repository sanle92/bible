import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { isSupabaseConfigured } from '@/services/supabaseClient';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
        navigate('/read');
      } else {
        await signUpWithEmail(email, password, displayName);
        setInfo('Account created! Check your email to verify your address before signing in.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] p-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="p-8 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-9 w-9 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-serif font-bold">
              B
            </div>
            <span className="font-semibold text-lg text-[var(--text-primary)]">Bible Study Workspace</span>
          </div>

          {!isSupabaseConfigured && (
            <p className="text-xs text-amber-500 mb-4 bg-amber-500/10 rounded-md p-2">
              Supabase is not configured. You can continue in local-only mode without an account.
            </p>
          )}

          <Button
            type="button"
            variant="secondary"
            className="w-full mb-4"
            onClick={() => void handleGoogle()}
            disabled={loading || !isSupabaseConfigured}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09A6.99 6.99 0 0 1 5.44 12c0-.73.13-1.43.36-2.09V7.07H2.18A11.94 11.94 0 0 0 1 12c0 1.92.46 3.74 1.18 5.24l3.66-3.15z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.99 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.76l3.66 2.84c.87-2.6 3.3-4.22 6.16-4.22z" />
            </svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-px bg-[var(--border-subtle)]" />
            <span className="text-[10px] uppercase text-[var(--text-tertiary)]">or</span>
            <div className="flex-1 h-px bg-[var(--border-subtle)]" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === 'signup' && (
              <input
                type="text"
                placeholder="Full name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            )}
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            {mode === 'signin' && (
              <Link to="/forgot-password" className="self-end text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)]">
                Forgot password?
              </Link>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
            {info && <p className="text-xs text-green-500">{info}</p>}
            <Button type="submit" disabled={loading} className="mt-1">
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <button
            className="text-xs text-[var(--text-tertiary)] mt-4 hover:text-[var(--accent)]"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
              setInfo(null);
            }}
          >
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>

          <button
            className="w-full text-center text-xs text-[var(--text-secondary)] mt-6 hover:text-[var(--accent)]"
            onClick={() => navigate('/read')}
          >
            Continue without an account →
          </button>
        </Card>
      </motion.div>
    </div>
  );
}
