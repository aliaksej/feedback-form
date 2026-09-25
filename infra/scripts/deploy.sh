#!/usr/bin/env bash
# Usage: scripts/deploy.sh <dev|prod> <artifact-bucket> [extra-allowed-origin]
# Packages ../backend/dist to the artifact bucket and deploys the stack
# (frontend hosting, Lambda, data bucket). Deploy the site itself afterwards
# with scripts/deploy-frontend.sh.
# extra-allowed-origin is optional, e.g. http://localhost:5173 for local dev.
set -euo pipefail

ENV="${1:?environment (dev|prod)}"
ARTIFACT_BUCKET="${2:?S3 bucket for Lambda artifacts}"
EXTRA_ORIGIN="${3:-}"
STACK="feedback-form-${ENV}"
cd "$(dirname "$0")/.."

(cd ../backend && npm ci && npm run build)

aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket "$ARTIFACT_BUCKET" \
  --output-template-file packaged.yaml

aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name "$STACK" \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides Environment="$ENV" ExtraAllowedOrigin="$EXTRA_ORIGIN"

aws cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[].[OutputKey,OutputValue]" --output text
