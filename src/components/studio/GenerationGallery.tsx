import type { GalleryResult } from '../../lib/types';

interface GenerationGalleryProps {
  results: GalleryResult[];
  onOpen: (result: GalleryResult) => void;
  onClear: () => void;
}

export function GenerationGallery({ results, onOpen, onClear }: GenerationGalleryProps) {
  return (
    <>
      <section className={`empty-canvas ${results.length ? 'has-results' : ''}`}>
        <div className="cinema-hero"><div className="hero-kicker">IMAGE LIBRARY / EMPTY CANVAS</div><div className="hero-collage"><span className="hero-card hero-card-a" /><span className="hero-card hero-card-b" /><span className="hero-card hero-card-c" /><span className="hero-card hero-card-d" /></div><h1>MAKE THE <em>UNSEEN</em><br />VISIBLE.</h1><p>Start with a thought, a reference or a feeling. The first frame is yours to define.</p><div className="hero-rule"><span />TEXT / REFERENCE / FORM</div></div>
      </section>
      <section className={`result-board ${results.length ? 'has-results' : ''}`} aria-live="polite">
        <div className="result-board-head"><div><strong>Your creations</strong><span>{results.length} {results.length === 1 ? 'result' : 'results'}</span></div><button className="glow-control" onClick={onClear}>Clear</button></div>
        <div className="result-grid">
          {results.map((result) => {
            if ('pending' in result && result.pending) return <article className="result-tile is-pending" key={result.id}><div className="ai-loader" aria-label="Generating image"><span className="ai-loader-orbit ai-loader-orbit-a" /><span className="ai-loader-orbit ai-loader-orbit-b" /><span className="ai-loader-core">✦</span><strong>Creating</strong><small>{result.model}</small></div><div className="tile-meta"><span>Generating</span><span>AI Spiral</span></div></article>;
            if ('error' in result) return <article className="result-tile is-failed" key={result.id}><strong>Generation failed</strong><br />{result.error}</article>;
            if (!('url' in result)) return null;
            return <article className="result-tile glow-control" key={result.id} onClick={() => onOpen(result)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') onOpen(result); }}><img src={result.url} alt="Generated result" /><span className="tile-shine" /><div className="tile-meta"><span>{result.model}</span><span>Open</span></div></article>;
          })}
        </div>
      </section>
    </>
  );
}
