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

Fill in the server-side provider values in `.env` before generating:

```env
HF_CREDENTIALS=KEY_ID:KEY_SECRET
HF_NANO_BANANA_PATH=/your/provider/nano/banana/pro/route
HF_CHATGPT_25_PATH=/your/provider/chatgpt/2.5/route
```

The temporary Studio model list is `Nano Banana PRO` and `ChatGPT 2.5`. Each model is routed through its own server-side provider path; the UI never exposes provider secrets.

## What is real in this build

- Accounts, sessions, credit balance, ledger and jobs persist in local SQLite across API restarts.
- References are stored in `data/media` under the owning account and are checked server-side.
- Generate reserves credits in a transaction, calls the real provider adapter, polls the job and copies completed provider images into local media.
- Provider failures refund credits and are visible as failed jobs.
- The gallery reads stored assets from the account-scoped library route; it does not invent demo images.

Payment packages are still intentionally a guarded UI until a webhook is connected. The backend package endpoint and `payments` table are ready for PayOS, VNPay or Stripe integration.

See `ARCHITECTURE.md` for the Cloudflare Worker + D1 + R2 + Queue migration path. The parent FXRKENART site and `remove-bg` tool remain separate.
