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

Fill in the server-side provider values in `.env` before generating:

```env
HF_CREDENTIALS=KEY_ID:KEY_SECRET
HF_NANO_BANANA_PATH=/your/provider/nano/banana/pro/route
```

`Soul` uses the standard route without references and the Soul image-to-image route when a reference is selected. `Nano Banana PRO` is intentionally configured through its provider route instead of being faked or silently replaced by another model.

## What is real in this build

- Accounts, sessions, credit balance, ledger and jobs persist in local SQLite across API restarts.
- References are stored in `data/media` under the owning account and are checked server-side.
- Generate reserves credits in a transaction, calls the real provider adapter, polls the job and copies completed provider images into local media.
- Provider failures refund credits and are visible as failed jobs.
- The gallery reads stored assets from the account-scoped library route; it does not invent demo images.

Payment packages are still intentionally a guarded UI until a webhook is connected. The backend package endpoint and `payments` table are ready for PayOS, VNPay or Stripe integration.

See `ARCHITECTURE.md` for the Cloudflare Worker + D1 + R2 + Queue migration path. The parent FXRKENART site and `remove-bg` tool remain separate.
