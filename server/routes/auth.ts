import { Hono } from 'hono';
import type { Context } from 'hono';
import { createUser, currentUser, endSession, findUserByEmail, findUserById, passwordMatches, publicUser, beginSession } from '../auth';
import { one } from '../db';
import { config } from '../config';

const GOOGLE_STATE_COOKIE = 'fxrkenart_google_state';
const GOOGLE_STATE_MAX_AGE = 60 * 10;

function secureCookies() {
  return process.env.NODE_ENV === 'production';
}

function appUrl(c: Context, error?: string) {
  const target = config.googleAppUrl ? new URL(config.googleAppUrl) : new URL(c.req.url);
  if (!config.googleAppUrl) {
    target.pathname = target.pathname.replace(/\/api\/auth\/google\/(?:start|callback)\/?$/, '') || '/';
    target.search = '';
    target.hash = '';
  }
  if (error) target.searchParams.set('auth_error', error);
  return target.toString();
}

function redirectUri(c: Context) {
  if (config.googleRedirectUri) return config.googleRedirectUri;
  const target = new URL(c.req.url);
  target.pathname = target.pathname.replace(/\/start\/?$/, '/callback');
  target.search = '';
  target.hash = '';
  return target.toString();
}

export const authRoutes = new Hono();

authRoutes.get('/session', (c) => {
  const user = currentUser(c);
  return c.json({ authenticated: Boolean(user), user: publicUser(user) });
});

authRoutes.get('/google/start', (c) => {
  if (!config.googleClientId || !config.googleClientSecret) return c.redirect(appUrl(c, 'google_not_configured'));
  const state = crypto.randomBytes(24).toString('hex');
  setCookie(c, GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: secureCookies(),
    path: '/',
    maxAge: GOOGLE_STATE_MAX_AGE,
  });
  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: redirectUri(c),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

authRoutes.get('/google/callback', async (c) => {
  const state = getCookie(c, GOOGLE_STATE_COOKIE);
  const receivedState = c.req.query('state');
  deleteCookie(c, GOOGLE_STATE_COOKIE, { path: '/' });
  if (!state || !receivedState || state !== receivedState) return c.redirect(appUrl(c, 'google_state'));

  const code = c.req.query('code');
  if (!code || !config.googleClientId || !config.googleClientSecret) return c.redirect(appUrl(c, 'google_failed'));

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: redirectUri(c),
        grant_type: 'authorization_code',
      }).toString(),
    });
    const token = await tokenResponse.json() as { access_token?: string };
    if (!tokenResponse.ok || !token.access_token) throw new Error('Google token exchange failed.');

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const profile = await profileResponse.json() as { email?: string; email_verified?: boolean; name?: string };
    if (!profileResponse.ok || !profile.email || profile.email_verified !== true) throw new Error('Google profile is not verified.');

    const email = profile.email.trim().toLowerCase();
    const existing = findUserByEmail(email);
    const user = existing
      ? findUserById(existing.id)!
      : await createUser(profile.name?.trim() || email.split('@')[0], email, crypto.randomBytes(32).toString('base64url'));
    beginSession(c, user.id);
    return c.redirect(appUrl(c));
  } catch {
    return c.redirect(appUrl(c, 'google_failed'));
  }
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
