#!/usr/bin/env bash
# Usage: check_logik.sh <base_url> <token> <product_id>
# Verifies the Logik.io base URL, token, and product ID are valid by starting
# a real (stateless) configuration session. Prints the HTTP status and body,
# then exits 0 on success (a uuid came back) or 1 otherwise.
set -euo pipefail

BASE_URL="$1"
TOKEN="$2"
PRODUCT_ID="$3"

RESPONSE=$(curl -sS -w '\n%{http_code}' -X POST "${BASE_URL%/}/api" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/vnd.logik.cfg-v2+json" \
  -H "Accept: application/vnd.logik.cfg-v2+json" \
  -H "Origin: ${BASE_URL%/}" \
  -d "{\"sessionContext\":{\"stateful\":false},\"partnerData\":{\"product\":{\"configuredProductId\":\"${PRODUCT_ID}\",\"configurationAttributes\":{}}},\"fields\":[]}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP status: $HTTP_CODE"
echo "$BODY"

if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q '"uuid"'; then
  echo "OK: Logik connection and product ID verified."
  exit 0
else
  echo "FAILED: could not start a Logik session with the given base URL / token / product ID."
  exit 1
fi
