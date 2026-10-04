import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
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
  const dragDepth = useRef(0);
  const [tagOpen, setTagOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dragging, setDragging] = useState(false);
  const tagPanelRef = useRef<HTMLDivElement>(null);
  const filtered = references.filter((item) => item.name.toLowerCase().includes(query.toLowerCase().trim()));

  useEffect(() => {
    function closeTagPanel(event: PointerEvent) {
      if (tagPanelRef.current && !tagPanelRef.current.contains(event.target as Node)) setTagOpen(false);
    }
    document.addEventListener('pointerdown', closeTagPanel);
    return () => document.removeEventListener('pointerdown', closeTagPanel);
  }, []);

  function openTagPanel() {
    setQuery('');
    setTagOpen(true);
  }

  function handlePrompt(value: string) {
    onPrompt(value);
    const cursor = value.length;
    if (value[cursor - 1] === '@') openTagPanel();
  }

  function handleFiles(files: FileList | File[]) {
    const images = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (images.length) onUpload(images);
    setTagOpen(false);
  }

  function clipboardImages(event: ClipboardEvent<HTMLElement>) {
    const items = Array.from(event.clipboardData?.items || []);
    const files = items
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item, index) => {
        const file = item.getAsFile();
        if (!file) return null;
        const extension = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
        return new File([file], `pasted-reference-${Date.now()}-${index}.${extension}`, { type: file.type });
      })
      .filter((file): file is File => Boolean(file));
    if (!files.length) return;
    event.preventDefault();
    handleFiles(files);
  }

  function handleDragEnter(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (!dragDepth.current) setDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  async function pasteFromClipboard() {
    if (!navigator.clipboard?.read) return;
    try {
      const clipboardItems = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of clipboardItems) {
        const mimeType = item.types.find((type) => type.startsWith('image/'));
        if (!mimeType) continue;
        const blob = await item.getType(mimeType);
        const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
        files.push(new File([blob], `pasted-reference-${Date.now()}-${files.length}.${extension}`, { type: mimeType }));
      }
      if (files.length) handleFiles(files);
    } catch {
      // Browsers can reject clipboard.read without a user gesture or permission.
      // Ctrl+V through the prompt's paste handler remains the reliable path.
    }
  }

  return (
    <section className={`prompt-card ${dragging ? 'is-dragging' : ''}`} onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onPaste={clipboardImages}>
      <div className="prompt-heading"><strong>Describe your image</strong><button type="button" className="prompt-reference-button glow-control" onClick={openTagPanel} aria-label="Tag reference">@</button></div>
      <textarea id="promptInput" value={prompt} onChange={(event) => handlePrompt(event.target.value)} onKeyDown={(event) => { if (event.key === '@') openTagPanel(); }} placeholder="Describe your image" spellCheck={false} aria-label="Describe your image" />
      <button type="button" className="visual-reference-drop glow-control" onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); event.currentTarget.classList.add('dragging'); }} onDragLeave={(event) => { event.stopPropagation(); event.currentTarget.classList.remove('dragging'); }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); event.currentTarget.classList.remove('dragging'); handleFiles(event.dataTransfer.files); }}>
        <div className="reference-stack"><span /><span /><span /></div>
        <div><strong>{dragging ? 'Drop images to add references' : 'Add visual references'}</strong><small>Optional · up to 14 images</small><em>JPEG/PNG/WEBP, 20 MB max</em></div>
        <b>{references.length}/14</b>
      </button>
      <div className="uploaded-reference-grid">
        {references.map((item) => <figure className={`ref-thumb ${item.uploadState || ''}`} key={item.id} aria-busy={item.uploadState === 'uploading'}>
          <img src={item.url} alt={item.name} title={item.uploadError || item.name} />
          <button type="button" onClick={() => onRemoveReference(item.id)} aria-label={`Remove ${item.name}`}>×</button>
        </figure>)}
      </div>
      {chips.length > 0 && <div className="prompt-chip-row">{chips.map((chip) => <span className="prompt-chip" key={chip}>@{chip}</span>)}</div>}
      <div className="prompt-footer">
        <div className="prompt-tools"><button type="button" className="glow-control" onClick={() => inputRef.current?.click()} aria-label="Add image" title="Upload image">⌁</button><button type="button" className="glow-control" onClick={() => void pasteFromClipboard()} aria-label="Paste image from clipboard" title="Paste image from clipboard">▣</button><button type="button" className="glow-control" onClick={() => onPrompt('')} aria-label="Clear prompt" title="Clear prompt">♲</button></div>
        <label className="polish-toggle"><span>Auto Polish</span><input type="checkbox" checked={autoPolish} onChange={(event) => onAutoPolish(event.target.checked)} /><i /></label>
      </div>
      {tagOpen && <div ref={tagPanelRef} className="tag-panel open">
        <div className="tag-panel-head"><span className="tag-symbol">@</span><strong>References</strong><button type="button" onClick={() => setTagOpen(false)} aria-label="Close references">×</button></div>
        <div className="tag-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search uploaded images" autoFocus /></div>
        {references.length === 0 ? <div className="reference-empty"><strong>No references yet</strong><button type="button" onClick={() => inputRef.current?.click()}>＋ Add image</button></div> : <div className="reference-list">{filtered.map((item) => <article className="reference-item" key={item.id}><img src={item.url} alt={item.name} /><div className="reference-item-info"><span title={item.name}>{item.name}</span><button type="button" onClick={() => { onTag(item); setTagOpen(false); }}>Tag</button></div></article>)}</div>}
        <button type="button" className="tag-add-button" onClick={() => inputRef.current?.click()}>＋ Add image</button>
      </div>}
      <input ref={inputRef} className="visually-hidden" type="file" accept="image/*" multiple onChange={(event) => { if (event.target.files) handleFiles(event.target.files); event.target.value = ''; }} />
    </section>
  );
}
