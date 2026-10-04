import type { AccountResponse, GenerationResult, JobResponse, ModelName, Quality, Resolution, AspectRatio, ReferenceAsset, User } from './types';

const APP_BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const API_ROOT = `${APP_BASE}/api` || '/api';

function endpoint(path: string) {
  return `${API_ROOT}${path}`;
}

function mediaUrl(url: string) {
  if (!url.startsWith('/api/media/')) return url;
  return `${API_ROOT}/media/${url.slice('/api/media/'.length)}`;
}

async function parse<T>(response: Response | Promise<Response>): Promise<T> {
  const resolved = await response;
  const payload = await resolved.json().catch(() => ({}));
  if (!resolved.ok) throw new Error(payload?.error || `Request failed (${resolved.status})`);
  return payload as T;
}

export async function getSession(): Promise<{ authenticated: boolean; user: User | null }> {
  return parse(fetch(endpoint('/auth/session')));
}

export async function authenticate(mode: 'login' | 'signup', values: { name?: string; email: string; password: string }): Promise<{ user: User }> {
  return parse(fetch(endpoint(`/auth/${mode}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  }));
}

export function googleAuthUrl() {
  return endpoint('/auth/google/start');
}

export async function logout(): Promise<void> {
  await fetch(endpoint('/auth/logout'), { method: 'POST' });
}

export async function getAccount(): Promise<AccountResponse> {
  return parse(fetch(endpoint('/auth/me')));
}

export async function uploadReference(file: File): Promise<ReferenceAsset> {
  const form = new FormData();
  form.append('file', file);
  const asset = await parse<ReferenceAsset>(fetch(endpoint('/upload/reference'), { method: 'POST', body: form }));
  return { ...asset, url: mediaUrl(asset.url) };
}

export async function getLibrary(): Promise<GenerationResult[]> {
  const data = await parse<{ results: GenerationResult[] }>(fetch(endpoint('/library')));
  return data.results.map((result) => ({ ...result, url: mediaUrl(result.url) }));
}

export async function createGeneration(input: {
  prompt: string;
  model: ModelName;
  quality: Quality;
  resolution: Resolution;
  count: number;
  aspectRatio: AspectRatio;
  autoPolish: boolean;
  referenceIds: string[];
  clientRequestId: string;
}): Promise<{ jobId: string; status: string; cost: number; balance: number }> {
  return parse(fetch(endpoint('/generate'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Request-Id': input.clientRequestId,
    },
    body: JSON.stringify({
      prompt: input.prompt,
      model: input.model,
      quality: input.quality,
      resolution: input.resolution,
      count: input.count,
      aspect_ratio: input.aspectRatio,
      auto_polish: input.autoPolish,
      reference_ids: input.referenceIds,
      client_request_id: input.clientRequestId,
    }),
  }));
}

export async function getGeneration(jobId: string): Promise<JobResponse> {
  const job = await parse<JobResponse>(fetch(endpoint(`/generate/${encodeURIComponent(jobId)}`)));
  return { ...job, images: job.images?.map((image) => ({ ...image, url: mediaUrl(image.url) })) };
}
