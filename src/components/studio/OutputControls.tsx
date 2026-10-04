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

export function OutputControls({ open, ratio, quality, resolution, onToggle, onRatio, onQuality, onResolution }: OutputControlsProps) {
  return (
    <>
      <button className="output-row glow-control" onClick={onToggle}>
        <span className="output-icon">⌗</span>
        <span><small>Output</small><strong>{ratio} | {resolution}</strong></span>
        <span className="row-chevron">›</span>
      </button>
      {open && <div className="output-popover open">
        <label><span>Aspect ratio</span><select value={ratio} onChange={(event) => onRatio(event.target.value as AspectRatio)}><option>Auto</option><option>1:1</option><option>4:5</option><option>3:4</option><option>2:3</option><option>16:9</option><option>9:16</option><option>21:9</option></select></label>
        <label><span>Quality</span><select value={quality} onChange={(event) => onQuality(event.target.value as Quality)}><option>Low</option><option>Medium</option><option>High</option></select></label>
        <label><span>Resolution</span><select value={resolution} onChange={(event) => onResolution(event.target.value as Resolution)}><option>2K</option><option>4K</option></select></label>
      </div>}
    </>
  );
}
