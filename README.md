# FXRKENART Studio Image

Framework version of the standalone image workspace: Vite + React + TypeScript on the frontend, Hono on the backend, SQLite locally, and a D1/R2-ready schema boundary.

## Run in VS Code

Requirements: Node.js 22.5+.

```bash
npm install
copy .env.example .env       # Windows PowerShell
# cp .env.example .env       # macOS/Linux
npm run dev
```

Open `http://localhost:5173`. The API runs on `http://localhost:4175` and Vite proxies `/api` to it.

This is a child site of the main FXRKENART site. Its production route is:

```text
https://fxrkenart.com/studio-image/
```

Build the child site with its parent prefix:

```bash
VITE_BASE_PATH=/studio-image/ npm run build
```

On Windows PowerShell:

```powershell
$env:VITE_BASE_PATH='/studio-image/'; npm run build
```

The frontend derives its API and media URLs from that base path, so it does not call the parent root `/api` by accident. The parent Worker should route `/studio-image/*` to this child site's static build and `/studio-image/api/*` to the Hono API.

## Deploy the child Worker

The repository now includes `wrangler.jsonc` and `worker/index.ts`, so the child can deploy independently from the parent site. The first deployment needs the persistent Cloudflare resources once:

```bash
npx wrangler d1 create fxrkenart-studio-image
npx wrangler r2 bucket create fxrkenart-studio-image-media
npx wrangler d1 execute fxrkenart-studio-image --remote --file=schema.sql
```

The production `DB` and `MEDIA` bindings are already configured in `wrangler.jsonc`. Add the direct provider keys and the temporary admin test login as Worker secrets. Never put these values in the frontend or GitHub:

```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

For Google sign-in, register this exact callback URL in the Google OAuth client:

```text
https://fxrkenart-studio-image.forkenyk-work.workers.dev/api/auth/google/callback
```

Set `APP_URL` to the child Worker URL and deploy with `npm run deploy`. The Worker handles `/api/*`; the asset binding serves the React SPA for everything else.

Optional model overrides are server-side variables, not frontend values:

```env
OPENAI_IMAGE_MODEL=gpt-image-2.5-sunburst
GEMINI_IMAGE_MODEL=gemini-3-pro-image
```

The temporary Studio model list is `Nano Banana PRO` and `ChatGPT 2.5`. Each label is routed to its own direct API; the UI never exposes provider secrets. The admin test login receives a large test credit balance and should be replaced before public launch.

## What is real in this build

- Accounts, sessions, credit balance, ledger and jobs persist in local SQLite across API restarts.
- References are stored in `data/media` under the owning account and are checked server-side.
- Generate reserves credits in a transaction, calls the direct OpenAI or Google image API, and copies returned image bytes into account-scoped media.
- Provider failures refund credits and are visible as failed jobs.
- The gallery reads stored assets from the account-scoped library route; it does not invent demo images.

Payment packages are still intentionally a guarded UI until a webhook is connected. The backend package endpoint and `payments` table are ready for PayOS, VNPay or Stripe integration.

See `ARCHITECTURE.md` for the Cloudflare Worker + D1 + R2 + Queue migration path. The parent FXRKENART site and `remove-bg` tool remain separate.
