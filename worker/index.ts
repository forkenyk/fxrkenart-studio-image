import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { generateImage, type GeneratedImage } from './providers';

type ModelName = 'Nano Banana PRO' | 'ChatGPT 2.5';
type Quality = 'Low' | 'Medium' | 'High';

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta?: { changes?: number } }>;
}

interface D1Database {
  prepare(sql: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown[]>;
}

interface R2Object {
  body: ReadableStream;
  httpMetadata?: { contentType?: string; cacheControl?: string };
}

interface R2Bucket {
  put(key: string, value: ArrayBuffer | ArrayBufferView | ReadableStream | Blob | string, options?: Record<string, unknown>): Promise<unknown>;
  get(key: string): Promise<R2Object | null>;
}

interface Fetcher { fetch(input: Request | string, init?: RequestInit): Promise<Response> }

interface Env {
  ASSETS: Fetcher;
  DB?: D1Database;
  MEDIA?: R2Bucket;
  APP_URL?: string;
  STARTING_CREDITS?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_EMAIL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_IMAGE_MODEL?: string;
  GEMINI_API_KEY?: string;
  GEMINI_IMAGE_MODEL?: string;
}

interface WorkerExecutionContext { waitUntil(promise: Promise<unknown>): void }

interface UserRow {
  id: string;
  name: string;
  email: string;
  credits: number;
  plan: string;
}

interface StoredUser extends UserRow {
  password_hash: string;
  password_salt: string;
}

const app = new Hono<{ Bindings: Env }>();
const SESSION_COOKIE = 'fxrkenart_sid';
const GOOGLE_STATE_COOKIE = 'fxrkenart_google_state';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const GOOGLE_STATE_MAX_AGE = 60 * 10;
const priceTable: Record<ModelName, Record<Quality, number>> = {
  'Nano Banana PRO': { Low: 45, Medium: 60, High: 80 },
  'ChatGPT 2.5': { Low: 35, Medium: 50, High: 70 },
};

function database(env: Env) {
  if (!env.DB) throw new Error('Studio database is not configured. Add the D1 binding named DB.');
  return env.DB;
}

function mediaBucket(env: Env) {
  if (!env.MEDIA) throw new Error('Studio media storage is not configured. Add the R2 binding named MEDIA.');
  return env.MEDIA;
}

async function first<T>(env: Env, sql: string, ...values: unknown[]) {
  return database(env).prepare(sql).bind(...values).first<T>();
}

async function many<T>(env: Env, sql: string, ...values: unknown[]) {
  const result = await database(env).prepare(sql).bind(...values).all<T>();
  return result.results || [];
}

async function run(env: Env, sql: string, ...values: unknown[]) {
  return database(env).prepare(sql).bind(...values).run();
}

function publicUser(user: UserRow | null) {
  return user ? { id: user.id, name: user.name, email: user.email, credits: Number(user.credits) } : null;
}

function randomHex(bytes = 24) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return Array.from(value, (item) => item.toString(16).padStart(2, '0')).join('');
}

function hex(value: ArrayBuffer) {
  return Array.from(new Uint8Array(value), (item) => item.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256);
  return hex(bits);
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

async function passwordMatches(user: StoredUser, password: string) {
  return constantTimeEqual(user.password_hash, await hashPassword(password, user.password_salt));
}

async function createUser(env: Env, name: string, email: string, password: string) {
  const id = crypto.randomUUID();
  const salt = randomHex(16);
  const passwordHash = await hashPassword(password, salt);
  const credits = Number(env.STARTING_CREDITS || 36);
  await database(env).batch([
    database(env).prepare('INSERT INTO users (id, name, email, password_hash, password_salt, credits) VALUES (?, ?, ?, ?, ?, ?)').bind(id, name, email, passwordHash, salt, credits),
    database(env).prepare('INSERT INTO credit_ledger (id, user_id, type, amount, balance_after, note) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), id, 'granted', credits, credits, 'Welcome credits'),
  ]);
  return first<UserRow>(env, 'SELECT id, name, email, credits, plan FROM users WHERE id = ?', id);
}

async function findUserByEmail(env: Env, email: string) {
  return first<StoredUser>(env, 'SELECT id, name, email, credits, plan, password_hash, password_salt FROM users WHERE email = ?', email);
}

async function currentUser(c: { env: Env; req: { header(name: string): string | undefined } }) {
  const cookieHeader = c.req.header('Cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)fxrkenart_sid=([^;]+)/);
  const sessionId = match ? decodeURIComponent(match[1]) : '';
  if (!sessionId) return null;
  const session = await first<{ user_id: string; expires_at: string }>(c.env, 'SELECT user_id, expires_at FROM sessions WHERE id = ?', sessionId);
  if (!session || Date.parse(session.expires_at.replace(' ', 'T') + (session.expires_at.includes('Z') ? '' : 'Z')) <= Date.now()) {
    if (sessionId) await run(c.env, 'DELETE FROM sessions WHERE id = ?', sessionId);
    return null;
  }
  return first<UserRow>(c.env, 'SELECT id, name, email, credits, plan FROM users WHERE id = ?', session.user_id);
}

async function beginSession(c: any, userId: string) {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
  await run(c.env, 'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)', id, userId, expiresAt);
  setCookie(c, SESSION_COOKIE, id, { httpOnly: true, sameSite: 'Lax', secure: true, path: '/', maxAge: SESSION_MAX_AGE });
}

async function endSession(c: any) {
  const cookieHeader = c.req.header('Cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)fxrkenart_sid=([^;]+)/);
  if (match) await run(c.env, 'DELETE FROM sessions WHERE id = ?', decodeURIComponent(match[1]));
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

function baseAppUrl(c: any) {
  return (c.env.APP_URL || new URL(c.req.url).origin).replace(/\/$/, '');
}

function googleRedirectUri(c: any) {
  return c.env.GOOGLE_REDIRECT_URI || `${baseAppUrl(c)}/api/auth/google/callback`;
}

function authRedirect(c: any, error?: string) {
  const target = new URL(baseAppUrl(c));
  if (error) target.searchParams.set('auth_error', error);
  return target.toString();
}

function generationCost(model: ModelName, quality: Quality, resolution: string, count: number) {
  return Math.round(priceTable[model][quality] * (resolution === '4K' ? 1 : .55) * Math.min(4, Math.max(1, count)));
}

function isModel(value: unknown): value is ModelName {
  return value === 'Nano Banana PRO' || value === 'ChatGPT 2.5';
}

function isQuality(value: unknown): value is Quality {
  return value === 'Low' || value === 'Medium' || value === 'High';
}

function safeExtension(name: string, mimeType: string) {
  const fromName = name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (fromName) return fromName.slice(0, 8);
  return mimeType.split('/')[1]?.replace(/[^a-z0-9]/g, '') || 'bin';
}

async function failGeneration(env: Env, generationId: string, message: string) {
  const job = await first<{ user_id: string; cost_credits: number; status: string }>(env, 'SELECT user_id, cost_credits, status FROM generations WHERE id = ?', generationId);
  if (!job || ['completed', 'failed', 'canceled', 'nsfw'].includes(job.status)) return;
  const user = await first<{ credits: number }>(env, 'SELECT credits FROM users WHERE id = ?', job.user_id);
  const balance = Number(user?.credits || 0) + Number(job.cost_credits);
  await database(env).batch([
    database(env).prepare('UPDATE users SET credits = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(balance, job.user_id),
    database(env).prepare('INSERT INTO credit_ledger (id, user_id, generation_id, type, amount, balance_after, note) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), job.user_id, generationId, 'refunded', job.cost_credits, balance, message),
    database(env).prepare('UPDATE generations SET status = ?, error_message = ?, failed_at = CURRENT_TIMESTAMP WHERE id = ?').bind('failed', message, generationId),
  ]);
}

async function executeGeneration(env: Env, generationId: string, userId: string, input: { prompt: string; model: ModelName; quality: Quality; resolution: string; count: number; aspectRatio: string; autoPolish: boolean; referenceIds: string[] }) {
  try {
    await run(env, 'UPDATE generations SET status = ? WHERE id = ?', 'submitting', generationId);
    const references = input.referenceIds.length ? await many<{ id: string; r2_key: string; mime_type: string }>(env, `SELECT id, r2_key, mime_type FROM assets WHERE user_id = ? AND kind = 'reference' AND id IN (${input.referenceIds.map(() => '?').join(',')})`, userId, ...input.referenceIds) : [];
    if (references.length !== input.referenceIds.length) throw new Error('One or more references do not belong to this account.');
    const referenceImages: Array<{ bytes: ArrayBuffer; mimeType: string }> = [];
    for (const reference of input.referenceIds.map((id) => references.find((item) => item.id === id)!)) {
      const object = await mediaBucket(env).get(reference.r2_key);
      if (!object) throw new Error('A reference image is unavailable.');
      referenceImages.push({ bytes: await new Response(object.body).arrayBuffer(), mimeType: reference.mime_type });
    }
    const providerImages = await generateImage(env, { ...input, references: referenceImages });
    await run(env, 'UPDATE generations SET provider_request_id = ?, status = ? WHERE id = ?', `${input.model}:${generationId}`, 'processing', generationId);
    const stored: Array<{ assetId: string; key: string; mimeType: string; size: number }> = [];
    for (let index = 0; index < providerImages.length; index += 1) {
      const image: GeneratedImage = providerImages[index];
      const mimeType = image.mimeType || 'image/png';
      const extension = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : mimeType.includes('webp') ? 'webp' : 'png';
      const assetId = crypto.randomUUID();
      const key = `users/${userId}/generations/${generationId}/${index}.${extension}`;
      const bytes = image.bytes;
      await mediaBucket(env).put(key, bytes, { httpMetadata: { contentType: mimeType, cacheControl: 'private, max-age=31536000, immutable' } });
      stored.push({ assetId, key, mimeType, size: bytes.byteLength });
    }
    const statements = stored.flatMap((item, index) => [
      database(env).prepare('INSERT INTO assets (id, user_id, kind, r2_key, mime_type, byte_size) VALUES (?, ?, ?, ?, ?, ?)').bind(item.assetId, userId, 'generated', item.key, item.mimeType, item.size),
      database(env).prepare('INSERT INTO generation_assets (generation_id, asset_id, position) VALUES (?, ?, ?)').bind(generationId, item.assetId, index),
    ]);
    statements.push(database(env).prepare('UPDATE generations SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?').bind('completed', generationId));
    await database(env).batch(statements);
  } catch (error) {
    await failGeneration(env, generationId, error instanceof Error ? error.message : 'Generation failed.');
  }
}

app.use('/api/*', cors({ origin: (origin) => origin || '*', credentials: true }));

app.get('/api/health', (c) => c.json({ ok: true, providers: { openai: Boolean(c.env.OPENAI_API_KEY), gemini: Boolean(c.env.GEMINI_API_KEY) }, models: ['Nano Banana PRO', 'ChatGPT 2.5'], database: Boolean(c.env.DB), storage: Boolean(c.env.MEDIA), googleSignIn: Boolean(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET) }));

app.get('/api/auth/session', async (c) => {
  const user = await currentUser(c);
  return c.json({ authenticated: Boolean(user), user: publicUser(user) });
});

app.get('/api/auth/google/start', (c) => {
  if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) return c.redirect(authRedirect(c, 'google_not_configured'));
  const state = randomHex(24);
  setCookie(c, GOOGLE_STATE_COOKIE, state, { httpOnly: true, sameSite: 'Lax', secure: true, path: '/', maxAge: GOOGLE_STATE_MAX_AGE });
  const params = new URLSearchParams({ client_id: c.env.GOOGLE_CLIENT_ID, redirect_uri: googleRedirectUri(c), response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' });
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

app.get('/api/auth/google/callback', async (c) => {
  const state = getCookie(c, GOOGLE_STATE_COOKIE);
  deleteCookie(c, GOOGLE_STATE_COOKIE, { path: '/' });
  if (!state || state !== c.req.query('state')) return c.redirect(authRedirect(c, 'google_state'));
  const code = c.req.query('code');
  if (!code || !c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) return c.redirect(authRedirect(c, 'google_failed'));
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: c.env.GOOGLE_CLIENT_ID, client_secret: c.env.GOOGLE_CLIENT_SECRET, redirect_uri: googleRedirectUri(c), grant_type: 'authorization_code' }).toString() });
    const token = await tokenResponse.json().catch(() => ({})) as { access_token?: string };
    if (!tokenResponse.ok || !token.access_token) throw new Error('Google token exchange failed.');
    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` } });
    const profile = await profileResponse.json().catch(() => ({})) as { email?: string; email_verified?: boolean; name?: string };
    if (!profileResponse.ok || !profile.email || profile.email_verified !== true) throw new Error('Google profile is not verified.');
    const email = profile.email.trim().toLowerCase();
    const existing = await findUserByEmail(c.env, email);
    const user = existing ? await first<UserRow>(c.env, 'SELECT id, name, email, credits, plan FROM users WHERE id = ?', existing.id) : await createUser(c.env, profile.name?.trim() || email.split('@')[0], email, randomHex(32));
    if (!user) throw new Error('Could not create the account.');
    await beginSession(c, user.id);
    return c.redirect(authRedirect(c));
  } catch {
    return c.redirect(authRedirect(c, 'google_failed'));
  }
});

app.post('/api/auth/signup', async (c) => {
  const input = await c.req.json<{ name?: string; email?: string; password?: string }>().catch(() => ({} as { name?: string; email?: string; password?: string }));
  const name = String(input.name || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
  const password = String(input.password || '');
  if (name.length < 2) return c.json({ error: 'Please enter your name.' }, 400);
  if (!/^\S+@\S+\.\S+$/.test(email)) return c.json({ error: 'Please enter a valid email.' }, 400);
  if (password.length < 8) return c.json({ error: 'Password must be at least 8 characters.' }, 400);
  if (await first(c.env, 'SELECT id FROM users WHERE email = ?', email)) return c.json({ error: 'An account with this email already exists.' }, 409);
  const user = await createUser(c.env, name, email, password);
  if (!user) return c.json({ error: 'Could not create the account.' }, 500);
  await beginSession(c, user.id);
  return c.json({ user: publicUser(user) }, 201);
});

app.post('/api/auth/login', async (c) => {
  const input = await c.req.json<{ email?: string; password?: string }>().catch(() => ({} as { email?: string; password?: string }));
  const login = String(input.email || '').trim();
  const password = String(input.password || '');
  const adminEmail = (c.env.ADMIN_EMAIL || 'admin@fxrkenart.local').trim().toLowerCase();
  if (c.env.ADMIN_USERNAME && c.env.ADMIN_PASSWORD && login === c.env.ADMIN_USERNAME && password === c.env.ADMIN_PASSWORD) {
    let admin = await findUserByEmail(c.env, adminEmail);
    if (!admin) {
      await createUser(c.env, 'FXRKENART Admin', adminEmail, randomHex(32));
      admin = await findUserByEmail(c.env, adminEmail);
    }
    if (!admin) return c.json({ error: 'Could not create the admin account.' }, 500);
    await run(c.env, "UPDATE users SET plan = 'upgrade', credits = 999999, updated_at = CURRENT_TIMESTAMP WHERE id = ?", admin.id);
    const adminUser = await first<UserRow>(c.env, 'SELECT id, name, email, credits, plan FROM users WHERE id = ?', admin.id);
    await beginSession(c, admin.id);
    return c.json({ user: publicUser(adminUser) });
  }
  const user = await findUserByEmail(c.env, login.toLowerCase());
  if (!user || !(await passwordMatches(user, password))) return c.json({ error: 'Email or password is incorrect.' }, 401);
  await beginSession(c, user.id);
  return c.json({ user: publicUser(user) });
});

app.post('/api/auth/logout', async (c) => { await endSession(c); return c.json({ ok: true }); });

app.get('/api/auth/me', async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: 'Authentication required.' }, 401);
  const history = await many(c.env, 'SELECT type, amount, balance_after, note, created_at FROM credit_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', user.id);
  return c.json({ user: publicUser(user), credits: Number(user.credits), history });
});

app.get('/api/credits/packages', (c) => c.json({ packages: [
  { code: 'starter', credits: 1000, amount_vnd: 100000 },
  { code: 'creator', credits: 2750, amount_vnd: 250000 },
  { code: 'pro', credits: 6000, amount_vnd: 500000 },
  { code: 'studio', credits: 13000, amount_vnd: 1000000 },
] }));

app.get('/api/credits/history', async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: 'Authentication required.' }, 401);
  return c.json({ credits: user.credits, history: await many(c.env, 'SELECT type, amount, balance_after, note, created_at FROM credit_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', user.id) });
});

app.post('/api/upload/reference', async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: 'Authentication required.' }, 401);
  const form = await c.req.formData();
  const value = form.get('file');
  if (!(value instanceof File)) return c.json({ error: 'Choose an image to upload.' }, 400);
  if (!value.type.startsWith('image/')) return c.json({ error: 'Only image references are supported.' }, 415);
  if (value.size > 20 * 1024 * 1024) return c.json({ error: 'Reference images must be under 20 MB.' }, 413);
  const id = crypto.randomUUID();
  const key = `users/${user.id}/references/${id}.${safeExtension(value.name, value.type)}`;
  await mediaBucket(c.env).put(key, await value.arrayBuffer(), { httpMetadata: { contentType: value.type, cacheControl: 'private, max-age=31536000, immutable' } });
  await run(c.env, 'INSERT INTO assets (id, user_id, kind, r2_key, mime_type, byte_size) VALUES (?, ?, ?, ?, ?, ?)', id, user.id, 'reference', key, value.type, value.size);
  return c.json({ id, name: value.name || `reference-${id}`, url: `/api/media/${id}`, size: value.size, mimeType: value.type, uploadState: 'uploaded' }, 201);
});

app.get('/api/media/:id', async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: 'Authentication required.' }, 401);
  const id = c.req.param('id');
  const asset = await first<{ r2_key: string; mime_type: string; user_id: string }>(c.env, 'SELECT r2_key, mime_type, user_id FROM assets WHERE id = ?', id);
  if (!asset || asset.user_id !== user.id) return c.json({ error: 'Media not found.' }, 404);
  const object = await mediaBucket(c.env).get(asset.r2_key);
  if (!object) return c.json({ error: 'Media is unavailable.' }, 404);
  return new Response(object.body, { headers: { 'Content-Type': object.httpMetadata?.contentType || asset.mime_type, 'Cache-Control': 'private, max-age=31536000, immutable' } });
});

app.get('/api/library', async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: 'Authentication required.' }, 401);
  const rows = await many<{ generation_id: string; asset_id: string; model: ModelName; prompt: string; created_at: string }>(c.env, `SELECT g.id AS generation_id, a.id AS asset_id, g.model, g.prompt, g.created_at FROM generations g JOIN generation_assets ga ON ga.generation_id = g.id JOIN assets a ON a.id = ga.asset_id WHERE g.user_id = ? AND g.status = 'completed' ORDER BY g.created_at DESC, ga.position ASC`, user.id);
  return c.json({ results: rows.map((row) => ({ id: row.asset_id, url: `/api/media/${row.asset_id}`, model: row.model, prompt: row.prompt, createdAt: row.created_at })) });
});

app.post('/api/generate', async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: 'Authentication required.' }, 401);
  const input = await c.req.json<any>().catch(() => ({}));
  const model = input.model as ModelName;
  const quality = input.quality as Quality;
  const resolution = input.resolution === '4K' ? '4K' : '2K';
  const count = Math.min(4, Math.max(1, Number(input.count || 1)));
  const referenceIds: string[] = Array.isArray(input.reference_ids) ? input.reference_ids.filter((value: unknown): value is string => typeof value === 'string').slice(0, 14) : [];
  if (!isModel(model)) return c.json({ error: 'Model must be Nano Banana PRO or ChatGPT 2.5.' }, 400);
  if (!isQuality(quality)) return c.json({ error: 'Quality is invalid.' }, 400);
  if (typeof input.prompt !== 'string' || !input.prompt.trim() || input.prompt.length > 10000) return c.json({ error: 'Prompt is required and must be under 10,000 characters.' }, 400);
  if (referenceIds.length) {
    const owned = await first<{ total: number }>(c.env, `SELECT COUNT(*) AS total FROM assets WHERE user_id = ? AND kind = 'reference' AND id IN (${referenceIds.map(() => '?').join(',')})`, user.id, ...referenceIds);
    if (Number(owned?.total || 0) !== referenceIds.length) return c.json({ error: 'A reference does not belong to this account.' }, 403);
  }
  const clientRequestId = String(c.req.header('X-Client-Request-Id') || input.client_request_id || '').slice(0, 120);
  if (clientRequestId) {
    const existing = await first<{ generation_id: string }>(c.env, 'SELECT generation_id FROM idempotency_keys WHERE user_id = ? AND key = ?', user.id, clientRequestId);
    if (existing) return c.json({ jobId: existing.generation_id, status: 'queued', deduplicated: true, cost: 0, balance: user.credits }, 202);
  }
  const cost = generationCost(model, quality, resolution, count);
  const update = await run(c.env, 'UPDATE users SET credits = credits - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND credits >= ?', cost, user.id, cost);
  if (!Number(update.meta?.changes || 0)) return c.json({ error: `Insufficient credits. Need ${cost - Number(user.credits)} more.`, balance: user.credits, cost }, 402);
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const balance = Number(user.credits) - cost;
  const statements = [
    database(c.env).prepare('INSERT INTO generations (id, user_id, provider, model, prompt, settings_json, cost_credits, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id, user.id, model === 'Nano Banana PRO' ? 'google' : 'openai', model, input.prompt.trim(), JSON.stringify({ quality, resolution, count, aspect_ratio: input.aspect_ratio || 'Auto', auto_polish: Boolean(input.auto_polish), reference_ids: referenceIds }), cost, 'queued'),
    database(c.env).prepare('INSERT INTO credit_ledger (id, user_id, generation_id, type, amount, balance_after, note) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), user.id, id, 'spent', cost, balance, `${model} generation`),
  ];
  referenceIds.forEach((assetId, position) => {
    statements.push(database(c.env).prepare('INSERT INTO generation_references (generation_id, asset_id, position) VALUES (?, ?, ?)').bind(id, assetId, position));
  });
  if (clientRequestId) statements.push(database(c.env).prepare('INSERT INTO idempotency_keys (user_id, key, generation_id, expires_at) VALUES (?, ?, ?, ?)').bind(user.id, clientRequestId, id, expiresAt));
  await database(c.env).batch(statements);
  const execution = c.executionCtx as unknown as WorkerExecutionContext;
  execution.waitUntil(executeGeneration(c.env, id, user.id, { prompt: input.prompt.trim(), model, quality, resolution, count, aspectRatio: input.aspect_ratio || 'Auto', autoPolish: Boolean(input.auto_polish), referenceIds }));
  return c.json({ jobId: id, status: 'queued', cost, balance }, 202);
});

app.get('/api/generate/:id', async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: 'Authentication required.' }, 401);
  const id = c.req.param('id');
  const job = await first<{ id: string; status: string; model: ModelName; cost_credits: number; error_message: string | null; user_id: string }>(c.env, 'SELECT id, status, model, cost_credits, error_message, user_id FROM generations WHERE id = ?', id);
  if (!job || job.user_id !== user.id) return c.json({ error: 'Generation job not found.' }, 404);
  const assets = job.status === 'completed' ? await many<{ id: string; prompt: string }>(c.env, 'SELECT a.id, g.prompt FROM assets a JOIN generation_assets ga ON ga.asset_id = a.id JOIN generations g ON g.id = ga.generation_id WHERE ga.generation_id = ? ORDER BY ga.position ASC', id) : [];
  return c.json({ id: job.id, status: job.status, model: job.model, cost: job.cost_credits, balance: user.credits, error: job.error_message, images: assets.map((asset) => ({ id: asset.id, url: `/api/media/${asset.id}`, model: job.model, prompt: asset.prompt })) });
});

app.onError((error, c) => c.json({ error: error.message || 'Internal server error.' }, 500));

export default {
  async fetch(request: Request, env: Env, executionCtx: WorkerExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return app.fetch(request, env, executionCtx as never);
    return env.ASSETS.fetch(request);
  },
};
