import { Hono } from 'hono';
import { currentUser } from '../auth';
import { one } from '../db';
import { readMedia } from '../storage/local';
import { isMediaId } from './upload';

export const mediaRoutes = new Hono();

mediaRoutes.get('/:id', async (c) => {
  const user = currentUser(c);
  if (!user) return c.json({ error: 'Authentication required.' }, 401);
  const id = c.req.param('id');
  if (!isMediaId(id)) return c.json({ error: 'Media not found.' }, 404);
  const asset = one<{ r2_key: string; mime_type: string; user_id: string }>('SELECT r2_key, mime_type, user_id FROM assets WHERE id = ?', id);
  if (!asset || asset.user_id !== user.id) return c.json({ error: 'Media not found.' }, 404);
  try {
    const bytes = await readMedia(asset.r2_key);
    return new Response(bytes, { headers: { 'Content-Type': asset.mime_type, 'Cache-Control': 'private, max-age=31536000, immutable' } });
  } catch {
    return c.json({ error: 'Media is unavailable.' }, 404);
  }
});
