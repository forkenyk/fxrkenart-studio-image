import type { AspectRatio, Quality, Resolution } from '../../lib/types';

interface OutputControlsProps {
  open: boolean;
  ratio: AspectRatio;
  quality: Quality;
  resolution: Resolution;
  onToggle: () => void;
  onRatio: (value: AspectRatio) => void;
  onQuality: (value: Quality) => void;
  onResolution: (value: Resolution) => void;
}

const ratios: AspectRatio[] = ['Auto', '1:1', '4:5', '3:4', '2:3', '16:9', '9:16', '21:9'];
const qualities: Quality[] = ['Low', 'Medium', 'High'];
const resolutions: Resolution[] = ['2K', '4K'];

export function OutputControls({ open, ratio, quality, resolution, onToggle, onRatio, onQuality, onResolution }: OutputControlsProps) {
  return <div className="output-control-wrap">
    <button className="output-row glow-control" onClick={onToggle}>
      <span className="output-icon">⌗</span>
      <span><small>Output</small><strong>{ratio} <i>·</i> {resolution}</strong></span>
      <span className="row-chevron">›</span>
    </button>
    {open && <div className="output-popover open">
      <div className="output-popover-head"><strong>Output</strong><small>Choose how the image is rendered</small></div>
      <div className="output-section"><span className="output-label">Aspect ratio</span><div className="ratio-grid">{ratios.map((item) => <button key={item} className={`output-chip glow-control ${ratio === item ? 'selected' : ''}`} onClick={() => onRatio(item)}>{item}</button>)}</div></div>
      <div className="output-section"><span className="output-label">Resolution</span><div className="output-chip-row">{resolutions.map((item) => <button key={item} className={`output-chip glow-control ${resolution === item ? 'selected' : ''}`} onClick={() => onResolution(item)}>{item}</button>)}</div></div>
      <div className="output-section"><span className="output-label">Quality</span><div className="quality-grid">{qualities.map((item) => <button key={item} className={`quality-option glow-control ${quality === item ? 'selected' : ''}`} onClick={() => onQuality(item)}><strong>{item}</strong><small>{item === 'High' ? 'Best detail' : item === 'Medium' ? 'Balanced' : 'Fast draft'}</small></button>)}</div></div>
    </div>}
  </div>;
}
