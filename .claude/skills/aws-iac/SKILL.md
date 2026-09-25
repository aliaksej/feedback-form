---
name: aws-iac
description: Rules for defining and changing AWS infrastructure as code in this repo (Lambda, endpoint, S3, IAM, CORS, frontend hosting). Use when adding or modifying any AWS resource, IaC stack, deployment config, or permissions.
---

# AWS Infrastructure as Code

All AWS resources are defined in code. Never create or modify resources through the console or ad-hoc CLI calls; if something was changed manually, reconcile it back into code.

The IaC tool is plain **CloudFormation**, in `infra/template.yaml` (deployed via `infra/scripts/deploy.sh`). Do not introduce CDK/Terraform/SAM transforms without asking. Lint with `cfn-lint template.yaml` after every change.

## Resources in scope

- Lambda function (TypeScript, bundled), its log group with explicit retention, and its execution role.
- HTTPS endpoint (Lambda Function URL) with CORS restricted to the CloudFront site origin (and an optional dev origin), not `*`.
- S3 bucket for Parquet data: block all public access, server-side encryption, versioning if appropriate, TLS-only bucket policy, and a lifecycle policy.
- Frontend hosting: private S3 bucket + CloudFront (Origin Access Control, HTTPS only). Never make the site bucket public. A custom domain (ACM cert in us-east-1 + DNS) is not set up yet.

## Rules

- **Least-privilege IAM**: the Lambda role gets only the S3 actions it needs (e.g. `s3:PutObject`, plus `s3:GetObject` only if it reads), scoped to the specific bucket/prefix ARN. No `*` resources or actions.
- Pass resource names/ARNs to the Lambda via environment variables set in IaC (e.g. `BUCKET_NAME`); never hardcode them in function code.
- Expose the endpoint URL as a stack output so the frontend build can consume it.
- Stateful resources (the data bucket) must have deletion protection or a retain policy so a stack change can't destroy data.
- Tag resources consistently and parameterize by environment (dev/prod) rather than duplicating stacks.
- No secrets or account IDs committed in code or state files; keep remote state and lock config out of git.

## Workflow

1. Change the infra code.
2. Run the tool's validation and preview (`cfn-lint`, and `aws cloudformation deploy --no-execute-changeset` for a change set), and show the diff to the user.
3. Do not deploy or apply without explicit user approval; deploys change real AWS resources.
