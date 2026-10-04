# FXRKENART Studio Image framework architecture

The project is split into a Vite + React + TypeScript client and a Hono API. The local API uses Node's built-in SQLite driver and the same `schema.sql` contract that will be used for Cloudflare D1.

```text
src/
  app/                 app state and authenticated flow
  components/          Home, auth, prompt, model, gallery, viewer, credits
  lib/                 API client, shared types and pricing display
server/
  routes/              auth, generate, upload, library, credits, media
  providers/           Soul / Nano Banana PRO provider adapter
  jobs/                reservation, provider polling, result copy
  storage/             local media adapter; replace with R2 adapter in deploy
```

## Request flow

1. Sign up or log in. The session is stored in SQLite and the browser only receives an HttpOnly cookie.
2. Upload references. The API stores the bytes under the authenticated user's local media prefix and returns an owned asset id.
3. Generate. Hono validates the user, model and reference ownership, calculates price server-side, reserves credits in a transaction, inserts a job and starts the provider adapter.
4. The job adapter re-uploads references to the provider when needed, polls the real provider job, copies completed images into local media, writes `assets` and `generation_assets`, then marks the job completed.
5. Failure performs a compensating credit refund. Gallery and media routes always enforce `user_id` ownership.

## Cloudflare migration

- `server/storage/local.ts` becomes an R2 adapter using private object keys such as `users/{user_id}/...`.
- `server/db.ts` becomes D1 bindings while keeping the SQL table contract.
- `server/jobs/generation-job.ts` moves behind a Queue consumer so the HTTP request does not own a long-running provider poll.
- Provider and payment credentials remain Worker Secrets; never expose them through `VITE_*` variables.
- The current packages are UI-only until a PayOS, VNPay or Stripe webhook is connected to `payments` and `credit_ledger`.

The parent site and `remove-bg` pipeline remain separate and untouched.
