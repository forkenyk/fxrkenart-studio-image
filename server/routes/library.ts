import { Hono } from 'hono';
import { currentUser } from '../auth';
import { many } from '../db';

export const libraryRoutes = new Hono();

libraryRoutes.get('/', (c) => {
  const user = currentUser(c);
  if (!user) return c.json({ error: 'Authentication required.' }, 401);
  const rows = many<{ generation_id: string; asset_id: string; model: 'Nano Banana PRO' | 'ChatGPT 2.5'; prompt: string; created_at: string }>(`SELECT g.id AS generation_id, a.id AS asset_id, g.model, g.prompt, g.created_at FROM generations g JOIN generation_assets ga ON ga.generation_id = g.id JOIN assets a ON a.id = ga.asset_id WHERE g.user_id = ? AND g.status = 'completed' ORDER BY g.created_at DESC, ga.position ASC`, user.id);
  return c.json({ results: rows.map((row) => ({ id: row.asset_id, url: `/api/media/${row.asset_id}`, model: row.model, prompt: row.prompt, createdAt: row.created_at })) });
});
