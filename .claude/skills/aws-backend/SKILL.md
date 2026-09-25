---
name: aws-backend
description: Conventions for the TypeScript AWS Lambda backend that receives feedback and stores it as Parquet in S3. Use when writing or changing the Lambda handler, request validation, Parquet serialization, S3 writes, or backend tests.
---

# AWS backend (Lambda + S3 + Parquet)

Flow: HTTPS request → Lambda handler → validate → serialize to Parquet → write to S3. Resources themselves are defined in IaC (see the `aws-iac` skill), not here.

## Handler

- TypeScript, with a thin handler that delegates to separately testable modules: validation, Parquet encoding, S3 storage.
- Create AWS SDK v3 clients (`@aws-sdk/client-s3`) outside the handler so they are reused across warm invocations.
- Read the bucket name and other config from environment variables set by IaC; fail fast at cold start if they are missing.
- Return proper status codes: 400 for invalid input, 500 for storage failures (log details, return a generic message), 2xx on success. Include the CORS headers if the endpoint type doesn't add them.
- Parse the body defensively (it may be missing, base64-encoded or malformed JSON). Enforce a size limit and length limits on free-text fields.
- Never log the full feedback body if it may contain personal data; log request IDs and outcome.

## Validation

Validate with a schema library (e.g. zod) as the single source of truth for field names, types and limits. Reject unknown fields. The frontend form and the Parquet schema must match it (see the `react-frontend` skill).

## Parquet and S3

- The project uses **one shared Parquet file** (key from `OBJECT_KEY`), updated by read-modify-write in `src/storage.ts` with conditional writes (`If-Match`/`If-None-Match`) and retries. Keep that guard on any change to it. It rewrites the whole file per submission, so if volume grows, move to one object per submission under a partitioned key (e.g. `feedback/dt=YYYY-MM-DD/<uuid>.parquet`), which is also directly queryable by Athena/Glue.
- Define an explicit Parquet schema (column names, types, nullability); do not infer it from arbitrary input. Store timestamps as proper timestamp types in UTC.
- Choose a Parquet library that runs on the Lambda runtime and architecture (arm64 vs x86_64). Prefer pure JS/WASM (e.g. `hyparquet-writer`, `parquet-wasm`) over native bindings, and verify that bundling includes it.
- Set `ContentType` appropriately and use server-side encryption defaults from the bucket.
- Generate the ID and server-side timestamp in the Lambda; don't trust client-supplied ones.

## Testing

- Unit test validation, Parquet encoding (write, then read back and assert the rows), and the handler with a mocked S3 client (`aws-sdk-client-mock`).
- Test the key/partition naming and the error paths (invalid body, S3 failure).

## Before finishing

From `backend/`, run `npm run build` (typecheck + bundle) and `npm test`. The IAM the Lambda needs (`GetObject`/`PutObject` on the key, `ListBucket` on the bucket) lives in `infra/template.yaml`; update it if storage access changes.
