import crypto from 'node:crypto';
import { Hono } from 'hono';
import { currentUser } from '../auth';
import { run } from '../db';
import { saveUploadedFile, newAssetId } from '../storage/local';

export const uploadRoutes = new Hono();

uploadRoutes.post('/reference', async (c) => {
  const user = currentUser(c);
  if (!user) return c.json({ error: 'Authentication required.' }, 401);
  const form = await c.req.formData();
  const value = form.get('file');
  if (!(value instanceof File)) return c.json({ error: 'Choose an image to upload.' }, 400);
  if (!value.type.startsWith('image/')) return c.json({ error: 'Only image references are supported.' }, 415);
  if (value.size > 20 * 1024 * 1024) return c.json({ error: 'Reference images must be under 20 MB.' }, 413);
  const id = newAssetId();
  const media = await saveUploadedFile(user.id, id, value);
  run('INSERT INTO assets (id, user_id, kind, r2_key, mime_type, byte_size) VALUES (?, ?, ?, ?, ?, ?)', id, user.id, 'reference', media.key, media.mimeType, media.size);
  return c.json({ id, name: value.name, url: `/api/media/${id}`, size: media.size, mimeType: media.mimeType, uploadState: 'uploaded' }, 201);
});

export function isMediaId(value: string) {
  return /^[a-f0-9-]{20,}$/i.test(value);
}
