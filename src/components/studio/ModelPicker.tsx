import { MODEL_META, type ModelName } from '../../lib/types';

interface ModelPickerProps {
  value: ModelName;
  open: boolean;
  onToggle: () => void;
  onChange: (model: ModelName) => void;
}

export function ModelPicker({ value, open, onToggle, onChange }: ModelPickerProps) {
  const meta = MODEL_META[value];
  return (
    <>
      <button className="model-row glow-control" onClick={onToggle}>
        <span className="model-provider">{meta.mark}</span>
        <span className="model-copy"><small>Model</small><strong>{value}</strong></span>
        <span className="row-chevron">›</span>
      </button>
      {open && <div className="model-popover open">
        <div className="model-popover-head"><strong>Models</strong><small>2 available</small></div>
        <div className="model-featured-grid">
          {(Object.keys(MODEL_META) as ModelName[]).map((model) => <button key={`featured-${model}`} className={`model-featured glow-control ${model === value ? 'selected' : ''}`} onClick={() => onChange(model)}><span className={`model-featured-art model-art-${model === 'Nano Banana PRO' ? 'nano' : 'gpt'}`}><b>{MODEL_META[model].mark}</b></span><strong>{model}</strong><small>{model === value ? 'Selected' : 'Use model'}</small></button>)}
        </div>
        <div className="model-search">⌕ <span>Search models...</span></div>
        <div className="model-list-heading"><span>All models</span><small>FXRKENART</small></div>
        {(Object.keys(MODEL_META) as ModelName[]).map((model) => (
          <button key={model} className={`glow-control ${model === value ? 'selected' : ''}`} onClick={() => onChange(model)}>
            <b>{MODEL_META[model].mark}</b>
            <span><strong>{model}</strong><small>{MODEL_META[model].description}</small></span>
          </button>
        ))}
      </div>}
    </>
  );
}
