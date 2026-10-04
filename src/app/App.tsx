import { useCallback, useEffect, useMemo, useState } from 'react';
import { HomeScreen } from '../components/HomeScreen';
import { AuthModal } from '../components/auth/AuthModal';
import { StudioShell } from '../components/studio/StudioShell';
import { UpgradeModal } from '../components/billing/UpgradeModal';
import { authenticate, createGeneration, getAccount, getGeneration, getLibrary, getSession, googleAuthUrl, logout, uploadReference } from '../lib/api';
import { generationCost, type AspectRatio, type GalleryResult, type GenerationResult, type HistoryEntry, type ModelName, type Quality, type ReferenceAsset, type Resolution, type User } from '../lib/types';

const initialModel: ModelName = 'Nano Banana PRO';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [model, setModel] = useState<ModelName>(initialModel);
  const [quality, setQuality] = useState<Quality>('Medium');
  const [resolution, setResolution] = useState<Resolution>('2K');
  const [ratio, setRatio] = useState<AspectRatio>('4:5');
  const [count, setCount] = useState(1);
  const [prompt, setPrompt] = useState('');
  const [autoPolish, setAutoPolish] = useState(true);
  const [references, setReferences] = useState<ReferenceAsset[]>([]);
  const [chips, setChips] = useState<string[]>([]);
  const [results, setResults] = useState<GalleryResult[]>([]);
  const [credits, setCredits] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [status, setStatusText] = useState('');
  const [statusKind, setStatusKind] = useState('');
  const [modelOpen, setModelOpen] = useState(false);
  const [outputOpen, setOutputOpen] = useState(false);
  const [viewerResult, setViewerResult] = useState<GalleryResult | null>(null);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  function setStatus(message: string, kind = '') {
    setStatusText(message);
    setStatusKind(kind);
  }

  const refreshAccount = useCallback(async () => {
    const account = await getAccount();
    setCredits(account.credits);
    setHistory(account.history);
  }, []);

  const refreshLibrary = useCallback(async () => {
    const library = await getLibrary();
    setResults(library);
  }, []);

  useEffect(() => {
    getSession().then(async (session) => {
      if (!session.authenticated || !session.user) return;
      setUser(session.user);
      await Promise.all([refreshAccount(), refreshLibrary()]).catch(() => undefined);
    }).catch(() => undefined);
  }, [refreshAccount, refreshLibrary]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authErrorFromRedirect = params.get('auth_error');
    if (!authErrorFromRedirect) return;
    const messages: Record<string, string> = {
      google_not_configured: 'Google sign-in is not configured on the server yet.',
      google_state: 'Google sign-in expired. Please try again.',
      google_failed: 'Google sign-in could not be completed. Please try again.',
    };
    setAuthError(messages[authErrorFromRedirect] || 'Sign-in could not be completed.');
    setAuthMode('login');
    setAuthOpen(true);
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  function openAuth(mode: 'login' | 'signup', email = '') {
    setAuthMode(mode);
    setAuthEmail(email);
    setAuthError('');
    setAuthOpen(true);
  }

  function handleEmailContinue(email: string) {
    openAuth('signup', email);
  }

  function handleGoogleAuth() {
    window.location.assign(googleAuthUrl());
  }

  async function handleAuth(values: { name?: string; email: string; password: string }, mode: 'login' | 'signup') {
    setAuthBusy(true);
    setAuthError('');
    try {
      const response = await authenticate(mode, values);
      setUser(response.user);
      setAuthOpen(false);
      await Promise.all([refreshAccount(), refreshLibrary()]);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not connect to the API.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    await logout().catch(() => undefined);
    setUser(null);
    setResults([]);
    setReferences([]);
    setHistory([]);
    setCredits(0);
  }

  async function handleUpload(files: FileList | File[]) {
    const selected = Array.from(files).filter((file) => file.type.startsWith('image/')).slice(0, 14 - references.length);
    for (const file of selected) {
      const localId = `local-${crypto.randomUUID()}`;
      const preview: ReferenceAsset = { id: localId, name: file.name, url: URL.createObjectURL(file), size: file.size, mimeType: file.type, uploadState: 'uploading' };
      setReferences((current) => [...current, preview]);
      try {
        const uploaded = await uploadReference(file);
        setReferences((current) => current.map((item) => item.id === localId ? { ...uploaded, name: file.name, size: file.size, mimeType: file.type, uploadState: 'uploaded' } : item));
        URL.revokeObjectURL(preview.url);
      } catch (error) {
        setReferences((current) => current.map((item) => item.id === localId ? { ...item, uploadState: 'failed', uploadError: error instanceof Error ? error.message : 'Upload failed' } : item));
      }
    }
  }

  function removeReference(id: string) {
    setReferences((current) => current.filter((item) => item.id !== id));
  }

  function tagReference(reference: ReferenceAsset) {
    setPrompt((current) => `${current}${current && !current.endsWith(' ') ? ' ' : ''}@${reference.name} `);
    setChips((current) => current.includes(reference.name) ? current : [...current, reference.name]);
  }

  async function pollJob(jobId: string, pendingId: string) {
    for (let attempt = 0; attempt < 180; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 2000));
      try {
        const job = await getGeneration(jobId);
        setCredits(job.balance);
        if (job.status === 'completed') {
          setResults((current) => [...(job.images || []), ...current.filter((result) => result.id !== pendingId)]);
          setStatus('Generation complete.', 'success');
          setGenerating(false);
          await Promise.all([refreshAccount(), refreshLibrary()]);
          return;
        }
        if (['failed', 'canceled', 'nsfw'].includes(job.status)) {
          setResults((current) => [{ id: pendingId, error: job.error || `Generation ${job.status}.` }, ...current.filter((result) => result.id !== pendingId)]);
          setStatus(job.error || `Generation ${job.status}.`, 'error');
          setGenerating(false);
          await refreshAccount();
          return;
        }
        setStatus(job.status === 'processing' ? 'Rendering your image…' : 'Preparing generation…', 'loading');
      } catch {
        setStatus('Waiting for the generation service…', 'loading');
      }
    }
    setResults((current) => current.filter((result) => result.id !== pendingId));
    setStatus('Generation timed out. Check the provider dashboard before retrying.', 'error');
    setGenerating(false);
  }

  async function startGeneration() {
    if (generating) return;
    if (!prompt.trim()) { setStatus('Describe the image you want to create first.', 'error'); return; }
    if (references.some((item) => item.uploadState === 'uploading')) { setStatus('Wait for the reference upload to finish.', 'error'); return; }
    if (references.some((item) => item.uploadState === 'failed')) { setStatus('Remove the failed reference or upload it again.', 'error'); return; }
    const cost = generationCost(model, quality, resolution, count);
    if (credits < cost) { setStatus(`You need ${cost - credits} more credits.`, 'error'); setUpgradeOpen(true); return; }
    setGenerating(true);
    setStatus('Preparing generation…', 'loading');
    const pendingId = `pending-${crypto.randomUUID()}`;
    setResults((current) => [{ id: pendingId, pending: true, model, jobId: pendingId }, ...current]);
    try {
      const response = await createGeneration({ prompt: prompt.trim(), model, quality, resolution, count, aspectRatio: ratio, autoPolish, referenceIds: references.map((item) => item.id), clientRequestId: crypto.randomUUID() });
      setCredits(response.balance);
      await pollJob(response.jobId, pendingId);
    } catch (error) {
      setResults((current) => current.filter((result) => result.id !== pendingId));
      setStatus(error instanceof Error ? error.message : 'Generation failed.', 'error');
      setGenerating(false);
      await refreshAccount().catch(() => undefined);
    }
  }

  async function useResultAsReference(result: GenerationResult) {
    try {
      const response = await fetch(result.url);
      const blob = await response.blob();
      const file = new File([blob], `generated-${result.id}.png`, { type: blob.type || 'image/png' });
      await handleUpload([file]);
      setViewerResult(null);
      setStatus('Generated image added to your references.', 'success');
    } catch {
      setStatus('Could not add this image as a reference.', 'error');
    }
  }

  const selectedViewerResult = useMemo(() => viewerResult && 'url' in viewerResult ? viewerResult : null, [viewerResult]);

  if (!user) return <><HomeScreen onLogin={() => openAuth('login')} onSignup={() => openAuth('signup')} onEmailContinue={handleEmailContinue} onGoogle={handleGoogleAuth} /><AuthModal open={authOpen} initialMode={authMode} prefillEmail={authEmail} busy={authBusy} error={authError} onClose={() => setAuthOpen(false)} onGoogle={handleGoogleAuth} onSubmit={handleAuth} /></>;

  return <><StudioShell user={user} model={model} quality={quality} resolution={resolution} ratio={ratio} count={count} prompt={prompt} autoPolish={autoPolish} references={references} chips={chips} results={results} credits={credits} history={history} status={status} statusKind={statusKind} modelOpen={modelOpen} outputOpen={outputOpen} viewerResult={selectedViewerResult} creditsOpen={creditsOpen} onLogout={handleLogout} onModelOpen={() => { setModelOpen((value) => !value); setOutputOpen(false); }} onModel={(value) => { setModel(value); setModelOpen(false); }} onOutputOpen={() => { setOutputOpen((value) => !value); setModelOpen(false); }} onRatio={setRatio} onQuality={setQuality} onResolution={setResolution} onPrompt={setPrompt} onAutoPolish={setAutoPolish} onUpload={handleUpload} onRemoveReference={removeReference} onTag={tagReference} onCount={setCount} onGenerate={startGeneration} onClear={() => setResults([])} onOpenViewer={setViewerResult} onCloseViewer={() => setViewerResult(null)} onUseReference={useResultAsReference} onOpenCredits={() => setCreditsOpen(true)} onCloseCredits={() => setCreditsOpen(false)} onUpgrade={() => setUpgradeOpen(true)} /><UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} onSelect={(label) => setStatus(`${label} selected. Payment gateway will be connected before public launch.`, 'success')} /></>;
}
