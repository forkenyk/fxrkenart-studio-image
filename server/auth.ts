import crypto from 'node:crypto';
import { promisify } from 'node:util';
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { one, run, transaction } from './db';
import { config } from './config';

const scryptAsync = promisify(crypto.scrypt);
const SESSION_COOKIE = 'fxrkenart_sid';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export interface UserRow {
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

export function publicUser(user: UserRow | null) {
  return user ? { id: user.id, name: user.name, email: user.email, credits: Number(user.credits) } : null;
}

async function digest(password: string, salt: string) {
  const value = await scryptAsync(password, salt, 64);
  return (value as Buffer).toString('hex');
}

export async function passwordMatches(user: StoredUser, password: string) {
  const actual = Buffer.from(user.password_hash, 'hex');
  const expected = Buffer.from(await digest(password, user.password_salt), 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export async function createUser(name: string, email: string, password: string) {
  const id = crypto.randomUUID();
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = await digest(password, salt);
  transaction(() => {
    run('INSERT INTO users (id, name, email, password_hash, password_salt, credits) VALUES (?, ?, ?, ?, ?, ?)', id, name, email, passwordHash, salt, config.startingCredits);
    run('INSERT INTO credit_ledger (id, user_id, type, amount, balance_after, note) VALUES (?, ?, ?, ?, ?, ?)', crypto.randomUUID(), id, 'granted', config.startingCredits, config.startingCredits, 'Welcome credits');
  });
  return one<UserRow>('SELECT id, name, email, credits, plan FROM users WHERE id = ?', id)!;
}

export function findUserByEmail(email: string) {
  return one<StoredUser>('SELECT id, name, email, credits, plan, password_hash, password_salt FROM users WHERE email = ?', email);
}

export function findUserById(id: string) {
  return one<UserRow>('SELECT id, name, email, credits, plan FROM users WHERE id = ?', id);
}

export function currentUser(c: Context) {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (!sessionId) return null;
  const session = one<{ user_id: string; expires_at: string }>('SELECT user_id, expires_at FROM sessions WHERE id = ?', sessionId);
  if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
    if (sessionId) run('DELETE FROM sessions WHERE id = ?', sessionId);
    return null;
  }
  return findUserById(session.user_id);
}

export function beginSession(c: Context, userId: string) {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
  run('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)', id, userId, expiresAt);
  setCookie(c, SESSION_COOKIE, id, { httpOnly: true, sameSite: 'Lax', path: '/', maxAge: SESSION_MAX_AGE, secure: process.env.NODE_ENV === 'production' });
}

export function endSession(c: Context) {
  const id = getCookie(c, SESSION_COOKIE);
  if (id) run('DELETE FROM sessions WHERE id = ?', id);
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}
