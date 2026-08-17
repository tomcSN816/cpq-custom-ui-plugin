#!/usr/bin/env bash
# Usage: check_servicenow.sh <instance_url> <username> <password> <account_name>
# Verifies SN credentials, that Quote Management is active, and that the
# given customer_account name resolves to a real record.
set -euo pipefail

INSTANCE="$1"
SN_USER="$2"
SN_PASS="$3"
ACCOUNT_NAME="$4"

AUTH=$(printf '%s:%s' "$SN_USER" "$SN_PASS" | base64)

urlencode() {
  local s="$1" out="" c
  local i len=${#s}
  for (( i=0; i<len; i++ )); do
    c="${s:$i:1}"
    case "$c" in
      [a-zA-Z0-9.~_-]) out+="$c" ;;
      ' ') out+="%20" ;;
      *) printf -v hex '%%%02X' "'$c"; out+="$hex" ;;
    esac
  done
  echo "$out"
}

check() {
  local label="$1" url="$2" needle="$3"
  local resp code body
  resp=$(curl -sS -w '\n%{http_code}' "$url" \
    -H "Authorization: Basic ${AUTH}" \
    -H "Accept: application/json")
  code=$(echo "$resp" | tail -n1)
  body=$(echo "$resp" | sed '$d')
  echo "$label -> HTTP $code"
  if [ "$code" != "200" ]; then
    echo "FAILED: $label returned $code"
    echo "$body"
    exit 1
  fi
  if [ -n "$needle" ] && ! echo "$body" | grep -q "$needle"; then
    echo "FAILED: $label did not contain expected result"
    echo "$body"
    exit 1
  fi
}

check "Quote Management table" \
  "${INSTANCE%/}/api/now/table/sn_quote_mgmt_core_quote?sysparm_limit=1" ""

check "Account lookup ($ACCOUNT_NAME)" \
  "${INSTANCE%/}/api/now/table/customer_account?sysparm_query=name=$(urlencode "$ACCOUNT_NAME")&sysparm_limit=1&sysparm_fields=sys_id,name" \
  "sys_id"

echo "OK: ServiceNow connection, Quote Management, and account verified."
exit 0
