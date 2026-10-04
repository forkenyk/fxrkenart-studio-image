interface HomeScreenProps {
  onLogin: () => void;
  onSignup: () => void;
}

export function HomeScreen({ onLogin, onSignup }: HomeScreenProps) {
  return (
    <div className="home-screen">
      <header className="home-header">
        <a className="home-brand" href="/" aria-label="FXRKENART home">
          <span className="brand-mark">F</span>
          <span>FXRKENART</span>
        </a>
        <nav className="home-nav" aria-label="Main navigation">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#models">Models</a>
        </nav>
        <div className="home-auth-actions">
          <button className="home-login glow-control" onClick={onLogin}>Login</button>
          <button className="home-signup glow-control" onClick={onSignup}>Sign Up</button>
        </div>
      </header>

      <main className="home-main" id="home">
        <div className="home-system-status">
          <span className="status-dot" />
          <span>Private image workspace</span>
          <b>LIVE</b>
          <time>Built for visual work</time>
        </div>

        <section className="home-hero-frame">
          <div className="home-stars" />
          <div className="home-nebula" />
          <div className="home-orbit orbit-one" />
          <div className="home-orbit orbit-two" />
          <div className="home-hero-copy">
            <span className="home-eyebrow">IMAGE STUDIO / 01</span>
            <h1>Make the<br /><span>unseen visible.</span></h1>
            <p>A focused space for turning language, references and instinct into images worth keeping.</p>
            <div className="home-hero-actions">
              <button className="home-primary glow-control" onClick={onSignup}>Open the studio <span>↗</span></button>
              <button className="home-secondary glow-control" onClick={onLogin}>Sign in</button>
            </div>
          </div>
          <div className="home-hero-visual" aria-hidden="true">
            <span className="visual-caption visual-caption-top">FXR / 2026</span>
            <span className="visual-caption visual-caption-bottom">GENERATIVE IMAGE SYSTEM</span>
            <div className="visual-orbit visual-orbit-one" />
            <div className="visual-orbit visual-orbit-two" />
            <div className="visual-core"><span>F</span></div>
            <div className="visual-axis visual-axis-x" />
            <div className="visual-axis visual-axis-y" />
            <span className="visual-index">01—02</span>
          </div>
          <div className="home-metric metric-one"><strong>02</strong><span>creative<br />models</span></div>
          <div className="home-metric metric-two"><strong>∞</strong><span>your work<br />kept private</span></div>
        </section>

        <div className="home-bottom-row" id="features">
          <span>Text → image</span>
          <span>Reference aware</span>
          <span>Private library</span>
          <span>Soul / Nano Banana PRO</span>
        </div>
      </main>
    </div>
  );
}
