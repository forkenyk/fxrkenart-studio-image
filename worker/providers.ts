export type ModelName = 'Nano Banana PRO' | 'ChatGPT 2.5';
export type Quality = 'Low' | 'Medium' | 'High';

export interface ProviderEnv {
  OPENAI_API_KEY?: string;
  OPENAI_IMAGE_MODEL?: string;
  GEMINI_API_KEY?: string;
  GEMINI_IMAGE_MODEL?: string;
}

export interface ReferenceImage {
  bytes: ArrayBuffer;
  mimeType: string;
}

export interface GeneratedImage {
  bytes: ArrayBuffer;
  mimeType: string;
}

export interface GenerateInput {
  model: ModelName;
  prompt: string;
  quality: Quality;
  resolution: string;
  count: number;
  aspectRatio: string;
  autoPolish: boolean;
  references: ReferenceImage[];
}

function imageSize(resolution: string) {
  return resolution === '4K' ? '4K' : '2K';
}

function aspectRatio(value: string) {
  const allowed = new Set(['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']);
  return allowed.has(value) ? value : '1:1';
}

function openAiSize(value: string) {
  if (value === '16:9') return '1536x1024';
  if (value === '9:16') return '1024x1536';
  return '1024x1024';
}

function base64ToArrayBuffer(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

async function responseError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => ({})) as any;
  return payload?.error?.message || payload?.message || payload?.detail || `${fallback} (${response.status}).`;
}

function findImageBlock(value: unknown): { data?: string; mime_type?: string } | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findImageBlock(item);
      if (found) return found;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.data === 'string' && (typeof record.mime_type === 'string' || record.type === 'image' || record.type === 'output_image')) return { data: record.data, mime_type: typeof record.mime_type === 'string' ? record.mime_type : 'image/png' };
  if (typeof record.b64_json === 'string') return { data: record.b64_json, mime_type: typeof record.mime_type === 'string' ? record.mime_type : 'image/png' };
  if (typeof record.image_bytes === 'string') return { data: record.image_bytes, mime_type: typeof record.mime_type === 'string' ? record.mime_type : 'image/png' };
  for (const child of Object.values(record)) {
    const found = findImageBlock(child);
    if (found) return found;
  }
  return null;
}

async function imageFromOpenAiItem(item: any): Promise<GeneratedImage | null> {
  if (typeof item?.b64_json === 'string') return { bytes: base64ToArrayBuffer(item.b64_json), mimeType: 'image/png' };
  if (typeof item?.url === 'string') {
    const response = await fetch(item.url);
    if (!response.ok) throw new Error(`Could not download the OpenAI image (${response.status}).`);
    return { bytes: await response.arrayBuffer(), mimeType: response.headers.get('content-type')?.split(';')[0] || 'image/png' };
  }
  return null;
}

async function generateWithOpenAi(env: ProviderEnv, input: GenerateInput): Promise<GeneratedImage[]> {
  if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured on the server.');
  const model = env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-sunburst';
  const headers = { Authorization: `Bearer ${env.OPENAI_API_KEY}` };
  let response: Response;

  if (input.references.length) {
    const form = new FormData();
    form.append('model', model);
    form.append('prompt', input.prompt);
    form.append('quality', input.quality.toLowerCase());
    form.append('size', openAiSize(input.aspectRatio));
    form.append('n', String(Math.min(4, Math.max(1, input.count))));
    input.references.forEach((reference, index) => {
      form.append('image[]', new Blob([reference.bytes], { type: reference.mimeType }), `reference-${index}.png`);
    });
    response = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers, body: form });
  } else {
    response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: input.prompt,
        quality: input.quality.toLowerCase(),
        size: openAiSize(input.aspectRatio),
        n: Math.min(4, Math.max(1, input.count)),
        output_format: 'png',
      }),
    });
  }

  if (!response.ok) throw new Error(await responseError(response, 'OpenAI rejected the image request'));
  const payload = await response.json().catch(() => ({})) as any;
  const images = await Promise.all((Array.isArray(payload?.data) ? payload.data : []).map(imageFromOpenAiItem));
  const valid = images.filter((image): image is GeneratedImage => Boolean(image));
  if (!valid.length) throw new Error('OpenAI completed without returning an image.');
  return valid;
}

function googleInput(input: GenerateInput) {
  const contents: Array<Record<string, string>> = [{ type: 'text', text: input.autoPolish ? `${input.prompt}\n\nImprove the visual brief while preserving the requested subject and intent.` : input.prompt }];
  for (const reference of input.references) {
    const bytes = new Uint8Array(reference.bytes);
    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
    contents.push({ type: 'image', mime_type: reference.mimeType, data: btoa(binary) });
  }
  return contents;
}

async function generateWithGemini(env: ProviderEnv, input: GenerateInput): Promise<GeneratedImage[]> {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured on the server.');
  const model = env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image';
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      input: googleInput(input),
      response_format: { type: 'image', aspect_ratio: aspectRatio(input.aspectRatio), image_size: imageSize(input.resolution) },
    }),
  });
  if (!response.ok) throw new Error(await responseError(response, 'Google rejected the image request'));
  const payload = await response.json().catch(() => ({})) as any;
  // Interactions returns a convenient `output_image` for a single image, but
  // can also return the same image inside steps/output when the response is
  // interleaved. Accept both shapes so a successful provider call always
  // reaches the gallery.
  const output = payload?.output_image || payload?.interaction?.output_image || findImageBlock(payload?.output) || findImageBlock(payload?.steps) || findImageBlock(payload);
  if (!output?.data) throw new Error('Google completed without returning an image.');
  return [{ bytes: base64ToArrayBuffer(output.data), mimeType: output.mime_type || 'image/png' }];
}

export async function generateImage(env: ProviderEnv, input: GenerateInput) {
  return input.model === 'Nano Banana PRO' ? generateWithGemini(env, input) : generateWithOpenAi(env, input);
}
