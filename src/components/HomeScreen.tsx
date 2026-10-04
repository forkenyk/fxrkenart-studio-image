import { useState } from 'react';

interface HomeScreenProps {
  onLogin: () => void;
  onSignup: () => void;
  onEmailContinue: (email: string) => void;
  onGoogle: () => void;
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

export function HomeScreen({ onLogin, onSignup, onEmailContinue, onGoogle }: HomeScreenProps) {
  const [email, setEmail] = useState('');

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();
    if (value) onEmailContinue(value);
  }

  return (
    <div className="home-screen home-auth-screen">
      <div className="home-grid-plane" aria-hidden="true" />
      <div className="home-vignette" aria-hidden="true" />
      <div className="home-light-orb" aria-hidden="true" />

      <header className="home-header">
        <a className="home-brand" href="/" aria-label="FXRKENART home">
          <span className="brand-mark">F</span>
          <span>FXRKENART</span>
        </a>
        <div className="home-auth-actions">
          <button className="home-login glow-control" onClick={onLogin}>Log in</button>
          <button className="home-signup glow-control" onClick={onSignup}>Sign up</button>
        </div>
      </header>

      <main className="home-auth-main" id="home">
        <div className="home-auth-kicker"><span /> IMAGE STUDIO <span /></div>
        <div className="home-auth-logo" aria-hidden="true">F</div>
        <h1>FXRKENART</h1>
        <p className="home-auth-lede">Turn an idea into an image worth keeping.</p>

        <section className="home-auth-panel" aria-label="Create or sign in to your account">
          <form className="home-email-form" onSubmit={submit}>
            <label htmlFor="home-email">Start with your email</label>
            <div className="home-email-row">
              <input
                id="home-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                required
              />
              <button className="home-email-submit glow-control" type="submit">Continue <span>↗</span></button>
            </div>
          </form>
          <div className="home-auth-divider"><span /> <small>OR</small> <span /></div>
          <button className="home-google-button glow-control" type="button" onClick={onGoogle}>
            <GoogleMark />
            <span>Continue with Google</span>
          </button>
          <small className="home-auth-note">By continuing, you agree to the studio terms and privacy policy.</small>
        </section>

        <div className="home-auth-switch">
          Already have an account? <button className="home-inline-link glow-control" onClick={onLogin}>Log in</button>
        </div>
      </main>

      <footer className="home-auth-footer">
        <span>FXR / 2026</span>
        <span>PRIVATE IMAGE WORKSPACE</span>
        <span>SOUL · NANO BANANA PRO</span>
      </footer>
    </div>
  );
}
