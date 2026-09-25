#!/usr/bin/env bash
# Usage: scripts/deploy.sh <dev|prod> <allowed-origin> <artifact-bucket>
# Packages ../backend/dist to the artifact bucket, deploys the stack and
# writes the resulting endpoint into ../frontend/public/config.json.
set -euo pipefail

ENV="${1:?environment (dev|prod)}"
ORIGIN="${2:?allowed origin, e.g. https://feedback.example.com}"
ARTIFACT_BUCKET="${3:?S3 bucket for Lambda artifacts}"
STACK="feedback-form-${ENV}"
cd "$(dirname "$0")/.."

aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket "$ARTIFACT_BUCKET" \
  --output-template-file packaged.yaml

aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name "$STACK" \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides Environment="$ENV" AllowedOrigin="$ORIGIN"

API_URL=$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text)
printf '{\n  "apiUrl": "%s"\n}\n' "$API_URL" > ../frontend/public/config.json
echo "apiUrl = $API_URL"
