import crypto from 'node:crypto';
import { generateImage } from '../../worker/providers';
import { config } from '../config';
import { many, one, run, transaction } from '../db';
import { readMedia, saveImageBytes, newAssetId } from '../storage/local';

interface GenerationInput {
  prompt: string;
  model: 'Nano Banana PRO' | 'ChatGPT 2.5';
  quality: 'Low' | 'Medium' | 'High';
  resolution: '2K' | '4K';
  count: number;
  aspectRatio: string;
  autoPolish: boolean;
  referenceIds: string[];
}

interface ReferenceRow { id: string; r2_key: string; mime_type: string; }

async function providerReferences(userId: string, referenceIds: string[]) {
  if (!referenceIds.length) return [];
  const placeholders = referenceIds.map(() => '?').join(',');
  const rows = many<ReferenceRow>(`SELECT id, r2_key, mime_type FROM assets WHERE user_id = ? AND kind = 'reference' AND id IN (${placeholders})`, userId, ...referenceIds);
  if (rows.length !== referenceIds.length) throw new Error('One or more references do not belong to this account.');
  const byId = new Map(rows.map((row) => [row.id, row]));
  const images: Array<{ bytes: ArrayBuffer; mimeType: string }> = [];
  for (const id of referenceIds) {
    const row = byId.get(id)!;
    const bytes = new Uint8Array(await readMedia(row.r2_key));
    images.push({ bytes: bytes.slice().buffer as ArrayBuffer, mimeType: row.mime_type });
  }
  return images;
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
    const references = await providerReferences(userId, input.referenceIds);
    const provider = await generateImage({ OPENAI_API_KEY: config.openAiApiKey, OPENAI_IMAGE_MODEL: config.openAiImageModel, GEMINI_API_KEY: config.geminiApiKey, GEMINI_IMAGE_MODEL: config.geminiImageModel }, { ...input, references });
    run('UPDATE generations SET provider_request_id = ?, status = ? WHERE id = ?', `${input.model}:${generationId}`, 'processing', generationId);
    const stored = [];
    for (let index = 0; index < provider.length; index += 1) {
      const assetId = newAssetId();
      const media = await saveImageBytes(userId, generationId, index, provider[index].bytes, provider[index].mimeType);
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
