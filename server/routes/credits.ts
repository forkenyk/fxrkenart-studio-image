import { Hono } from 'hono';
import { currentUser } from '../auth';
import { many } from '../db';

export const creditRoutes = new Hono();

creditRoutes.get('/history', (c) => {
  const user = currentUser(c);
  if (!user) return c.json({ error: 'Authentication required.' }, 401);
  const history = many('SELECT type, amount, balance_after, note, created_at FROM credit_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', user.id);
  return c.json({ credits: user.credits, history });
});

creditRoutes.get('/packages', (c) => c.json({ packages: [
  { code: 'starter', credits: 1000, amount_vnd: 100000 },
  { code: 'creator', credits: 2750, amount_vnd: 250000 },
  { code: 'pro', credits: 6000, amount_vnd: 500000 },
  { code: 'studio', credits: 13000, amount_vnd: 1000000 },
] }));
