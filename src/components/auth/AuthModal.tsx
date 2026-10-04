import { useEffect, useState } from 'react';

interface AuthModalProps {
  open: boolean;
  initialMode: 'login' | 'signup';
  prefillEmail?: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onGoogle: () => void;
  onSubmit: (values: { name?: string; email: string; password: string }, mode: 'login' | 'signup') => void;
}

function GoogleMark() {
  return (
    <svg className="google-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.35 12.2c0-.7-.06-1.36-.18-2H12v3.78h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.17Z" />
      <path fill="#34A853" d="M12 21.7c2.63 0 4.84-.87 6.45-2.33l-3.14-2.45c-.87.58-1.98.93-3.31.93-2.54 0-4.7-1.72-5.47-4.03H3.29v2.53A9.73 9.73 0 0 0 12 21.7Z" />
      <path fill="#FBBC05" d="M6.53 13.82a5.85 5.85 0 0 1 0-3.64V7.65H3.29a9.73 9.73 0 0 0 0 8.7l3.24-2.53Z" />
      <path fill="#EA4335" d="M12 6.15c1.43 0 2.72.49 3.73 1.46l2.8-2.8C16.84 3.25 14.63 2.3 12 2.3a9.73 9.73 0 0 0-8.71 5.35l3.24 2.53C7.3 7.87 9.46 6.15 12 6.15Z" />
    </svg>
  );
}

export function AuthModal({ open, initialMode, prefillEmail = '', busy, error, onClose, onGoogle, onSubmit }: AuthModalProps) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    setMode(initialMode);
    setName('');
    setEmail(prefillEmail);
    setPassword('');
    setConfirm('');
  }, [initialMode, open, prefillEmail]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const signup = mode === 'signup';
  const mismatch = signup && confirm.length > 0 && password !== confirm;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (signup && password !== confirm) return;
    onSubmit({ name: signup ? name.trim() : undefined, email: email.trim(), password }, mode);
  }

  return (
    <div className="auth-modal open" role="dialog" aria-modal="true" aria-labelledby="authTitle">
      <div className="auth-backdrop" onClick={onClose} />
      <section className="auth-card">
        <button className="auth-close glow-control" type="button" onClick={onClose} aria-label="Close authentication">×</button>
        <div className="auth-heading">
          <span className="home-eyebrow">FXRKENART / IMAGE STUDIO</span>
          <h2 id="authTitle">{signup ? 'Create your account' : 'Welcome back'}</h2>
          <p>{signup ? 'Start creating in your private image workspace.' : 'Sign in to continue to your workspace.'}</p>
        </div>
        <div className="auth-switch">
          <button className={`glow-control ${!signup ? 'active' : ''}`} type="button" onClick={() => setMode('login')}>Log in</button>
          <button className={`glow-control ${signup ? 'active' : ''}`} type="button" onClick={() => setMode('signup')}>Sign up</button>
        </div>
        <button className="auth-google-button glow-control" type="button" onClick={onGoogle}>
          <GoogleMark />
          <span>Continue with Google</span>
        </button>
        <div className="auth-divider"><span /> <small>OR CONTINUE WITH EMAIL</small> <span /></div>
        <form id="authForm" onSubmit={submit}>
          {signup && <label>Name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your name" required /></label>}
          <label>{signup ? 'Email' : 'Email or admin username'}<input value={email} onChange={(event) => setEmail(event.target.value)} type={signup ? 'email' : 'text'} autoComplete={signup ? 'email' : 'username'} placeholder={signup ? 'you@example.com' : 'you@example.com or admin'} required /></label>
          <label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 8 : undefined} placeholder={signup ? 'At least 8 characters' : 'Your password'} required /></label>
          {signup && <label>Confirm password<input value={confirm} onChange={(event) => setConfirm(event.target.value)} type="password" autoComplete="new-password" placeholder="Repeat password" required /></label>}
          {(error || mismatch) && <div className="auth-message">{error || 'Passwords do not match.'}</div>}
          <button className="auth-submit glow-control" type="submit" disabled={busy}>{busy ? 'Connecting…' : signup ? 'Create account' : 'Log in'} <span>↗</span></button>
        </form>
        <small className="auth-legal">Your images and references stay private to your account.</small>
      </section>
    </div>
  );
}
