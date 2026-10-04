export type ModelName = 'Nano Banana PRO' | 'ChatGPT 2.5';
export type Quality = 'Low' | 'Medium' | 'High';
export type Resolution = '2K' | '4K';
export type AspectRatio = 'Auto' | '1:1' | '4:5' | '3:4' | '2:3' | '16:9' | '9:16' | '21:9';
export type CreditEntryType = 'granted' | 'spent' | 'refunded' | 'adjusted';

export interface User {
  id: string;
  name: string;
  email: string;
  credits: number;
}

export interface ReferenceAsset {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadState?: 'uploading' | 'uploaded' | 'failed';
  uploadError?: string;
}

export interface GenerationResult {
  id: string;
  url: string;
  model: ModelName;
  prompt?: string;
  references?: boolean;
  createdAt?: string;
}

export interface PendingResult {
  id: string;
  pending: true;
  model: ModelName;
  jobId: string;
}

export interface FailedResult {
  id: string;
  error: string;
}

export type GalleryResult = GenerationResult | PendingResult | FailedResult;

export interface JobResponse {
  id: string;
  status: 'queued' | 'submitting' | 'processing' | 'completed' | 'failed' | 'canceled' | 'nsfw';
  model: ModelName;
  cost: number;
  balance: number;
  images?: GenerationResult[];
  error?: string;
}

export interface HistoryEntry {
  type: CreditEntryType;
  amount: number;
  model?: string;
  note?: string;
  created_at: string;
}

export interface AccountResponse {
  user: User;
  credits: number;
  history: HistoryEntry[];
}

export const MODEL_META: Record<ModelName, { provider: string; mark: string; description: string }> = {
  'Nano Banana PRO': {
    provider: 'Google',
    mark: 'NB',
    description: 'High-detail generation and image editing',
  },
  'ChatGPT 2.5': {
    provider: 'OpenAI',
    mark: 'GPT',
    description: 'Prompt-led image generation and edits',
  },
};

export const PRICE_TABLE: Record<ModelName, Record<Quality, number>> = {
  'Nano Banana PRO': { Low: 45, Medium: 60, High: 80 },
  'ChatGPT 2.5': { Low: 35, Medium: 50, High: 70 },
};

export function generationCost(model: ModelName, quality: Quality, resolution: Resolution, count: number): number {
  return Math.round((PRICE_TABLE[model][quality] * (resolution === '4K' ? 1 : .55) * count));
}
