interface HomeScreenProps {
  onLogin: () => void;
  onSignup: () => void;
}

export function HomeScreen({ onLogin, onSignup }: HomeScreenProps) {
  return (
    <div className="home-screen">
      <header className="home-header">
        <a className="home-brand" href="#home" aria-label="FXRKENART home">
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
          <span>Private creative workspace</span>
          <b>FXRKENART AI</b>
          <time>Provider-backed generation</time>
        </div>

        <section className="home-hero-frame">
          <div className="home-stars" />
          <div className="home-nebula" />
          <div className="home-orbit orbit-one" />
          <div className="home-orbit orbit-two" />
          <div className="home-hero-copy">
            <span className="home-eyebrow">IMAGE INTELLIGENCE / 01</span>
            <h1>Create what<br /><span>you imagine.</span></h1>
            <p>Turn an idea, mood or visual reference into a high-quality image with a private workspace built for creators.</p>
            <div className="home-hero-actions">
              <button className="home-primary glow-control" onClick={onSignup}>Start creating <span>↗</span></button>
              <button className="home-secondary glow-control" onClick={onLogin}>Explore workspace</button>
            </div>
          </div>
          <div className="home-metric metric-one"><strong>02</strong><span>creative<br />models</span></div>
          <div className="home-metric metric-two"><strong>∞</strong><span>your ideas<br />stored safely</span></div>
        </section>

        <div className="home-bottom-row" id="features">
          <span>Text to image</span>
          <span>Visual references</span>
          <span>Private history</span>
          <span>Server-side credits</span>
          <span>Cloud-ready</span>
        </div>
      </main>
    </div>
  );
}
