#!/usr/bin/env bash
# Usage: scripts/deploy-frontend.sh <dev|prod>
# Builds the frontend, writes config.json (apiUrl from the stack output) into
# the build, uploads it to the site bucket and invalidates the CDN.
# Requires the stack to be deployed first (scripts/deploy.sh).
set -euo pipefail

ENV="${1:?environment (dev|prod)}"
STACK="feedback-form-${ENV}"
cd "$(dirname "$0")/../../frontend"

output() {
  aws cloudformation describe-stacks --stack-name "$STACK" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
BUCKET=$(output FrontendBucketName)
DIST_ID=$(output DistributionId)
API_URL=$(output ApiUrl)
SITE_URL=$(output SiteUrl)

npm ci
npm run build
printf '{\n  "apiUrl": "%s"\n}\n' "$API_URL" > dist/config.json

# Hashed assets are immutable; the entry points must always be revalidated.
aws s3 sync dist "s3://$BUCKET" --delete \
  --exclude index.html --exclude config.json \
  --cache-control "public,max-age=31536000,immutable"
aws s3 cp dist/index.html "s3://$BUCKET/index.html" --cache-control "no-cache"
aws s3 cp dist/config.json "s3://$BUCKET/config.json" --cache-control "no-cache"

aws cloudfront create-invalidation --distribution-id "$DIST_ID" \
  --paths /index.html /config.json >/dev/null
echo "Deployed: $SITE_URL"
