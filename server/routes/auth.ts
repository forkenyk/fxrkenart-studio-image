import { Hono } from 'hono';
import { createUser, currentUser, endSession, findUserByEmail, passwordMatches, publicUser, beginSession } from '../auth';
import { one } from '../db';

export const authRoutes = new Hono();

authRoutes.get('/session', (c) => {
  const user = currentUser(c);
  return c.json({ authenticated: Boolean(user), user: publicUser(user) });
});

authRoutes.post('/signup', async (c) => {
  const input = await c.req.json<{ name?: string; email?: string; password?: string }>().catch(() => ({}));
  const name = String(input.name || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
  const password = String(input.password || '');
  if (name.length < 2) return c.json({ error: 'Please enter your name.' }, 400);
  if (!/^\S+@\S+\.\S+$/.test(email)) return c.json({ error: 'Please enter a valid email.' }, 400);
  if (password.length < 8) return c.json({ error: 'Password must be at least 8 characters.' }, 400);
  if (one('SELECT id FROM users WHERE email = ?', email)) return c.json({ error: 'An account with this email already exists.' }, 409);
  const user = await createUser(name, email, password);
  beginSession(c, user.id);
  return c.json({ user: publicUser(user) }, 201);
});

authRoutes.post('/login', async (c) => {
  const input = await c.req.json<{ email?: string; password?: string }>().catch(() => ({}));
  const user = findUserByEmail(String(input.email || '').trim().toLowerCase());
  if (!user || !(await passwordMatches(user, String(input.password || '')))) return c.json({ error: 'Email or password is incorrect.' }, 401);
  beginSession(c, user.id);
  return c.json({ user: publicUser(user) });
});

authRoutes.post('/logout', (c) => {
  endSession(c);
  return c.json({ ok: true });
});

authRoutes.get('/me', (c) => {
  const user = currentUser(c);
  if (!user) return c.json({ error: 'Authentication required.' }, 401);
  return c.json({ user: publicUser(user) });
});
