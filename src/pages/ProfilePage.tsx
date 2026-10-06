import { useRef, useState } from 'react';
import { Camera, Loader2, CheckCircle2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function ProfilePage() {
  const { user, loading, updateProfile, uploadAvatar, updatePassword, resendVerificationEmail } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-sm text-[var(--text-tertiary)]">
        Sign in to view and manage your profile.
      </div>
    );
  }

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setError(null);
    try {
      const url = await uploadAvatar(file);
      await updateProfile({ avatarUrl: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Avatar upload failed');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setError(null);
    try {
      await updateProfile({ displayName });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    }
  };

  const handleChangePassword = async () => {
    setError(null);
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    try {
      await updatePassword(newPassword);
      setPasswordSaved(true);
      setNewPassword('');
      setTimeout(() => setPasswordSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Profile</h1>

      <Card className="p-5 flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-16 w-16 rounded-full bg-[var(--accent-soft)] flex items-center justify-center overflow-hidden text-[var(--accent)] font-semibold text-xl"
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              (user.displayName ?? user.email ?? '?').charAt(0).toUpperCase()
            )}
            {avatarUploading && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 size={18} className="animate-spin text-white" />
              </span>
            )}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-[var(--accent)] text-white flex items-center justify-center"
            aria-label="Change avatar"
          >
            <Camera size={12} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleAvatarSelect(e)} />
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)]">{user.displayName || 'Bible Study User'}</p>
          <p className="text-sm text-[var(--text-tertiary)]">{user.email}</p>
          <div className="flex items-center gap-1 mt-1 text-xs">
            {user.emailVerified ? (
              <span className="flex items-center gap-1 text-green-500"><ShieldCheck size={13} /> Verified</span>
            ) : (
              <span className="flex items-center gap-1 text-amber-500"><ShieldAlert size={13} /> Unverified</span>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Display Name</h2>
        <div className="flex gap-2">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <Button onClick={() => void handleSaveProfile()} disabled={loading}>
            {saved ? <CheckCircle2 size={16} /> : 'Save'}
          </Button>
        </div>
      </Card>

      {!user.emailVerified && user.provider === 'email' && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-2">Email Verification</h2>
          <p className="text-sm text-[var(--text-tertiary)] mb-3">
            Verify your email address to secure your account and enable password recovery.
          </p>
          <Button
            size="sm"
            variant="secondary"
            disabled={resent}
            onClick={() => {
              void resendVerificationEmail(user.email!);
              setResent(true);
            }}
          >
            {resent ? 'Verification email sent' : 'Resend verification email'}
          </Button>
        </Card>
      )}

      {user.provider === 'email' && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Change Password</h2>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <Button onClick={() => void handleChangePassword()} disabled={loading}>
              {passwordSaved ? <CheckCircle2 size={16} /> : 'Update'}
            </Button>
          </div>
        </Card>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
