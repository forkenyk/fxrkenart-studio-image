const state = { model: 'Nano Banana PRO', provider: 'google', ratio: '4:5', quality: 'Medium', resolution: '2K', count: 1, credits: 36, references: [], chips: [], history: [], results: [], isGenerating: false };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const maxReferences = 14;
const priceTable = { 'Nano Banana PRO': { Low: 45, Medium: 60, High: 80 }, Soul: { Low: 30, Medium: 42, High: 60 } };
const formatCredit = (value) => Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
const getCost = () => Number(((priceTable[state.model]?.[state.quality] || 30) * (state.resolution === '4K' ? 1 : .55) * state.count).toFixed(1));
const closeMenus = () => { $('#modelPopover').classList.remove('open'); $('#outputPopover').classList.remove('open'); $('#profileMenu').classList.remove('open'); };
const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));

function updateBalance() {
  const balance = formatCredit(state.credits);
  ['creditBalance', 'historyBalance', 'subscriptionBalance'].forEach((id) => { const element = $(`#${id}`); if (element) element.textContent = balance; });
  const progress = $('#creditProgress');
  if (progress) progress.style.width = `${Math.min(100, Math.max(0, (state.credits / 1000) * 100))}%`;
}
function updateCost() {
  const cost = getCost();
  $('#generationCost').textContent = `${formatCredit(cost)} credits`;
  $('#generationCost').title = `${Math.round(cost * 100).toLocaleString('vi-VN')} VNĐ customer credit charge`;
  $('#outputValue').textContent = `${state.ratio} | ${state.resolution}`;
}
function setGenerationStatus(message, kind = '') {
  const status = $('#generationStatus');
  status.dataset.state = kind;
  status.innerHTML = kind === 'loading' ? `<span class="status-spinner"></span>${escapeHtml(message)}` : escapeHtml(message);
}
function openUpgrade() { closeMenus(); $('#upgradeModal').classList.add('open'); $('#upgradeModal').setAttribute('aria-hidden', 'false'); }
function closeUpgrade() { $('#upgradeModal').classList.remove('open'); $('#upgradeModal').setAttribute('aria-hidden', 'true'); }
function openReferencePanel() { $('#referenceOverlay').classList.add('open'); $('#referenceOverlay').setAttribute('aria-hidden', 'false'); renderReferences(); }
function closeReferencePanel() { $('#referenceOverlay').classList.remove('open'); $('#referenceOverlay').setAttribute('aria-hidden', 'true'); }

function renderUploadedReferences() {
  $('#referenceCount').textContent = `${state.references.length}/${maxReferences}`;
  $('#uploadedReferenceGrid').innerHTML = state.references.map((item, i) => `<figure class="ref-thumb${item.uploadState === 'local-only' ? ' failed' : ''}"><img src="${item.url}" alt="${escapeHtml(item.name)}" title="${item.uploadState === 'local-only' ? 'Upload failed: ' + escapeHtml(item.uploadError || '') : escapeHtml(item.name)}" /><button data-remove-ref="${i}" aria-label="Remove reference">×</button></figure>`).join('');
  $$('[data-remove-ref]').forEach((b) => b.addEventListener('click', () => { const [r] = state.references.splice(Number(b.dataset.removeRef), 1); state.chips = state.chips.filter((n) => n !== r.name); renderUploadedReferences(); renderReferences(); renderPromptChips(); }));
}
function renderReferences() {
  const query = $('#referenceSearch').value.toLowerCase().trim();
  const list = $('#referenceList');
  const filtered = state.references.filter((item) => item.name.toLowerCase().includes(query));
  $('#referenceEmpty').style.display = state.references.length ? 'none' : 'flex';
  list.style.display = filtered.length ? 'grid' : 'none';
  list.innerHTML = filtered.map((item) => { const safe = escapeHtml(item.name); return `<article class="reference-item"><img src="${item.url}" alt="${safe}" /><div class="reference-item-info"><span title="${safe}">${safe}</span><button data-reference-name="${safe}">Tag</button></div></article>`; }).join('');
  list.querySelectorAll('[data-reference-name]').forEach((button) => button.addEventListener('click', () => insertReferenceTag(button.dataset.referenceName)));
}
async function uploadReferenceToServer(item, file) {
  item.uploadPromise = fetch('/api/upload-reference', { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file }).then(async (response) => {
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Reference upload unavailable');
    const data = await response.json();
    item.remoteUrl = data.public_url;
    item.uploadState = 'uploaded';
    return data;
  }).catch((error) => { item.uploadState = 'local-only'; item.uploadError = error.message; return null; });
  await item.uploadPromise;
}
function addReferenceFiles(files) {
  [...files].filter((file) => file.type.startsWith('image/')).slice(0, maxReferences - state.references.length).forEach((file) => {
    if (state.references.some((item) => item.name === file.name && item.size === file.size)) return;
    const reader = new FileReader();
    reader.onload = () => { const item = { name: file.name, size: file.size, url: reader.result, uploadState: 'uploading' }; state.references.push(item); renderUploadedReferences(); renderReferences(); uploadReferenceToServer(item, file).then(() => { renderUploadedReferences(); renderReferences(); }); };
    reader.readAsDataURL(file);
  });
}
function insertReferenceTag(filename) {
  const prompt = $('#promptInput');
  const tag = `@${filename}`;
  const start = prompt.selectionStart ?? prompt.value.length;
  const end = prompt.selectionEnd ?? start;
  const triggerStart = prompt.value[start - 1] === '@' ? start - 1 : start;
  prompt.value = `${prompt.value.slice(0, triggerStart)}${tag} ${prompt.value.slice(end)}`;
  prompt.focus();
  prompt.setSelectionRange(triggerStart + tag.length + 1, triggerStart + tag.length + 1);
  if (!state.chips.includes(filename)) state.chips.push(filename);
  $('#referenceOverlay').classList.remove('open');
  renderPromptChips();
}
function renderPromptChips() {
  let chips = $('#promptCard').querySelector('.prompt-chip-row');
  if (!chips) { chips = document.createElement('div'); chips.className = 'prompt-chip-row'; $('#promptInput').before(chips); }
  chips.innerHTML = state.chips.map((name) => `<span class="prompt-chip">@${escapeHtml(name)}<button data-remove-chip="${escapeHtml(name)}">×</button></span>`).join('');
  chips.querySelectorAll('[data-remove-chip]').forEach((button) => button.addEventListener('click', () => { state.chips = state.chips.filter((name) => name !== button.dataset.removeChip); renderPromptChips(); }));
}
function renderResults() {
  const grid = $('#resultGrid');
  $('#resultCount').textContent = `${state.results.length} result${state.results.length === 1 ? '' : 's'}`;
  $('#resultBoard').classList.toggle('has-results', state.results.length > 0);
  $('#emptyCanvas').classList.toggle('has-results', state.results.length > 0);
  grid.innerHTML = state.results.map((result) => result.pending ? `<article class="result-tile is-pending" data-job-id="${result.id}"><div class="ai-loader" aria-label="Generating image"><span class="ai-loader-orbit ai-loader-orbit-a"></span><span class="ai-loader-orbit ai-loader-orbit-b"></span><span class="ai-loader-core">✦</span><strong>Creating</strong><small>${escapeHtml(result.model)}</small></div><div class="tile-meta"><span>Generating</span><span class="tile-status">AI Spiral</span></div></article>` : result.error ? `<article class="result-tile is-failed"><strong>Generation failed</strong><br />${escapeHtml(result.error)}</article>` : `<article class="result-tile" data-result-id="${result.id}"><img src="${escapeHtml(result.url)}" alt="Generated result" /><span class="tile-shine"></span><div class="tile-meta"><span>${escapeHtml(result.model)}</span><span class="tile-status">Open</span></div></article>`).join('');
  decorateGlowControls(grid);
  grid.querySelectorAll('[data-result-id]').forEach((tile) => tile.addEventListener('click', () => openViewer(state.results.find((result) => result.id === tile.dataset.resultId))));
}
function decorateGlowControls(root = document) { root.querySelectorAll('button,.model-row,.output-row,.visual-reference-drop').forEach((element) => element.classList.add('glow-control')); }
function openViewer(result) {
  if (!result || !result.url) return;
  $('#viewerImage').src = result.url;
  $('#viewerModel').textContent = result.model || 'FXRKENART Studio';
  $('#viewerSource').textContent = result.references ? 'Reference Upload' : 'FXRKENART Studio';
  $('#imageViewer').classList.add('open');
  $('#imageViewer').setAttribute('aria-hidden', 'false');
  $('#openInButton').onclick = () => window.open(result.url, '_blank', 'noopener');
  $('#referenceResultButton').onclick = () => { state.references.push({ name: `generated-${result.id}.png`, size: 0, url: result.url, remoteUrl: result.url, uploadState: 'uploaded' }); renderUploadedReferences(); renderReferences(); setGenerationStatus('Result added to visual references.', 'success'); closeViewer(); };
}
function closeViewer() { $('#imageViewer').classList.remove('open'); $('#imageViewer').setAttribute('aria-hidden', 'true'); }
function showGenerationError(message) { setGenerationStatus(message, 'error'); $('#generateButton').disabled = false; $('#generateButton').classList.remove('loading'); $('#generateButton span').textContent = 'Generate'; state.isGenerating = false; }
let authMode = 'login';
let currentUser = null;
function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === 'signup';
  $('#authTitle').textContent = signup ? 'Create your workspace' : 'Welcome back';
  $('#authSubtitle').textContent = signup ? 'Create an account to start generating.' : 'Sign in to continue to your workspace.';
  $('#authSubmit').innerHTML = `${signup ? 'Create account' : 'Login'} <span>↗</span>`;
  $('#authNameField').hidden = !signup;
  $('#authConfirmField').hidden = !signup;
  $('#authName').required = signup;
  $('#authConfirm').required = signup;
  $$('[data-auth-mode]').forEach((button) => button.classList.toggle('active', button.dataset.authMode === mode));
  $('#authMessage').textContent = '';
  $('#authMessage').classList.remove('success');
}
function openAuth(mode = 'login') { setAuthMode(mode); $('#authModal').classList.add('open'); $('#authModal').setAttribute('aria-hidden', 'false'); window.setTimeout(() => $(mode === 'signup' ? '#authName' : '#authEmail').focus(), 80); }
function closeAuth() { $('#authModal').classList.remove('open'); $('#authModal').setAttribute('aria-hidden', 'true'); }
function showStudio(user) {
  currentUser = user;
  $('#homeScreen').hidden = true;
  $('#studioApp').hidden = false;
  $('#workspaceName').textContent = `${user.name || user.email}'s workspace`;
  $('#accountName').textContent = user.name || 'FXRKENART creator';
  $('#accountEmail').textContent = user.email;
  closeAuth();
  syncAccount();
}
function showHome() { currentUser = null; $('#studioApp').hidden = true; $('#homeScreen').hidden = false; }
async function syncAccount() {
  const response = await fetch('/api/me').catch(() => null);
  if (!response || !response.ok) return;
  const data = await response.json().catch(() => ({}));
  if (typeof data.credits === 'number') state.credits = data.credits;
  if (Array.isArray(data.history)) state.history = data.history;
  updateBalance();
}
async function loadSession() {
  const response = await fetch('/api/auth/session').catch(() => null);
  if (!response || !response.ok) return showHome();
  const data = await response.json().catch(() => ({}));
  if (data.authenticated && data.user) showStudio(data.user); else showHome();
}
async function submitAuth(event) {
  event.preventDefault();
  const message = $('#authMessage');
  const submit = $('#authSubmit');
  if (authMode === 'signup' && $('#authPassword').value !== $('#authConfirm').value) { message.textContent = 'Passwords do not match.'; return; }
  submit.disabled = true; submit.classList.add('loading'); message.textContent = authMode === 'signup' ? 'Creating account…' : 'Signing in…'; message.classList.remove('success');
  const response = await fetch(`/api/auth/${authMode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: $('#authName').value.trim(), email: $('#authEmail').value.trim(), password: $('#authPassword').value }) }).catch(() => null);
  const data = await response?.json().catch(() => ({}));
  submit.disabled = false; submit.classList.remove('loading');
  if (!response || !response.ok) { message.textContent = data?.error || 'Backend chưa chạy. Khởi động server trước.'; return; }
  message.textContent = 'Account ready.'; message.classList.add('success'); showStudio(data.user);
}
async function pollGeneration(jobId, cost, pendingId) {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const response = await fetch(`/api/generate/${encodeURIComponent(jobId)}`).catch(() => null);
    if (!response) continue;
    if (response.status === 401) { state.results = state.results.filter((r) => r.id !== pendingId); renderResults(); showGenerationError('Phiên đăng nhập hết hạn.'); return showHome(); }
    const job = await response.json().catch(() => ({}));
    if (typeof job.balance === 'number') state.credits = job.balance;
    if (job.status === 'completed') {
      state.results = state.results.filter((result) => result.id !== pendingId);
      (job.images || []).forEach((url, index) => state.results.unshift({ id: `${jobId}-${index}`, url, model: job.model || state.model, prompt: job.prompt || '' }));
      updateBalance(); syncAccount(); renderResults(); setGenerationStatus('Generation complete.', 'success');
      $('#generateButton').disabled = false; $('#generateButton').classList.remove('loading'); $('#generateButton span').textContent = 'Generate'; state.isGenerating = false; return;
    }
    if (['failed', 'canceled', 'nsfw'].includes(job.status)) { state.results = state.results.filter((result) => result.id !== pendingId); state.results.unshift({ id: pendingId, error: job.error || `Generation ${job.status}.` }); renderResults(); return showGenerationError(job.error || `Generation ${job.status}.`); }
    setGenerationStatus(job.status === 'processing' ? 'Rendering your image…' : 'Preparing generation…', 'loading');
  }
  state.results = state.results.filter((result) => result.id !== pendingId); renderResults(); showGenerationError('Generation timed out. Check the provider dashboard before retrying.');
}
async function startGeneration() {
  if (state.isGenerating) return;
  const cost = getCost();
  if (state.credits < cost) { $('#generateButton span').textContent = `Need ${formatCredit(cost - state.credits)} more`; setTimeout(() => { $('#generateButton span').textContent = 'Generate'; }, 1600); return; }
  const prompt = $('#promptInput').value.trim();
  if (!prompt) return setGenerationStatus('Describe the image you want to create first.', 'error');
  state.isGenerating = true;
  const button = $('#generateButton'); button.disabled = true; button.classList.add('loading'); button.querySelector('span').textContent = 'Generating…'; setGenerationStatus('Preparing generation…', 'loading');
  await Promise.all(state.references.map((item) => item.uploadPromise).filter(Boolean));
  if (state.references.some((item) => !item.remoteUrl)) return showGenerationError('Một số ảnh tham chiếu upload lỗi. Xóa ảnh đó (×) hoặc thử lại.');
  const pendingId = `pending-${Date.now()}`;
  state.results.unshift({ id: pendingId, pending: true, model: state.model }); renderResults();
  const payload = { prompt, model: state.model, quality: state.quality, resolution: state.resolution, count: state.count, aspect_ratio: state.ratio, auto_polish: $('.polish-toggle input').checked, image_urls: state.references.map((item) => item.remoteUrl).filter(Boolean), client_request_id: `generate-${Date.now()}-${Math.random().toString(36).slice(2)}` };
  const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client-Request-Id': payload.client_request_id }, body: JSON.stringify(payload) }).catch(() => null);
  if (!response) { state.results = state.results.filter((result) => result.id !== pendingId); renderResults(); return showGenerationError('Backend chưa chạy. Khởi động bằng: node server.mjs'); }
  const data = await response.json().catch(() => ({}));
  if (typeof data.balance === 'number') { state.credits = data.balance; updateBalance(); }
  if (!response.ok || !data.job_id) { state.results = state.results.filter((result) => result.id !== pendingId); renderResults(); return showGenerationError(data.error || 'Backend chưa được cấu hình API.'); }
  pollGeneration(data.job_id, cost, pendingId);
}

$('#homeLoginButton').addEventListener('click', () => openAuth('login'));
$('#homeSignupButton').addEventListener('click', () => openAuth('signup'));
$('#homeStartButton').addEventListener('click', () => openAuth('signup'));
$('#homeExploreButton').addEventListener('click', () => openAuth('login'));
$('#closeAuth').addEventListener('click', closeAuth);
$('#authModal').addEventListener('click', (event) => { if (event.target === $('#authModal') || event.target.classList.contains('auth-backdrop')) closeAuth(); });
$$('[data-auth-mode]').forEach((button) => button.addEventListener('click', () => setAuthMode(button.dataset.authMode)));
$('#authForm').addEventListener('submit', submitAuth);
$('#signOutButton').addEventListener('click', async () => { await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null); showHome(); });
$('#modelButton').addEventListener('click', (event) => { event.stopPropagation(); $('#outputPopover').classList.remove('open'); $('#modelPopover').classList.toggle('open'); });
$$('#modelPopover [data-model]').forEach((button) => button.addEventListener('click', () => { state.model = button.dataset.model; state.provider = button.dataset.provider; $('#modelValue').textContent = state.model; $('#providerMark').textContent = state.provider === 'google' ? 'G' : '✦'; $$('#modelPopover button').forEach((item) => item.classList.toggle('selected', item === button)); closeMenus(); updateCost(); }));
$('#outputButton').addEventListener('click', (event) => { event.stopPropagation(); $('#modelPopover').classList.remove('open'); $('#outputPopover').classList.toggle('open'); });
$('#ratioSelect').addEventListener('change', (event) => { state.ratio = event.target.value; updateCost(); });
$('#qualitySelect').addEventListener('change', (event) => { state.quality = event.target.value; updateCost(); });
$('#resolutionSelect').addEventListener('change', (event) => { state.resolution = event.target.value; updateCost(); });
document.addEventListener('click', (event) => { if (!event.target.closest('.model-popover,.model-row,.output-popover,.output-row,.profile-menu,.profile-button')) closeMenus(); });

function triggerUpload() { $('#referenceInput').click(); }
$('#referenceDrop').addEventListener('click', triggerUpload);
$('#promptAttach').addEventListener('click', triggerUpload);
$('#referenceInput').addEventListener('change', (event) => { addReferenceFiles(event.target.files); event.target.value = ''; });
['dragenter', 'dragover'].forEach((name) => $('#referenceDrop').addEventListener(name, (event) => { event.preventDefault(); $('#referenceDrop').classList.add('dragging'); }));
$('#referenceDrop').addEventListener('dragleave', () => $('#referenceDrop').classList.remove('dragging'));
$('#referenceDrop').addEventListener('drop', (event) => { event.preventDefault(); $('#referenceDrop').classList.remove('dragging'); addReferenceFiles(event.dataTransfer.files); });
$('#referenceButton').addEventListener('click', openReferencePanel);
$('#closeReferenceTop').addEventListener('click', closeReferencePanel);
$('#newReference').addEventListener('click', triggerUpload);
$('#emptyUpload').addEventListener('click', triggerUpload);
$('#referenceSearch').addEventListener('input', renderReferences);
$('#referenceOverlay').addEventListener('dragover', (event) => event.preventDefault());
$('#referenceOverlay').addEventListener('drop', (event) => { event.preventDefault(); addReferenceFiles(event.dataTransfer.files); });
window.addEventListener('paste', (event) => { const files = [...(event.clipboardData?.files || [])]; if (files.length) addReferenceFiles(files); });
$('#promptInput').addEventListener('keydown', (event) => { if (event.key === '@') setTimeout(openReferencePanel, 0); });
$('#promptInput').addEventListener('input', (event) => { const cursor = event.target.selectionStart || 0; if (event.target.value[cursor - 1] === '@') openReferencePanel(); });
$('#promptTrash').addEventListener('click', () => { $('#promptInput').value = ''; state.chips = []; renderPromptChips(); });

$('#minusCount').addEventListener('click', () => { state.count = Math.max(1, state.count - 1); $('#imageCount').textContent = `${state.count}/4`; updateCost(); });
$('#plusCount').addEventListener('click', () => { state.count = Math.min(4, state.count + 1); $('#imageCount').textContent = `${state.count}/4`; updateCost(); });
$('#generateButton').addEventListener('click', startGeneration);
$('#clearResults').addEventListener('click', () => { state.results = []; renderResults(); setGenerationStatus(''); });
$('#closeViewer').addEventListener('click', closeViewer);
$('#imageViewer').addEventListener('click', (event) => { if (event.target === $('#imageViewer') || event.target.classList.contains('viewer-backdrop')) closeViewer(); });
$('#animateButton').addEventListener('click', () => setGenerationStatus('Animate will use the video branch after it is connected.', 'success'));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeAuth(); closeMenus(); closeReferencePanel(); closeViewer(); closeUpgrade(); closeCredits(); closeSubscription(); } });
$('#profileButton').addEventListener('click', (event) => { event.stopPropagation(); $('#profileMenu').classList.toggle('open'); });
$('#upgradeButton').addEventListener('click', openUpgrade);
$('#closeUpgrade').addEventListener('click', closeUpgrade);
$('#upgradeModal').addEventListener('click', (event) => { if (event.target === $('#upgradeModal')) closeUpgrade(); });
$$('.package-card').forEach((card) => card.addEventListener('click', () => { $('#upgradeStatus').textContent = `${card.querySelector('strong').textContent} selected — payment gateway is not connected in this prototype.`; }));
let historyFilter = '';
function renderHistory() {
  const rows = state.history.filter((h) => !historyFilter || h.type === historyFilter);
  $('#historyList').innerHTML = rows.length ? rows.map((h) => `<div class="history-row"><div><strong>${escapeHtml(h.model || '')}</strong><small>${new Date(h.created_at).toLocaleString('vi-VN')}</small></div><b class="${h.type}">${h.type === 'Spent' ? '−' : '+'}${formatCredit(h.amount)}</b></div>`).join('') : '<div class="history-empty"><strong>Chưa có giao dịch</strong><small>Hoạt động credit sẽ hiện ở đây.</small></div>';
}
$$('.history-tabs button').forEach((b) => b.addEventListener('click', () => { historyFilter = b.dataset.filter; $$('.history-tabs button').forEach((x) => x.classList.toggle('active', x === b)); renderHistory(); }));
function openCredits() { renderHistory(); syncAccount().then(renderHistory); closeMenus(); $('#creditsModal').classList.add('open'); $('#creditsModal').setAttribute('aria-hidden', 'false'); updateBalance(); }
function closeCredits() { $('#creditsModal').classList.remove('open'); $('#creditsModal').setAttribute('aria-hidden', 'true'); }
$('#creditHistoryButton').addEventListener('click', openCredits);
$('#closeCredits').addEventListener('click', closeCredits);
$('#purchaseCredits').addEventListener('click', () => { closeCredits(); openUpgrade(); });
$('#creditsModal').addEventListener('click', (event) => { if (event.target === $('#creditsModal')) closeCredits(); });
function openSubscription() { closeMenus(); $('#subscriptionPage').classList.add('open'); $('#subscriptionPage').setAttribute('aria-hidden', 'false'); updateBalance(); }
function closeSubscription() { $('#subscriptionPage').classList.remove('open'); $('#subscriptionPage').setAttribute('aria-hidden', 'true'); }
$('#subscriptionButton').addEventListener('click', openSubscription);
$('#closeSubscription').addEventListener('click', closeSubscription);
$('#addCreditsFromSubscription').addEventListener('click', openUpgrade);
$('#addCreditsButton').addEventListener('click', openUpgrade);
$('#unlockButton').addEventListener('click', openUpgrade);

updateBalance();
updateCost();
renderUploadedReferences();
renderResults();
decorateGlowControls();
loadSession();
