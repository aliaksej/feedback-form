# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Early stage: only the `frontend/` scaffold exists. The Lambda and infrastructure are not yet created; those sections describe the intended design. Add their commands here when scaffolded.

## Purpose

A webpage with a feedback form. Submissions are sent to an AWS Lambda endpoint, which appends the data to a file in an S3 bucket in Parquet format.

## Architecture

Data flow: `React form` → HTTPS → `Lambda endpoint` → `S3 bucket (Parquet)`

- **Frontend**: React single-page app containing the feedback form. It posts to the Lambda endpoint (e.g. Function URL or API Gateway; not yet decided). Lives in [frontend/](frontend/) (Vite + React + TypeScript, npm, its own `package.json`). The endpoint URL is never hardcoded (see Frontend config).
- **Lambda**: TypeScript. Validates the payload, converts the feedback records to Parquet, and writes them to S3. Note that S3 objects are immutable, so "putting info into a file" means either writing a new Parquet object per submission/batch or read-modify-write on a shared file. The approach should be an explicit design decision, with concurrency in mind.
- **Infrastructure**: All AWS resources (Lambda, endpoint, S3 bucket, IAM, CORS config, etc.) are defined as Infrastructure as Code. Never create or change resources by hand in the console. The IaC tool (CDK, Terraform, SAM, etc.) is not yet chosen; record the choice here once made.

## Commands

Run from `frontend/`:

- `npm run dev` — dev server
- `npm run build` — typecheck + production build to `dist/`
- `npm run typecheck`
- `npm test` — vitest, all tests; single file: `npx vitest run src/config.test.ts`; by name: `npx vitest run -t "<name>"`

## Frontend config

Config is resolved at startup in [frontend/src/config.ts](frontend/src/config.ts): runtime `config.json` (served next to `index.html`, not bundled) wins, then build-time `VITE_API_URL`. So one build can be deployed to any environment by replacing `config.json` (IaC should generate it from stack outputs at deploy time). For local dev, copy `frontend/.env.example` to `frontend/.env.local`. To add a setting: extend `AppConfig`, `resolveConfig`, `public/config.json`, and `.env.example`.

## Cross-cutting concerns

- **CORS**: the endpoint must allow the frontend's origin; this is configured in the IaC, not just in Lambda code.
- **Schema**: the feedback form fields, the Lambda validation and the Parquet schema must stay in sync. Consider sharing types between frontend and Lambda (both TypeScript-compatible).
- **Lambda bundling**: the Parquet library must work in the Lambda runtime (prefer pure-JS/WASM options or ensure native binaries match the Lambda architecture).
