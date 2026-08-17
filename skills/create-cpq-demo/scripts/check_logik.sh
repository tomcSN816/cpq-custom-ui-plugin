#!/usr/bin/env bash
# Usage: check_logik.sh <base_url> <token> <product_id> [origin]
# Verifies the Logik.io base URL, token, and product ID are valid by starting
# a real (stateless) configuration session. <origin> defaults to <base_url>
# but some instances restrict the runtime API to an Origin allowlist that
# does NOT include the base URL itself (check the instance's Origins
# settings in the Logik admin console if this fails with an empty-body 403).
# Prints the HTTP status and body, then exits 0 on success (a uuid came
# back) or 1 otherwise.
set -euo pipefail

BASE_URL="$1"
TOKEN="$2"
PRODUCT_ID="$3"
ORIGIN="${4:-$BASE_URL}"

RESPONSE=$(curl -sS -w '\n%{http_code}' -X POST "${BASE_URL%/}/api" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/vnd.logik.cfg-v2+json" \
  -H "Accept: application/vnd.logik.cfg-v2+json" \
  -H "Origin: ${ORIGIN%/}" \
  -d "{\"sessionContext\":{\"stateful\":false},\"partnerData\":{\"product\":{\"configuredProductId\":\"${PRODUCT_ID}\",\"configurationAttributes\":{}}},\"fields\":[]}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP status: $HTTP_CODE"
echo "$BODY"

if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q '"uuid"'; then
  echo "OK: Logik connection and product ID verified."
  exit 0
elif [ "$HTTP_CODE" = "403" ] && [ -z "$BODY" ]; then
  echo "FAILED: empty-body 403 — this usually means the Origin header ('${ORIGIN}') isn't on this instance's Origins allowlist in the Logik admin console, not that the token/product ID is wrong."
  exit 1
else
  echo "FAILED: could not start a Logik session with the given base URL / token / product ID."
  exit 1
fi
