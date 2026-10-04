import type { AspectRatio, GalleryResult, HistoryEntry, ModelName, Quality, ReferenceAsset, Resolution, User } from '../../lib/types';
import { generationCost } from '../../lib/types';
import { ModelPicker } from './ModelPicker';
import { OutputControls } from './OutputControls';
import { PromptPanel } from './PromptPanel';
import { GenerationGallery } from './GenerationGallery';
import { ImageViewer } from './ImageViewer';
import { CreditsModal } from '../billing/CreditsModal';

interface StudioShellProps {
  user: User;
  guest?: boolean;
  model: ModelName;
  quality: Quality;
  resolution: Resolution;
  ratio: AspectRatio;
  count: number;
  prompt: string;
  autoPolish: boolean;
  references: ReferenceAsset[];
  chips: string[];
  results: GalleryResult[];
  credits: number;
  history: HistoryEntry[];
  status: string;
  statusKind: string;
  modelOpen: boolean;
  outputOpen: boolean;
  viewerResult: GalleryResult | null;
  creditsOpen: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onModelOpen: () => void;
  onModel: (value: ModelName) => void;
  onOutputOpen: () => void;
  onRatio: (value: AspectRatio) => void;
  onQuality: (value: Quality) => void;
  onResolution: (value: Resolution) => void;
  onPrompt: (value: string) => void;
  onAutoPolish: (value: boolean) => void;
  onUpload: (files: FileList | File[]) => void;
  onRemoveReference: (id: string) => void;
  onTag: (reference: ReferenceAsset) => void;
  onCount: (value: number) => void;
  onGenerate: () => void;
  onClear: () => void;
  onOpenViewer: (result: GalleryResult) => void;
  onCloseViewer: () => void;
  onUseReference: (result: GenerationResultLike) => void;
  onOpenCredits: () => void;
  onCloseCredits: () => void;
  onUpgrade: () => void;
}

type GenerationResultLike = Extract<GalleryResult, { url: string }>;

export function StudioShell(props: StudioShellProps) {
  const { user, guest = false, model, quality, resolution, ratio, count, prompt, autoPolish, references, chips, results, credits, history, status, statusKind, modelOpen, outputOpen, viewerResult, creditsOpen } = props;
  const cost = generationCost(model, quality, resolution, count);
  const vnd = (cost * 100).toLocaleString('vi-VN');

  return <div className="app-shell fx-workspace">
    <header className="app-header workspace-topbar">
      <div className="workspace-identity">
        <span className="workspace-avatar"><img src="/assets/fxrken-logo-transparent.png" alt="" /></span>
        <div><strong>FXRKENART</strong><small>Image workspace</small></div>
        <button className="workspace-switch glow-control" aria-label="Switch workspace">⌄</button>
      </div>
      <div className="topbar-context"><button className="context-pill glow-control">Image <span>⌄</span></button><span>/</span><strong>Create</strong></div>
      <div className="header-actions">
        <button className="version-pill glow-control">Previous version <span>↗</span></button>
        <button className="topbar-link glow-control">Follow us <span>⌄</span></button>
        <button className="topbar-icon glow-control" aria-label="Help">?</button>
        <button className="topbar-icon glow-control" aria-label="Settings">⌁</button>
        <div className="credit-wallet"><span className="credit-diamond">✦</span><strong>{guest ? '—' : credits}</strong><button className="upgrade-button glow-control" onClick={props.onUpgrade}>Upgrade</button></div>
        {guest ? <button className="studio-login-button glow-control" onClick={props.onLogin}>Log in <span>↗</span></button> : <><button className="profile-button glow-control" onClick={(event) => { const menu = event.currentTarget.nextElementSibling; menu?.classList.toggle('open'); }}><img src="/assets/fxrken-logo-transparent.png" alt="Open profile menu" /></button><div className="profile-menu"><div className="account-head"><span className="profile-menu-avatar"><img src="/assets/fxrken-logo-transparent.png" alt="" /></span><div><strong>{user.name || 'FXRKENART creator'}</strong><small>{user.email}</small></div></div><button onClick={props.onOpenCredits}>◈ <span>Credits History</span></button><button onClick={props.onUpgrade}>▣ <span>Subscriptions</span></button><hr /><button onClick={props.onLogout}>↪ <span>Sign Out</span></button></div></>}
      </div>
    </header>
    <div className="studio-body">
      <aside className="studio-rail" aria-label="Studio navigation">
        <button className="rail-logo glow-control" aria-label="FXRKENART"><img src="/assets/fxrken-logo-transparent.png" alt="" /></button>
        <div className="rail-group">
          <button className="rail-button active glow-control" aria-label="Create image">✦<small>Create</small></button>
          <button className="rail-button glow-control" aria-label="Image library">▧<small>Library</small></button>
          <button className="rail-button glow-control" aria-label="References">⌁<small>Assets</small></button>
          <button className="rail-button glow-control" aria-label="Tools">◌<small>Tools</small></button>
        </div>
        <div className="rail-bottom"><button className="rail-button glow-control" aria-label="Settings">⚙<small>Settings</small></button><span className="rail-status" /></div>
      </aside>
      <aside className="tool-panel studio-create-panel">
        <div className="create-panel-title"><div className="create-panel-avatar"><img src="/assets/fxrken-logo-transparent.png" alt="" /></div><div><strong>Create image</strong><small>Private workspace</small></div><button className="panel-more glow-control" aria-label="More options">•••</button></div>
        <div className="media-tabs"><button className="active glow-control">Image</button><button className="glow-control">Video</button><button className="glow-control">Audio</button><button className="glow-control">World</button></div>
        <div className="panel-field-label">Model</div>
        <ModelPicker value={model} open={modelOpen} onToggle={props.onModelOpen} onChange={props.onModel} />
        <PromptPanel prompt={prompt} references={references} chips={chips} autoPolish={autoPolish} onPrompt={props.onPrompt} onAutoPolish={props.onAutoPolish} onUpload={props.onUpload} onRemoveReference={props.onRemoveReference} onTag={props.onTag} />
        <OutputControls open={outputOpen} ratio={ratio} quality={quality} resolution={resolution} onToggle={props.onOutputOpen} onRatio={props.onRatio} onQuality={props.onQuality} onResolution={props.onResolution} />
        <div className="tool-footer"><div className="quantity-control"><button className="glow-control" onClick={() => props.onCount(Math.max(1, count - 1))}>−</button><strong>{count}/4</strong><button className="glow-control" onClick={() => props.onCount(Math.min(4, count + 1))}>+</button></div><button className="generate-button glow-control" onClick={props.onGenerate}><span>Generate</span><small>✦ <b>{cost} · {vnd}₫</b></small></button></div>
      </aside>
      <main className="creation-area studio-canvas">
        <div className="creation-toolbar canvas-toolbar"><div className="canvas-tabs"><button className="active glow-control">Unlisted <span>⌄</span></button><button className="glow-control">Labels</button><button className="glow-control">Folders</button><button className="glow-control">Templates</button></div><div className="canvas-actions"><span className="canvas-zoom">− <b>●</b> +</span><button className="topbar-icon glow-control" aria-label="Filter">⌕</button><button className="topbar-icon glow-control" aria-label="Grid view">▦</button><button className="topbar-icon glow-control" aria-label="More">•••</button></div></div>
        <div className="retention-banner"><span>◌</span><span>Your creations will be stored for 7 days.</span><button id="unlockButton" className="glow-control" onClick={props.onUpgrade}>Upgrade</button></div>
        <GenerationGallery results={results} status={status} onOpen={props.onOpenViewer} onClear={props.onClear} />
        {status && <div className="generation-status" data-state={statusKind}><span className={statusKind === 'loading' ? 'status-spinner' : ''} />{status}</div>}
      </main>
    </div>
    <ImageViewer result={viewerResult && 'url' in viewerResult ? viewerResult : null} onClose={props.onCloseViewer} onUseAsReference={props.onUseReference} /><CreditsModal open={creditsOpen} credits={credits} history={history} onClose={props.onCloseCredits} onUpgrade={props.onUpgrade} />
  </div>;
}
