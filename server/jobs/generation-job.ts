import crypto from 'node:crypto';
import { config } from '../config';
import { many, one, run, transaction } from '../db';
import { generate, uploadReference } from '../providers/higgsfield';
import { readMedia, saveDownloadedImage, newAssetId } from '../storage/local';

interface GenerationInput {
  prompt: string;
  model: 'Soul' | 'Nano Banana PRO';
  quality: 'Low' | 'Medium' | 'High';
  resolution: '2K' | '4K';
  count: number;
  aspectRatio: string;
  autoPolish: boolean;
  referenceIds: string[];
}

interface ReferenceRow { id: string; r2_key: string; mime_type: string; }

async function providerReferenceUrls(userId: string, referenceIds: string[]) {
  if (!referenceIds.length) return [];
  const placeholders = referenceIds.map(() => '?').join(',');
  const rows = many<ReferenceRow>(`SELECT id, r2_key, mime_type FROM assets WHERE user_id = ? AND kind = 'reference' AND id IN (${placeholders})`, userId, ...referenceIds);
  if (rows.length !== referenceIds.length) throw new Error('One or more references do not belong to this account.');
  const byId = new Map(rows.map((row) => [row.id, row]));
  const urls: string[] = [];
  for (const id of referenceIds) {
    const row = byId.get(id)!;
    const bytes = new Uint8Array(await readMedia(row.r2_key));
    urls.push(await uploadReference(bytes, row.mime_type));
  }
  return urls;
}

function markFailed(generationId: string, message: string) {
  transaction(() => {
    const job = one<{ user_id: string; cost_credits: number; status: string }>('SELECT user_id, cost_credits, status FROM generations WHERE id = ?', generationId);
    if (!job || ['completed', 'failed', 'canceled', 'nsfw'].includes(job.status)) return;
    const user = one<{ credits: number }>('SELECT credits FROM users WHERE id = ?', job.user_id);
    const balance = Number(user?.credits || 0) + Number(job.cost_credits);
    run('UPDATE users SET credits = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', balance, job.user_id);
    run('INSERT INTO credit_ledger (id, user_id, generation_id, type, amount, balance_after, note) VALUES (?, ?, ?, ?, ?, ?, ?)', crypto.randomUUID(), job.user_id, generationId, 'refunded', job.cost_credits, balance, message);
    run('UPDATE generations SET status = ?, error_message = ?, failed_at = CURRENT_TIMESTAMP WHERE id = ?', 'failed', message, generationId);
  });
}

export async function executeGeneration(generationId: string, userId: string, input: GenerationInput) {
  try {
    run('UPDATE generations SET status = ? WHERE id = ?', 'submitting', generationId);
    const referenceUrls = await providerReferenceUrls(userId, input.referenceIds);
    const provider = await generate({ ...input, referenceUrls }, (status) => run('UPDATE generations SET status = ? WHERE id = ?', status === 'processing' ? 'processing' : 'submitting', generationId));
    run('UPDATE generations SET provider_request_id = ?, status = ? WHERE id = ?', provider.requestId, 'processing', generationId);
    const stored = [];
    for (let index = 0; index < provider.urls.length; index += 1) {
      const assetId = newAssetId();
      const media = await saveDownloadedImage(userId, generationId, index, provider.urls[index]);
      stored.push({ assetId, media });
    }
    transaction(() => {
      for (let index = 0; index < stored.length; index += 1) {
        const { assetId, media } = stored[index];
        run('INSERT INTO assets (id, user_id, kind, r2_key, mime_type, byte_size) VALUES (?, ?, ?, ?, ?, ?)', assetId, userId, 'generated', media.key, media.mimeType, media.size);
        run('INSERT INTO generation_assets (generation_id, asset_id, position) VALUES (?, ?, ?)', generationId, assetId, index);
      }
      run('UPDATE generations SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?', 'completed', generationId);
    });
  } catch (error) {
    markFailed(generationId, error instanceof Error ? error.message : 'Generation failed.');
  }
}
