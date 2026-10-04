import type { AccountResponse, GenerationResult, JobResponse, ModelName, Quality, Resolution, AspectRatio, ReferenceAsset, User } from './types';

async function parse<T>(response: Response | Promise<Response>): Promise<T> {
  const resolved = await response;
  const payload = await resolved.json().catch(() => ({}));
  if (!resolved.ok) throw new Error(payload?.error || `Request failed (${resolved.status})`);
  return payload as T;
}

export async function getSession(): Promise<{ authenticated: boolean; user: User | null }> {
  return parse(fetch('/api/auth/session'));
}

export async function authenticate(mode: 'login' | 'signup', values: { name?: string; email: string; password: string }): Promise<{ user: User }> {
  return parse(fetch(`/api/auth/${mode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  }));
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}

export async function getAccount(): Promise<AccountResponse> {
  return parse(fetch('/api/auth/me'));
}

export async function uploadReference(file: File): Promise<ReferenceAsset> {
  const form = new FormData();
  form.append('file', file);
  return parse(fetch('/api/upload/reference', { method: 'POST', body: form }));
}

export async function getLibrary(): Promise<GenerationResult[]> {
  const data = await parse<{ results: GenerationResult[] }>(fetch('/api/library'));
  return data.results;
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
  return parse(fetch('/api/generate', {
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
  return parse(fetch(`/api/generate/${encodeURIComponent(jobId)}`));
}
