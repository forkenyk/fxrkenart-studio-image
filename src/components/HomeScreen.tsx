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
    <div className="home-screen secure-home nexus-home">
      <div className="nexus-background" aria-hidden="true" />
      <header className="home-header nexus-header">
        <a className="home-brand nexus-brand" href="/" aria-label="FXRKENART home">
          <span className="brand-mark"><img src="/assets/fxrken-logo-transparent.png" alt="" /></span>
          <span>FXRKENART</span>
        </a>
        <nav className="secure-nav nexus-nav" aria-label="Main navigation">
          <a href="#studio">Studio</a>
          <a href="#models">Models</a>
          <a href="#pricing">Pricing</a>
          <a href="#about">About</a>
        </nav>
        <div className="home-auth-actions nexus-auth-actions">
          <button className="home-login glow-control" onClick={onLogin}>Log in</button>
          <button className="home-signup glow-control" onClick={onSignup}>Sign up <span>↗</span></button>
        </div>
      </header>

      <main className="secure-home-main nexus-main" id="studio">
        <section className="nexus-hero">
          <div className="nexus-pill"><span>✦</span> Private image generation for visual work</div>
          <h1>Make something<br />that feels <em>yours.</em></h1>
          <p>Turn ideas, references and rough direction into images with a focused studio built for your visual language.</p>

          <section className="home-auth-panel nexus-auth-panel" aria-label="Create or sign in to your account">
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
            <div className="home-auth-divider"><span /> <small>or</small> <span /></div>
            <button className="home-google-button glow-control" type="button" onClick={onGoogle}>
              <GoogleMark />
              <span>Continue with Google</span>
            </button>
            <small className="home-auth-note">By continuing, you agree to the studio terms and privacy policy.</small>
          </section>
          <div className="home-auth-switch">Already have an account? <button className="home-inline-link glow-control" onClick={onLogin}>Log in</button></div>
        </section>

        <section className="nexus-workspace-preview" aria-label="FXRKENART Studio preview">
          <div className="nexus-preview-topbar">
            <div className="nexus-window-dots"><i /><i /><i /></div>
            <span>FXRKENART / IMAGE STUDIO</span>
            <b>PRIVATE WORKSPACE</b>
          </div>
          <div className="nexus-preview-grid">
            <aside className="nexus-preview-sidebar">
              <div className="nexus-preview-brand"><span className="preview-logo"><img src="/assets/fxrken-logo-transparent.png" alt="" /></span><span>FXRKENART</span></div>
              <div className="nexus-preview-nav active"><span>＋</span> New image</div>
              <div className="nexus-preview-nav"><span>◌</span> Image library</div>
              <div className="nexus-preview-nav"><span>⌁</span> References</div>
              <div className="nexus-preview-sidebar-footer"><span>Models</span><strong>Soul · Nano Banana PRO</strong></div>
            </aside>
            <div className="nexus-preview-canvas">
              <div className="nexus-canvas-heading"><span>CREATE / 01</span><b>2K · 4:5</b></div>
              <div className="nexus-logo-stage">
                <div className="nexus-logo-halo" />
                <img src="/assets/fxrken-logo-transparent.png" alt="FXRKENART 3D logo" />
                <span className="nexus-stage-label">REFERENCE READY</span>
              </div>
              <div className="nexus-canvas-prompt"><span>Describe your image...</span><b>Generate <small>✦ 8.5</small></b></div>
            </div>
            <aside className="nexus-preview-controls">
              <div className="preview-control-title">Generation settings</div>
              <div className="preview-control-row"><span>Model</span><strong>Nano Banana PRO</strong></div>
              <div className="preview-control-row"><span>Quality</span><strong>High</strong></div>
              <div className="preview-control-row"><span>References</span><strong>03 images</strong></div>
              <div className="preview-credit"><span>Credits remaining</span><strong>2,480</strong></div>
            </aside>
          </div>
        </section>

        <section className="nexus-proof" id="models">
          <div><span>Built for images that need to hold up.</span><strong>SOUL <i>·</i> NANO BANANA PRO</strong></div>
          <div><span>Private by default</span><strong>YOUR LIBRARY, YOUR WORK</strong></div>
          <div><span>Output when it matters</span><strong>UP TO 4K READY</strong></div>
        </section>
      </main>

      <footer className="secure-footer nexus-footer" id="pricing">
        <span>FXRKENART / IMAGE STUDIO</span>
        <span>MAKE IT YOURS</span>
        <span>2026</span>
      </footer>
    </div>
  );
}
