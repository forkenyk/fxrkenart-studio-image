import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4174);
const hfBase = (process.env.HF_API_BASE_URL || 'https://api.higgsfield.ai').replace(/\/$/, '');
const hfCredentials = process.env.HF_CREDENTIALS || process.env.HF_API_KEY || '';
const jobs = new Map();
const users = new Map();
const usersByEmail = new Map();
const sessions = new Map();
const requestKeys = new Map();
const scryptAsync = promisify(crypto.scrypt);
const priceTable = { 'Nano Banana PRO': { Low: 45, Medium: 60, High: 80 }, Soul: { Low: 30, Medium: 42, High: 60 } };
const modelPaths = { Soul: 'text/image route selected per request', 'Nano Banana PRO': process.env.HF_NANO_BANANA_PATH || '' };
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

function sendJson(response, status, payload) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  const cookie = response.getHeader('Set-Cookie');
  if (cookie) headers['Set-Cookie'] = cookie;
  response.writeHead(status, headers);
  response.end(JSON.stringify(payload));
}
function authHeaders() { return hfCredentials ? { Authorization: `Key ${hfCredentials}` } : {}; }
function safeDecode(v) { try { return decodeURIComponent(v); } catch { return ''; } }
function parseCookies(request) { return Object.fromEntries((request.headers.cookie || '').split(';').map((part) => part.trim().split('=').map(safeDecode)).filter(([key, value]) => key && value)); }
function sessionFor(request, response) {
  const cookies = parseCookies(request);
  let id = cookies.fxrkenart_sid;
  if (!id || !/^[a-f0-9-]{20,}$/i.test(id)) { id = crypto.randomUUID(); response.setHeader('Set-Cookie', `fxrkenart_sid=${encodeURIComponent(id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`); }
  const userId = sessions.get(id);
  return { id, user: userId ? users.get(userId) : null };
}
function publicUser(user) { return user ? { id: user.id, name: user.name, email: user.email, credits: user.credits } : null; }
function requireUser(request, response) { const session = sessionFor(request, response); if (!session.user) { sendJson(response, 401, { error: 'Authentication required.' }); return null; } return session; }
async function passwordDigest(password, salt) { const derived = await scryptAsync(password, salt, 64); return derived.toString('hex'); }
async function createUser(name, email, password) { const salt = crypto.randomBytes(16).toString('hex'); const user = { id: crypto.randomUUID(), name: name.trim().slice(0, 80), email, salt, password_hash: await passwordDigest(password, salt), credits: Number(process.env.STARTING_CREDITS || 36), history: [], created_at: new Date().toISOString() }; users.set(user.id, user); usersByEmail.set(email, user.id); return user; }
async function passwordMatches(user, password) { return crypto.timingSafeEqual(Buffer.from(user.password_hash, 'hex'), Buffer.from(await passwordDigest(password, user.salt), 'hex')); }
function generationCost(input) { const base = priceTable[input.model]?.[input.quality] || 30; return Number((base * (input.resolution === '4K' ? 1 : .55) * Math.min(4, Math.max(1, Number(input.count || 1)))).toFixed(1)); }
function soulAspect(value) { if (value === '4:5') return '3:4'; if (value === 'Auto') return '4:3'; return ['9:16', '16:9', '4:3', '3:4', '1:1', '2:3', '3:2'].includes(value) ? value : '4:3'; }
function soulResolution(value) { return value === 'Low' || value === '2K' ? '720p' : '1080p'; }
function providerRequest(input) {
  const count = Math.min(4, Math.max(1, Number(input.count || 1)));
  if (input.model === 'Soul') {
    const hasReference = Array.isArray(input.image_urls) && input.image_urls.length > 0;
    return {
      endpointPath: hasReference ? (process.env.HF_SOUL_IMAGE_PATH || '/higgsfield-ai/soul/v2/image-to-image') : (process.env.HF_SOUL_TEXT_PATH || '/higgsfield-ai/soul/standard'),
      body: hasReference ? { image_url: input.image_urls[0], prompt: input.prompt, batch_size: count, resolution: soulResolution(input.resolution), aspect_ratio: soulAspect(input.aspect_ratio), enhance_prompt: true } : { prompt: input.prompt, batch_size: count, resolution: soulResolution(input.resolution), aspect_ratio: soulAspect(input.aspect_ratio), enhance_prompt: Boolean(input.auto_polish), style_strength: 1 },
    };
  }
  if (!modelPaths['Nano Banana PRO']) throw new Error('Set HF_NANO_BANANA_PATH to the Nano Banana PRO endpoint before using this model.');
  return { endpointPath: modelPaths['Nano Banana PRO'], body: { prompt: input.prompt, image_urls: input.image_urls?.length ? input.image_urls : undefined, quality: String(input.quality || 'High').toLowerCase(), resolution: String(input.resolution || '2K').toLowerCase(), aspect_ratio: input.aspect_ratio || 'auto', enhance_prompt: Boolean(input.auto_polish), batch_size: count } };
}
async function readBody(request, limit = 32 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error('Request body is too large.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function readJson(request) { return JSON.parse((await readBody(request, 256 * 1024)).toString('utf8') || '{}'); }
function failJob(job, message) {
  if (!job.refunded) { const user = users.get(job.user_id); if (user && job.cost) user.credits = Number((user.credits + job.cost).toFixed(1)); if (user && job.cost) user.history.unshift({ type: 'Refunded', amount: job.cost, model: job.model, created_at: new Date().toISOString() }); job.refunded = true; job.balance = users.get(job.user_id)?.credits ?? null; }
  job.status = 'failed'; job.error = message; job.finished_at = new Date().toISOString();
}
function unwrapUrls(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(unwrapUrls);
  if (typeof value === 'string') return /^https?:\/\//i.test(value) ? [value] : [];
  if (typeof value !== 'object') return [];
  if (typeof value.url === 'string') return [value.url];
  return Object.values(value).flatMap(unwrapUrls);
}
function imageUrls(payload) {
  const candidates = [payload?.images, payload?.image, payload?.output?.images, payload?.output?.image, payload?.result?.images, payload?.result?.image, payload?.data?.images, payload?.data?.image];
  return [...new Set(candidates.flatMap(unwrapUrls))];
}
async function pollProvider(job, statusUrl) {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const response = await fetch(statusUrl, { headers: authHeaders() });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.detail || payload?.message || `Provider status error (${response.status}).`);
    const status = String(payload.status || payload.state || '').toLowerCase();
    if (['completed', 'succeeded', 'success'].includes(status)) {
      const images = imageUrls(payload);
      if (!images.length) throw new Error('Provider completed without returning an image URL.');
      completeJob(job, images); return;
    }
    if (['failed', 'canceled', 'cancelled', 'nsfw'].includes(status)) throw new Error(payload.error || payload.message || `Provider returned ${status}.`);
    job.status = 'processing';
  }
  throw new Error('Provider generation timed out.');
}
async function runGeneration(job, input) {
  try {
    if (!hfCredentials) throw new Error('HF_CREDENTIALS is not configured on the server.');
    job.status = 'submitting';
    const { endpointPath, body } = providerRequest(input);
    const endpoint = `${hfBase}${endpointPath}`;
    const response = await fetch(endpoint, { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.detail || payload?.message || `Provider rejected generation (${response.status}).`);
    const immediate = imageUrls(payload);
    if (immediate.length) { completeJob(job, immediate); return; }
    const requestId = payload.request_id || payload.id;
    const statusUrl = payload.status_url || (requestId ? `${hfBase}/requests/${requestId}/status` : '');
    if (!statusUrl) throw new Error('Provider did not return a request status URL.');
    job.provider_request_id = requestId || null;
    await pollProvider(job, statusUrl);
  } catch (error) { failJob(job, error.message || 'Generation failed.'); }
}
function completeJob(job, images) {
  const user = users.get(job.user_id);
  if (user) user.history.unshift({ type: 'Spent', amount: job.cost, model: job.model, created_at: new Date().toISOString() });
  job.status = 'completed'; job.images = images; job.balance = user?.credits ?? null; job.finished_at = new Date().toISOString();
}
async function handleApi(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/api/health') return sendJson(response, 200, { ok: true, provider: 'Higgsfield', configured: Boolean(hfCredentials), models: Object.keys(modelPaths) });
  if (request.method === 'GET' && url.pathname === '/api/auth/session') { const session = sessionFor(request, response); return sendJson(response, 200, { authenticated: Boolean(session.user), user: publicUser(session.user) }); }
  if (request.method === 'POST' && url.pathname === '/api/auth/signup') {
    let input; try { input = await readJson(request, 128 * 1024); } catch { return sendJson(response, 400, { error: 'Invalid signup request.' }); }
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const password = typeof input.password === 'string' ? input.password : '';
    if (name.length < 2) return sendJson(response, 400, { error: 'Please enter your name.' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return sendJson(response, 400, { error: 'Please enter a valid email.' });
    if (password.length < 8) return sendJson(response, 400, { error: 'Password must be at least 8 characters.' });
    if (usersByEmail.has(email)) return sendJson(response, 409, { error: 'An account with this email already exists.' });
    const user = await createUser(name, email, password);
    const session = sessionFor(request, response); sessions.set(session.id, user.id);
    user.history.unshift({ type: 'Granted', amount: user.credits, model: 'Welcome credits', created_at: new Date().toISOString() });
    return sendJson(response, 201, { user: publicUser(user) });
  }
  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    let input; try { input = await readJson(request, 128 * 1024); } catch { return sendJson(response, 400, { error: 'Invalid login request.' }); }
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const password = typeof input.password === 'string' ? input.password : '';
    const userId = usersByEmail.get(email); const user = userId ? users.get(userId) : null;
    if (!user || !(await passwordMatches(user, password))) return sendJson(response, 401, { error: 'Email or password is incorrect.' });
    const session = sessionFor(request, response); sessions.set(session.id, user.id);
    return sendJson(response, 200, { user: publicUser(user) });
  }
  if (request.method === 'POST' && url.pathname === '/api/auth/logout') { const session = sessionFor(request, response); sessions.delete(session.id); response.setHeader('Set-Cookie', 'fxrkenart_sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'); return sendJson(response, 200, { ok: true }); }
  if (request.method === 'GET' && url.pathname === '/api/me') { const session = requireUser(request, response); if (!session) return true; return sendJson(response, 200, { user: publicUser(session.user), credits: session.user.credits, history: session.user.history.slice(0, 50) }); }
  if (request.method === 'POST' && url.pathname === '/api/upload-reference') {
    const session = requireUser(request, response); if (!session) return true;
    if (!hfCredentials) return sendJson(response, 503, { error: 'HF_CREDENTIALS is not configured on the server.' });
    const contentType = request.headers['content-type'] || 'application/octet-stream';
    if (!contentType.startsWith('image/')) return sendJson(response, 415, { error: 'Only image references are supported.' });
    const bytes = await readBody(request);
    const signResponse = await fetch(`${hfBase}/files/generate-upload-url`, { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ content_type: contentType }) });
    const signed = await signResponse.json().catch(() => ({}));
    if (!signResponse.ok) return sendJson(response, signResponse.status, { error: signed?.detail || signed?.message || 'Could not create upload URL.' });
    const uploadResponse = await fetch(signed.upload_url, { method: 'PUT', headers: signed.upload_headers || { 'Content-Type': contentType }, body: bytes });
    if (!uploadResponse.ok) return sendJson(response, uploadResponse.status, { error: 'Reference upload failed.' });
    return sendJson(response, 200, { public_url: signed.public_url });
  }
  if (request.method === 'POST' && url.pathname === '/api/generate') {
    let input;
    try { input = await readJson(request); } catch { return sendJson(response, 400, { error: 'Invalid JSON body.' }); }
    const allowedModels = Object.keys(modelPaths);
    if (!allowedModels.includes(input.model)) return sendJson(response, 400, { error: 'Model must be Soul or Nano Banana PRO.' });
    if (typeof input.prompt !== 'string' || !input.prompt.trim() || input.prompt.length > 10000) return sendJson(response, 400, { error: 'Prompt is required and must be under 10,000 characters.' });
    if (Array.isArray(input.image_urls) && input.image_urls.length > 16) return sendJson(response, 400, { error: 'A maximum of 16 reference images is supported.' });
    if (Array.isArray(input.image_urls) && input.image_urls.some((url) => typeof url !== 'string' || !/^https:\/\//i.test(url))) return sendJson(response, 400, { error: 'Reference images must be uploaded before generation.' });
    const session = requireUser(request, response); if (!session) return true;
    const clientRequestId = String(request.headers['x-client-request-id'] || input.client_request_id || '').slice(0, 120);
    const requestKey = clientRequestId ? `${session.id}:${clientRequestId}` : '';
    if (requestKey && requestKeys.has(requestKey)) { const existing = jobs.get(requestKeys.get(requestKey)); if (existing) return sendJson(response, 202, { job_id: existing.id, status: existing.status, deduplicated: true, cost: existing.cost, balance: session.user.credits }); }
    const cost = generationCost(input);
    if (session.user.credits < cost) return sendJson(response, 402, { error: `Insufficient credits. Need ${Number((cost - session.user.credits).toFixed(1))} more.`, balance: session.user.credits, cost });
    session.user.credits = Number((session.user.credits - cost).toFixed(1));
    const id = crypto.randomUUID();
    const job = { id, user_id: session.user.id, status: 'queued', created_at: new Date().toISOString(), images: [], model: input.model, cost, balance: session.user.credits };
    jobs.set(id, job);
    if (requestKey) requestKeys.set(requestKey, id);
    void runGeneration(job, { ...input, prompt: input.prompt.trim() });
    return sendJson(response, 202, { job_id: id, status: job.status, cost, balance: session.user.credits });
  }
  const jobMatch = url.pathname.match(/^\/api\/generate\/([^/]+)$/);
  if (request.method === 'GET' && jobMatch) {
    const session = requireUser(request, response); if (!session) return true;
    const job = jobs.get(jobMatch[1]);
    if (!job) return sendJson(response, 404, { error: 'Generation job not found.' });
    if (job.user_id !== session.user.id) return sendJson(response, 404, { error: 'Generation job not found.' });
    const { user_id, ...safeJob } = job; return sendJson(response, 200, safeJob);
  }
  return false;
}
async function serveStatic(request, response, url) {
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  if (!['/index.html', '/styles.css', '/app.js', '/favicon.svg'].includes(requested)) return sendJson(response, 404, { error: 'Not found.' });
  const filePath = path.join(root, requested);
  try { const data = await fs.readFile(filePath); response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream' }); response.end(data); } catch { sendJson(response, 404, { error: 'Not found.' }); }
}
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  try { if (url.pathname.startsWith('/api/')) { const handled = await handleApi(request, response, url); if (handled !== false) return; } await serveStatic(request, response, url); } catch (error) { if (!response.headersSent) sendJson(response, 500, { error: error.message || 'Internal server error.' }); }
});
server.listen(port, () => console.log(`FXRKENART Studio Image running at http://localhost:${port}`));
