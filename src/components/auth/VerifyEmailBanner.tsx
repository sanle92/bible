import { useState } from 'react';
import { MailWarning } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export function VerifyEmailBanner() {
  const { user, resendVerificationEmail } = useAuthStore();
  const [sent, setSent] = useState(false);

  if (!user || user.emailVerified || !user.email || user.provider !== 'email') return null;

  const handleResend = async () => {
    try {
      await resendVerificationEmail(user.email!);
      setSent(true);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex items-center gap-2 bg-amber-500/10 text-amber-600 text-xs px-4 py-2">
      <MailWarning size={14} className="shrink-0" />
      <span className="flex-1">Please verify your email address ({user.email}) to secure your account.</span>
      <button onClick={() => void handleResend()} disabled={sent} className="font-semibold underline shrink-0">
        {sent ? 'Sent!' : 'Resend email'}
      </button>
    </div>
  );
}
