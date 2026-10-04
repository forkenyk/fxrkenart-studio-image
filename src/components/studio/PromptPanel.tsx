import { useRef, useState } from 'react';
import type { ReferenceAsset } from '../../lib/types';

interface PromptPanelProps {
  prompt: string;
  references: ReferenceAsset[];
  chips: string[];
  autoPolish: boolean;
  onPrompt: (value: string) => void;
  onAutoPolish: (value: boolean) => void;
  onUpload: (files: FileList | File[]) => void;
  onRemoveReference: (id: string) => void;
  onTag: (reference: ReferenceAsset) => void;
}

export function PromptPanel({ prompt, references, chips, autoPolish, onPrompt, onAutoPolish, onUpload, onRemoveReference, onTag }: PromptPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tagOpen, setTagOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = references.filter((item) => item.name.toLowerCase().includes(query.toLowerCase().trim()));

  function handlePrompt(value: string) {
    onPrompt(value);
    const cursor = value.length;
    if (value[cursor - 1] === '@') setTagOpen(true);
  }

  function handleFiles(files: FileList | File[]) {
    onUpload(files);
    setTagOpen(false);
  }

  return (
    <section className="prompt-card">
      <div className="prompt-heading"><strong>Describe your image</strong><button className="prompt-reference-button glow-control" onClick={() => setTagOpen(true)} aria-label="Tag reference">@</button></div>
      <textarea id="promptInput" value={prompt} onChange={(event) => handlePrompt(event.target.value)} onKeyDown={(event) => { if (event.key === '@') setTagOpen(true); }} placeholder="Describe your image" spellCheck={false} />
      <button className="visual-reference-drop glow-control" onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add('dragging'); }} onDragLeave={(event) => event.currentTarget.classList.remove('dragging')} onDrop={(event) => { event.preventDefault(); event.currentTarget.classList.remove('dragging'); handleFiles(event.dataTransfer.files); }}>
        <div className="reference-stack"><span /><span /><span /></div>
        <div><strong>Add visual references</strong><small>Optional</small><em>JPEG/PNG/WEBP, 20 MB max</em></div>
        <b>{references.length}/14</b>
      </button>
      <div className="uploaded-reference-grid">
        {references.map((item) => <figure className={`ref-thumb ${item.uploadState === 'failed' ? 'failed' : ''}`} key={item.id}>
          <img src={item.url} alt={item.name} title={item.uploadError || item.name} />
          <button onClick={() => onRemoveReference(item.id)} aria-label={`Remove ${item.name}`}>×</button>
        </figure>)}
      </div>
      {chips.length > 0 && <div className="prompt-chip-row">{chips.map((chip) => <span className="prompt-chip" key={chip}>@{chip}</span>)}</div>}
      <div className="prompt-footer">
        <div className="prompt-tools"><button className="glow-control" onClick={() => inputRef.current?.click()} aria-label="Add image">⌁</button><button className="glow-control" onClick={() => onPrompt('')} aria-label="Clear prompt">♲</button></div>
        <label className="polish-toggle"><span>Auto Polish</span><input type="checkbox" checked={autoPolish} onChange={(event) => onAutoPolish(event.target.checked)} /><i /></label>
      </div>
      {tagOpen && <div className="tag-panel open">
        <div className="tag-panel-head"><span className="tag-symbol">@</span><strong>References</strong><button onClick={() => setTagOpen(false)} aria-label="Close references">×</button></div>
        <div className="tag-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search uploaded images" autoFocus /></div>
        {references.length === 0 ? <div className="reference-empty"><strong>No references yet</strong><button onClick={() => inputRef.current?.click()}>＋ Add image</button></div> : <div className="reference-list">{filtered.map((item) => <article className="reference-item" key={item.id}><img src={item.url} alt={item.name} /><div className="reference-item-info"><span title={item.name}>{item.name}</span><button onClick={() => { onTag(item); setTagOpen(false); }}>Tag</button></div></article>)}</div>}
        <button className="tag-add-button" onClick={() => inputRef.current?.click()}>＋ Add image</button>
      </div>}
      <input ref={inputRef} className="visually-hidden" type="file" accept="image/*" multiple onChange={(event) => { if (event.target.files) handleFiles(event.target.files); event.target.value = ''; }} />
    </section>
  );
}
