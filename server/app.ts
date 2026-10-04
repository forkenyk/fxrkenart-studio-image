import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './routes/auth';
import { creditRoutes } from './routes/credits';
import { generationRoutes } from './routes/generate';
import { libraryRoutes } from './routes/library';
import { mediaRoutes } from './routes/media';
import { uploadRoutes } from './routes/upload';

export const app = new Hono();

app.use('/api/*', cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], credentials: true }));
app.get('/api/health', (c) => c.json({ ok: true, provider: 'FXRKENART providers', models: ['Nano Banana PRO', 'ChatGPT 2.5'] }));
app.route('/api/auth', authRoutes);
app.route('/api/credits', creditRoutes);
app.route('/api/generate', generationRoutes);
app.route('/api/library', libraryRoutes);
app.route('/api/media', mediaRoutes);
app.route('/api/upload', uploadRoutes);

app.notFound((c) => c.json({ error: 'Not found.' }, 404));
app.onError((error, c) => c.json({ error: error.message || 'Internal server error.' }, 500));
