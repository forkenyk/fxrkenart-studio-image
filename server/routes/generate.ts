import crypto from 'node:crypto';
import { Hono } from 'hono';
import { currentUser } from '../auth';
import { generationCost, type ModelName, type Quality } from '../config';
import { many, one, run, transaction } from '../db';
import { executeGeneration } from '../jobs/generation-job';

const models: ModelName[] = ['Soul', 'Nano Banana PRO'];
const qualities: Quality[] = ['Low', 'Medium', 'High'];

export const generationRoutes = new Hono();

generationRoutes.post('/', async (c) => {
  const user = currentUser(c);
  if (!user) return c.json({ error: 'Authentication required.' }, 401);
  const input = await c.req.json<any>().catch(() => ({}));
  const model = input.model as ModelName;
  const quality = input.quality as Quality;
  const resolution = input.resolution === '4K' ? '4K' : '2K';
  const count = Math.min(4, Math.max(1, Number(input.count || 1)));
  const referenceIds = Array.isArray(input.reference_ids) ? input.reference_ids.filter((value: unknown): value is string => typeof value === 'string').slice(0, 16) : [];
  if (!models.includes(model)) return c.json({ error: 'Model must be Soul or Nano Banana PRO.' }, 400);
  if (!qualities.includes(quality)) return c.json({ error: 'Quality is invalid.' }, 400);
  if (typeof input.prompt !== 'string' || !input.prompt.trim() || input.prompt.length > 10000) return c.json({ error: 'Prompt is required and must be under 10,000 characters.' }, 400);
  if (referenceIds.length) {
    const placeholders = referenceIds.map(() => '?').join(',');
    const countRow = one<{ total: number }>(`SELECT COUNT(*) AS total FROM assets WHERE user_id = ? AND kind = 'reference' AND id IN (${placeholders})`, user.id, ...referenceIds);
    if (Number(countRow?.total || 0) !== referenceIds.length) return c.json({ error: 'A reference does not belong to this account.' }, 403);
  }
  const clientRequestId = String(c.req.header('X-Client-Request-Id') || input.client_request_id || '').slice(0, 120);
  if (clientRequestId) {
    const existing = one<{ generation_id: string }>('SELECT generation_id FROM idempotency_keys WHERE user_id = ? AND key = ?', user.id, clientRequestId);
    if (existing) return c.json({ jobId: existing.generation_id, status: 'queued', deduplicated: true, cost: 0, balance: user.credits }, 202);
  }
  const cost = generationCost(model, quality, resolution, count);
  if (user.credits < cost) return c.json({ error: `Insufficient credits. Need ${cost - user.credits} more.`, balance: user.credits, cost }, 402);
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  transaction(() => {
    const balance = user.credits - cost;
    run('UPDATE users SET credits = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', balance, user.id);
    run('INSERT INTO generations (id, user_id, provider, model, prompt, settings_json, cost_credits, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', id, user.id, model === 'Soul' ? 'higgsfield' : 'google', model, input.prompt.trim(), JSON.stringify({ quality, resolution, count, aspect_ratio: input.aspect_ratio || 'Auto', auto_polish: Boolean(input.auto_polish), reference_ids: referenceIds }), cost, 'queued');
    run('INSERT INTO credit_ledger (id, user_id, generation_id, type, amount, balance_after, note) VALUES (?, ?, ?, ?, ?, ?, ?)', crypto.randomUUID(), user.id, id, 'spent', cost, balance, `${model} generation`);
    if (clientRequestId) run('INSERT INTO idempotency_keys (user_id, key, generation_id, expires_at) VALUES (?, ?, ?, ?)', user.id, clientRequestId, id, expiresAt);
  });
  void executeGeneration(id, user.id, { prompt: input.prompt.trim(), model, quality, resolution, count, aspectRatio: input.aspect_ratio || 'Auto', autoPolish: Boolean(input.auto_polish), referenceIds });
  return c.json({ jobId: id, status: 'queued', cost, balance: user.credits - cost }, 202);
});

generationRoutes.get('/:id', (c) => {
  const user = currentUser(c);
  if (!user) return c.json({ error: 'Authentication required.' }, 401);
  const id = c.req.param('id');
  const job = one<{ id: string; status: string; model: ModelName; cost_credits: number; error_message: string | null; user_id: string }>('SELECT id, status, model, cost_credits, error_message, user_id FROM generations WHERE id = ?', id);
  if (!job || job.user_id !== user.id) return c.json({ error: 'Generation job not found.' }, 404);
  const assets = job.status === 'completed' ? many<{ id: string; prompt: string }>('SELECT a.id, g.prompt FROM assets a JOIN generation_assets ga ON ga.asset_id = a.id JOIN generations g ON g.id = ga.generation_id WHERE ga.generation_id = ? ORDER BY ga.position ASC', id) : [];
  return c.json({ id: job.id, status: job.status, model: job.model, cost: job.cost_credits, balance: user.credits, error: job.error_message, images: assets.map((asset) => ({ id: asset.id, url: `/api/media/${asset.id}`, model: job.model, prompt: asset.prompt })) });
});
