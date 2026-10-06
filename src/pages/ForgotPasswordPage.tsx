import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sendPasswordReset, loading } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] p-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="p-8 w-full max-w-sm">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] mb-5">
            <ArrowLeft size={14} /> Back to sign in
          </Link>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Reset your password</h1>
          <p className="text-sm text-[var(--text-tertiary)] mb-5">
            Enter your account email and we'll send you a link to reset your password.
          </p>

          {sent ? (
            <p className="text-sm text-green-500 bg-green-500/10 rounded-lg p-3">
              If an account exists for {email}, a reset link is on its way.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <Button type="submit" disabled={loading}>
                Send Reset Link
              </Button>
            </form>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
