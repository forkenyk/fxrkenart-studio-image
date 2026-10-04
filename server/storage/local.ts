import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config';

export async function ensureStorage() {
  await mkdir(config.mediaDir, { recursive: true });
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function relativeKey(...parts: string[]) {
  return parts.map(safeSegment).join('/');
}

function absoluteKey(key: string) {
  const absolute = path.resolve(config.mediaDir, key);
  if (!absolute.startsWith(`${config.mediaDir}${path.sep}`)) throw new Error('Invalid media key.');
  return absolute;
}

export async function saveUploadedFile(userId: string, assetId: string, file: File) {
  await ensureStorage();
  const extension = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const key = relativeKey(userId, 'references', `${assetId}.${extension || 'bin'}`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  await mkdir(path.dirname(absoluteKey(key)), { recursive: true });
  await writeFile(absoluteKey(key), bytes);
  return { key, size: bytes.byteLength, mimeType: file.type || 'application/octet-stream' };
}

export async function saveDownloadedImage(userId: string, generationId: string, index: number, url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not copy provider image (${response.status}).`);
  const mimeType = response.headers.get('content-type')?.split(';')[0] || 'image/png';
  const extension = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : mimeType.includes('webp') ? 'webp' : 'png';
  const key = relativeKey(userId, 'generations', generationId, `${index}.${extension}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  await mkdir(path.dirname(absoluteKey(key)), { recursive: true });
  await writeFile(absoluteKey(key), bytes);
  return { key, size: bytes.byteLength, mimeType };
}

export async function saveImageBytes(userId: string, generationId: string, index: number, bytes: ArrayBuffer, mimeType = 'image/png') {
  await ensureStorage();
  const extension = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : mimeType.includes('webp') ? 'webp' : 'png';
  const key = relativeKey(userId, 'generations', generationId, `${index}.${extension}`);
  await mkdir(path.dirname(absoluteKey(key)), { recursive: true });
  await writeFile(absoluteKey(key), new Uint8Array(bytes));
  return { key, size: bytes.byteLength, mimeType };
}

export async function readMedia(key: string) {
  return readFile(absoluteKey(key));
}

export function newAssetId() {
  return crypto.randomUUID();
}
