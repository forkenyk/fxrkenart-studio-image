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
  const { user, model, quality, resolution, ratio, count, prompt, autoPolish, references, chips, results, credits, history, status, statusKind, modelOpen, outputOpen, viewerResult, creditsOpen } = props;
  const cost = generationCost(model, quality, resolution, count);
  const vnd = (cost * 100).toLocaleString('vi-VN');

  return <div className="app-shell">
    <header className="app-header"><div className="workspace-identity"><span className="workspace-avatar">F</span><div><small>FXRKENART</small><strong>Image studio</strong></div></div><div className="breadcrumb"><span>Workspace</span><span>/</span><strong>Image</strong></div><div className="header-actions"><div className="credit-wallet"><span className="credit-diamond">◈</span><strong>{credits}</strong><button className="upgrade-button glow-control" onClick={props.onUpgrade}>Upgrade</button></div><button className="profile-button glow-control" onClick={(event) => { const menu = event.currentTarget.nextElementSibling; menu?.classList.toggle('open'); }}>F</button><div className="profile-menu"><div className="account-head"><span className="profile-menu-avatar">F</span><div><strong>{user.name || 'FXRKENART creator'}</strong><small>{user.email}</small></div></div><button onClick={props.onOpenCredits}>◈ <span>Credits History</span></button><button onClick={props.onUpgrade}>▣ <span>Subscriptions</span></button><hr /><button onClick={props.onLogout}>↪ <span>Sign Out</span></button></div></div></header>
    <div className="workspace-grid"><aside className="tool-panel"><nav className="media-tabs"><div><small>CREATE / 01</small><strong>New image</strong></div><span>⌘ K</span></nav><ModelPicker value={model} open={modelOpen} onToggle={props.onModelOpen} onChange={props.onModel} /><PromptPanel prompt={prompt} references={references} chips={chips} autoPolish={autoPolish} onPrompt={props.onPrompt} onAutoPolish={props.onAutoPolish} onUpload={props.onUpload} onRemoveReference={props.onRemoveReference} onTag={props.onTag} /><OutputControls open={outputOpen} ratio={ratio} quality={quality} resolution={resolution} onToggle={props.onOutputOpen} onRatio={props.onRatio} onQuality={props.onQuality} onResolution={props.onResolution} /><div className="tool-footer"><div className="quantity-control"><button className="glow-control" onClick={() => props.onCount(Math.max(1, count - 1))}>−</button><strong>{count}/4</strong><button className="glow-control" onClick={() => props.onCount(Math.min(4, count + 1))}>+</button></div><button className="generate-button glow-control" onClick={props.onGenerate}><span>Generate</span><small>✦ <b>{cost} · {vnd}₫</b></small></button></div></aside><main className="creation-area"><div className="creation-toolbar"><strong className="toolbar-title">Image library</strong><div className="toolbar-spacer" /><span className="workspace-mode"><i /> Private archive</span></div><div className="retention-banner"><span>◌</span><span>Only you can see the work made here.</span><button id="unlockButton" className="glow-control" onClick={props.onUpgrade}>Upgrade</button></div><GenerationGallery results={results} onOpen={props.onOpenViewer} onClear={props.onClear} />{status && <div className="generation-status" data-state={statusKind}><span className={statusKind === 'loading' ? 'status-spinner' : ''} />{status}</div>}</main></div>
    <ImageViewer result={viewerResult && 'url' in viewerResult ? viewerResult : null} onClose={props.onCloseViewer} onUseAsReference={props.onUseReference} /><CreditsModal open={creditsOpen} credits={credits} history={history} onClose={props.onCloseCredits} onUpgrade={props.onUpgrade} />
  </div>;
}
