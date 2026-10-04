import type { GenerationResult } from '../../lib/types';

interface ImageViewerProps {
  result: GenerationResult | null;
  onClose: () => void;
  onUseAsReference: (result: GenerationResult) => void;
}

export function ImageViewer({ result, onClose, onUseAsReference }: ImageViewerProps) {
  if (!result) return null;
  return (
    <div className="image-viewer open" role="dialog" aria-modal="true">
      <div className="viewer-backdrop" onClick={onClose} />
      <div className="viewer-shell">
        <button className="viewer-close glow-control" onClick={onClose} aria-label="Close preview">×</button>
        <div className="viewer-media"><img src={result.url} alt="Generated image preview" /></div>
        <aside className="viewer-details">
          <div className="details-kicker">ⓘ DETAILS</div>
          <dl><div><dt>Source</dt><dd>FXRKENART Studio</dd></div><div><dt>Type</dt><dd>Generated Image</dd></div><div><dt>Format</dt><dd>PNG</dd></div><div><dt>Model</dt><dd>{result.model}</dd></div></dl>
          <div className="viewer-actions"><button className="animate-button glow-control" disabled>▣ Animate</button><div><button className="glow-control" onClick={() => window.open(result.url, '_blank', 'noopener')}>▦ Open in</button><button className="glow-control" onClick={() => onUseAsReference(result)}>♧ Reference</button></div></div>
        </aside>
      </div>
    </div>
  );
}
