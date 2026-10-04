import type { GalleryResult } from '../../lib/types';

interface GenerationGalleryProps {
  results: GalleryResult[];
  status?: string;
  onOpen: (result: GalleryResult) => void;
  onClear: () => void;
}

const loaderDots = Array.from({ length: 14 * 18 }, (_, index) => index);

export function GenerationGallery({ results, status = '', onOpen, onClear }: GenerationGalleryProps) {
  const loaderLabel = status.toLowerCase().includes('render') ? 'Rendering the first draft' : 'Making the first draft';
  return (
    <>
      <section className={`empty-canvas ${results.length ? 'has-results' : ''}`}>
        <div className="empty-state"><div className="empty-state-icon">◈</div><h1>Empty, for now</h1><p>Your first creation changes that.</p></div>
      </section>
      <section className={`result-board ${results.length ? 'has-results' : ''}`} aria-live="polite">
        <div className="result-board-head"><div><strong>Your creations</strong><span>{results.length} {results.length === 1 ? 'result' : 'results'}</span></div><button className="glow-control" onClick={onClear}>Clear</button></div>
        <div className="result-grid">
          {results.map((result) => {
            if ('pending' in result && result.pending) return <article className="result-tile is-pending reference-loader-card" key={result.id} aria-label="Generating image"><div className="reference-loader"><div className="reference-loader-head"><strong>{loaderLabel}</strong><span className="reference-loader-ring" aria-hidden="true">↻</span></div><div className="loader-matrix" aria-hidden="true">{loaderDots.map((dot) => <i key={dot} style={{ '--dot-index': dot } as React.CSSProperties} />)}</div><div className="reference-loader-foot"><span>{result.model}</span><span className="loader-pulse"><i /> Working</span></div></div></article>;
            if ('error' in result) return <article className="result-tile is-failed" key={result.id}><strong>Generation failed</strong><br />{result.error}</article>;
            if (!('url' in result)) return null;
            return <article className="result-tile glow-control" key={result.id} onClick={() => onOpen(result)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') onOpen(result); }}><img src={result.url} alt="Generated result" /><span className="tile-shine" /><div className="tile-meta"><span>{result.model}</span><span>Open</span></div></article>;
          })}
        </div>
      </section>
    </>
  );
}
