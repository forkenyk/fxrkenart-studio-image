import { serve } from '@hono/node-server';
import { app } from './app';
import { config } from './config';
import { ensureStorage } from './storage/local';

await ensureStorage();
serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`FXRKENART API running at http://localhost:${info.port}`);
});
