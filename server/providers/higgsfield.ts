import { config, type ModelName } from '../config';

function authHeaders() {
  return config.hfCredentials ? { Authorization: `Key ${config.hfCredentials}` } : {};
}

function unwrapUrls(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(unwrapUrls);
  if (typeof value === 'string') return /^https?:\/\//i.test(value) ? [value] : [];
  if (typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  if (typeof record.url === 'string') return [record.url];
  return Object.values(record).flatMap(unwrapUrls);
}

function imageUrls(payload: any) {
  const candidates = [payload?.images, payload?.image, payload?.output?.images, payload?.output?.image, payload?.result?.images, payload?.result?.image, payload?.data?.images, payload?.data?.image];
  return [...new Set(candidates.flatMap(unwrapUrls))];
}

export async function uploadReference(bytes: Uint8Array, contentType: string) {
  if (!config.hfCredentials) throw new Error('HF_CREDENTIALS is not configured on the server.');
  const signedResponse = await fetch(`${config.hfBase}/files/generate-upload-url`, { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ content_type: contentType }) });
  const signed = await signedResponse.json().catch(() => ({})) as any;
  if (!signedResponse.ok || !signed.upload_url) throw new Error(signed?.detail || signed?.message || 'Could not create provider upload URL.');
  const uploadResponse = await fetch(signed.upload_url, { method: 'PUT', headers: signed.upload_headers || { 'Content-Type': contentType }, body: bytes as BodyInit });
  if (!uploadResponse.ok) throw new Error('Provider reference upload failed.');
  return String(signed.public_url || signed.url);
}

export async function generate(input: { model: ModelName; prompt: string; quality: string; resolution: string; count: number; aspectRatio: string; autoPolish: boolean; referenceUrls: string[] }, onStatus: (value: string) => void) {
  if (!config.hfCredentials) throw new Error('HF_CREDENTIALS is not configured on the server.');
  const count = Math.min(4, Math.max(1, input.count));
  let endpointPath: string;
  let body: Record<string, unknown>;
  if (input.model === 'Nano Banana PRO') {
    if (!config.nanoPath) throw new Error('Set HF_NANO_BANANA_PATH before using Nano Banana PRO.');
    endpointPath = config.nanoPath;
    body = { prompt: input.prompt, image_urls: input.referenceUrls.length ? input.referenceUrls : undefined, quality: input.quality.toLowerCase(), resolution: input.resolution.toLowerCase(), aspect_ratio: input.aspectRatio.toLowerCase(), enhance_prompt: input.autoPolish, batch_size: count };
  } else {
    if (!config.chatgpt25Path) throw new Error('Set HF_CHATGPT_25_PATH before using ChatGPT 2.5.');
    endpointPath = config.chatgpt25Path;
    body = { prompt: input.prompt, image_urls: input.referenceUrls.length ? input.referenceUrls : undefined, quality: input.quality.toLowerCase(), resolution: input.resolution.toLowerCase(), aspect_ratio: input.aspectRatio.toLowerCase(), enhance_prompt: input.autoPolish, batch_size: count };
  }
  const response = await fetch(`${config.hfBase}${endpointPath}`, { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({})) as any;
  if (!response.ok) throw new Error(payload?.detail || payload?.message || `Provider rejected generation (${response.status}).`);
  const immediate = imageUrls(payload);
  if (immediate.length) return { urls: immediate, requestId: payload.request_id || payload.id || null };
  const requestId = payload.request_id || payload.id;
  const statusUrl = payload.status_url || (requestId ? `${config.hfBase}/requests/${requestId}/status` : '');
  if (!statusUrl) throw new Error('Provider did not return a request status URL.');
  for (let attempt = 0; attempt < 180; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const statusResponse = await fetch(statusUrl, { headers: authHeaders() });
    const statusPayload = await statusResponse.json().catch(() => ({})) as any;
    if (!statusResponse.ok) throw new Error(statusPayload?.detail || statusPayload?.message || `Provider status error (${statusResponse.status}).`);
    const status = String(statusPayload.status || statusPayload.state || '').toLowerCase();
    if (['completed', 'succeeded', 'success'].includes(status)) {
      const urls = imageUrls(statusPayload);
      if (!urls.length) throw new Error('Provider completed without returning an image URL.');
      return { urls, requestId };
    }
    if (['failed', 'canceled', 'cancelled', 'nsfw'].includes(status)) throw new Error(statusPayload.error || statusPayload.message || `Provider returned ${status}.`);
    onStatus(status === 'processing' ? 'processing' : 'submitting');
  }
  throw new Error('Provider generation timed out.');
}
