import { useEffect, useState } from 'react';

interface AuthModalProps {
  open: boolean;
  initialMode: 'login' | 'signup';
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (values: { name?: string; email: string; password: string }, mode: 'login' | 'signup') => void;
}

export function AuthModal({ open, initialMode, busy, error, onClose, onSubmit }: AuthModalProps) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    setMode(initialMode);
    setName('');
    setEmail('');
    setPassword('');
    setConfirm('');
  }, [initialMode, open]);

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
        <button className="auth-close glow-control" onClick={onClose} aria-label="Close authentication">×</button>
        <div className="auth-heading">
          <span className="home-eyebrow">FXRKENART AI</span>
          <h2 id="authTitle">{signup ? 'Create your workspace' : 'Welcome back'}</h2>
          <p>{signup ? 'Create an account to start generating.' : 'Sign in to continue to your workspace.'}</p>
        </div>
        <div className="auth-switch">
          <button className={`glow-control ${!signup ? 'active' : ''}`} onClick={() => setMode('login')}>Login</button>
          <button className={`glow-control ${signup ? 'active' : ''}`} onClick={() => setMode('signup')}>Sign Up</button>
        </div>
        <form id="authForm" onSubmit={submit}>
          {signup && <label>Name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your name" required /></label>}
          <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="you@example.com" required /></label>
          <label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={signup ? 'new-password' : 'current-password'} minLength={8} placeholder="At least 8 characters" required /></label>
          {signup && <label>Confirm password<input value={confirm} onChange={(event) => setConfirm(event.target.value)} type="password" autoComplete="new-password" placeholder="Repeat password" required /></label>}
          {(error || mismatch) && <div className="auth-message">{error || 'Passwords do not match.'}</div>}
          <button className="auth-submit glow-control" type="submit" disabled={busy}>{busy ? 'Connecting…' : signup ? 'Create account' : 'Login'} <span>↗</span></button>
        </form>
        <small className="auth-legal">Your provider key stays server-side. Images belong to your account.</small>
      </section>
    </div>
  );
}
