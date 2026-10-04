import path from 'node:path';

export const config = {
  port: Number(process.env.API_PORT || 4175),
  startingCredits: Number(process.env.STARTING_CREDITS || 36),
  databasePath: path.resolve(process.cwd(), process.env.SQLITE_PATH || './data/studio.sqlite'),
  mediaDir: path.resolve(process.cwd(), process.env.MEDIA_DIR || './data/media'),
  hfBase: (process.env.HF_API_BASE_URL || 'https://api.higgsfield.ai').replace(/\/$/, ''),
  hfCredentials: process.env.HF_CREDENTIALS || process.env.HF_API_KEY || '',
  nanoPath: process.env.HF_NANO_BANANA_PATH || '',
  chatgpt25Path: process.env.HF_CHATGPT_25_PATH || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || '',
  googleAppUrl: process.env.GOOGLE_APP_URL || '',
};

export const priceTable = {
  'Nano Banana PRO': { Low: 45, Medium: 60, High: 80 },
  'ChatGPT 2.5': { Low: 35, Medium: 50, High: 70 },
} as const;

export type ModelName = keyof typeof priceTable;
export type Quality = keyof typeof priceTable['Nano Banana PRO'];

export function generationCost(model: ModelName, quality: Quality, resolution: string, count: number) {
  return Math.round(priceTable[model][quality] * (resolution === '4K' ? 1 : .55) * Math.min(4, Math.max(1, count)));
}
