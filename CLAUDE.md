# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Early stage: `frontend/`, `infra/` and `backend/` exist. Nothing has been deployed yet.

## Purpose

A webpage with a feedback form. Submissions are sent to an AWS Lambda endpoint, which appends the data to a file in an S3 bucket in Parquet format.

## Architecture

Data flow: `React form` → HTTPS → `Lambda endpoint` → `S3 bucket (Parquet)`

- **Frontend**: React single-page app containing the feedback form. It posts to the Lambda endpoint (e.g. Function URL or API Gateway; not yet decided). Lives in [frontend/](frontend/) (Vite + React + TypeScript, npm, its own `package.json`). The endpoint URL is never hardcoded (see Frontend config).
- **Lambda** ([backend/](backend/), TypeScript, esbuild bundle to `backend/dist/index.js`): validates `{ message }` with zod ([schema.ts](backend/src/schema.ts) is the source of truth), then appends a row (`id`, `created_at`, `message`) to **one shared Parquet file** whose key comes from the `OBJECT_KEY` env var (bucket from `BUCKET_NAME`; both set by the CloudFormation template). S3 has no append, so [storage.ts](backend/src/storage.ts) does read-modify-write guarded by conditional writes (`If-Match` ETag / `If-None-Match: *`) and retries on 412/409. This rewrites the whole file per submission, so it suits low volume; switch to one object per submission if volume grows. Parquet via pure-JS `hyparquet`/`hyparquet-writer`; `@aws-sdk/*` is left external (provided by the Lambda runtime).
- **Infrastructure**: All AWS resources (Lambda, endpoint, S3 bucket, IAM, CORS config, etc.) are defined as Infrastructure as Code. Never create or change resources by hand in the console. Tool: plain **CloudFormation** in [infra/template.yaml](infra/template.yaml) (single stack per environment, `feedback-form-<env>`): S3 data bucket (retained), Lambda + log group + least-privilege role, Lambda Function URL with CORS limited to the CloudFront site (plus optional `ExtraAllowedOrigin`, e.g. `http://localhost:5173` for dev), and frontend hosting: private S3 bucket behind a CloudFront distribution (OAC, HTTPS redirect, SPA fallback to `index.html`; `config.json` is never cached). The public URL is the `SiteUrl` stack output (default `*.cloudfront.net`; no custom domain yet). The Lambda's `Code: ../backend/dist` is replaced with an S3 location by `aws cloudformation package`, so run `npm run build` in `backend/` before deploying.

## Commands

Backend (from `backend/`): `npm run build` (typecheck + bundle), `npm run typecheck`, `npm test` (single file: `npx vitest run src/storage.test.ts`).

Frontend (from `frontend/`):

- `npm run dev` — dev server
- `npm run build` — typecheck + production build to `dist/`
- `npm run typecheck`
- `npm test` — vitest, all tests; single file: `npx vitest run src/config.test.ts`; by name: `npx vitest run -t "<name>"`

Infra (from `infra/`):

- `cfn-lint template.yaml` — lint (`pip install cfn-lint`)
- `scripts/deploy.sh <dev|prod> <artifact-bucket> [extra-origin]` — build backend, package, deploy the stack.
- `scripts/deploy-frontend.sh <dev|prod>` — build frontend, generate `config.json` (apiUrl from stack output) into the build, upload to the site bucket, invalidate CDN. Run after `deploy.sh`.
- Both deploy real AWS resources; only run with user approval.

## Frontend config

Config is resolved at startup in [frontend/src/config.ts](frontend/src/config.ts): runtime `config.json` (served next to `index.html`, not bundled) wins, then build-time `VITE_API_URL`. So one build can be deployed to any environment by replacing `config.json` (`deploy-frontend.sh` generates it into `dist/` from stack outputs; the committed `public/config.json` stays empty). For local dev, copy `frontend/.env.example` to `frontend/.env.local`. To add a setting: extend `AppConfig`, `resolveConfig`, `public/config.json`, and `.env.example`.

## Cross-cutting concerns

- **CORS**: the endpoint must allow the frontend's origin; this is configured in the IaC, not just in Lambda code.
- **Schema**: the feedback form fields, the Lambda validation and the Parquet schema must stay in sync. Consider sharing types between frontend and Lambda (both TypeScript-compatible).
- **Lambda bundling**: the Parquet library must work in the Lambda runtime (prefer pure-JS/WASM options or ensure native binaries match the Lambda architecture).
