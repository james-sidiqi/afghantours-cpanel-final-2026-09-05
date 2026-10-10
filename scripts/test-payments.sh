#!/usr/bin/env bash
# Local test harness for the HesabPay payment framework.
# Uses PHP's built-in server for public/ and a FAKE HesabPay stub on 127.0.0.1.
# Never calls the real HesabPay API. No real keys exist or are needed.
set -u
cd "$(dirname "$0")/.."
ROOT="$PWD"
TMP="$ROOT/payments-test-tmp"
SITE_PORT=18080
STUB_PORT=18081
SITE="http://127.0.0.1:$SITE_PORT"
PASS=0; FAIL=0
rm -rf "$TMP"; mkdir -p "$TMP/stub" "$TMP/data"
export STUB_LOG_DIR="$TMP/stub" STUB_API_KEY="test-key-not-real" HESABPAY_TEST_NO_MAIL=1

ok()   { PASS=$((PASS+1)); echo "PASS  $1"; }
bad()  { FAIL=$((FAIL+1)); echo "FAIL  $1"; [ -n "${2:-}" ] && echo "      $2"; }
check(){ if [ "$2" = "$3" ]; then ok "$1"; else bad "$1" "expected [$3] got [$2]"; fi; }
contains(){ if printf '%s' "$2" | grep -q -- "$3"; then ok "$1"; else bad "$1" "missing [$3] in: $(printf '%s' "$2" | head -c 300)"; fi; }

echo "== php -l"
for f in public/tour-inquiry.php public/payments/*.php public/payments/lib/*.php config/hesabpay-config.example.php scripts/payments-test/*.php; do
  if php -l "$f" >/dev/null; then ok "php -l $f"; else bad "php -l $f"; fi
done

php -S 127.0.0.1:$STUB_PORT scripts/payments-test/hesab-stub.php >"$TMP/stub.log" 2>&1 &
STUB_PID=$!
SITE_PID=""
cleanup(){ [ -n "$SITE_PID" ] && kill "$SITE_PID" 2>/dev/null; kill "$STUB_PID" 2>/dev/null; }
trap cleanup EXIT

write_cfg(){ # $1 = mode, $2 = extra php array entries
  cat >"$TMP/config.php" <<PHP
<?php return [
  'mode' => '$1',
  'api_key' => 'test-key-not-real',
  'api_base' => 'http://127.0.0.1:$STUB_PORT',
  'data_dir' => '$TMP/data',
  'success_url' => '$SITE/pay/success/',
  'cancel_url' => '$SITE/pay/cancelled/',
  'rate_limit_per_hour' => 1000,
  'notify_on_webhook' => true,
  $2
];
PHP
}
start_site(){ # (re)start site server with current config
  [ -n "$SITE_PID" ] && kill "$SITE_PID" 2>/dev/null && wait "$SITE_PID" 2>/dev/null
  HESABPAY_CONFIG="$TMP/config.php" php -S 127.0.0.1:$SITE_PORT -t public >"$TMP/site.log" 2>&1 &
  SITE_PID=$!
  for _ in $(seq 1 50); do curl -s -o /dev/null "$SITE/payments/status.php" && return; sleep 0.1; done
}
post(){ # $1 path, rest = curl args; prints "CODE|LOCATION|BODY"
  local p="$1"; shift
  curl -s -o "$TMP/body" -D "$TMP/hdr" -w '%{http_code}' -X POST "$SITE$p" "$@" > "$TMP/code"
  printf '%s|%s|%s' "$(cat "$TMP/code")" "$(grep -i '^location:' "$TMP/hdr" | tr -d '\r' | cut -d' ' -f2-)" "$(cat "$TMP/body")"
}
FORM=(-H "Origin: $SITE" --data-urlencode booking_reference=AT-2026-TEST1 --data-urlencode amount=1250.50 --data-urlencode name="Test Payer" --data-urlencode email=payer@example.com --data-urlencode currency=AFN --data-urlencode description=Deposit)

echo "== no config at all → disabled"
[ -n "$SITE_PID" ] || true
HESABPAY_CONFIG="$TMP/does-not-exist.php" php -S 127.0.0.1:$SITE_PORT -t public >"$TMP/site.log" 2>&1 & SITE_PID=$!
for _ in $(seq 1 50); do curl -s -o /dev/null "$SITE/payments/status.php" && break; sleep 0.1; done
contains "status.php reports enabled=false with no config" "$(curl -s $SITE/payments/status.php)" '"enabled":false'
R=$(post /payments/create-session.php "${FORM[@]}"); check "disabled: HTTP 503" "${R%%|*}" 503
contains "disabled: friendly HTML message" "$R" "Online payment is not available yet"
contains "disabled: contact links" "$R" "wa.me/93780123456"
R=$(post /payments/create-session.php "${FORM[@]}" -H 'Accept: application/json'); contains "disabled: JSON reason" "$R" '"reason":"disabled"'
R=$(post /payments/webhook.php -H 'Content-Type: application/json' --data '{"signature":"good-signature","timestamp":"1"}'); check "webhook with no API key: 503 (not trusted)" "${R%%|*}" 503
check "check.php off without token config: 404" "$(curl -s -o /dev/null -w '%{http_code}' "$SITE/payments/check.php?token=x")" 404

echo "== api mode with missing key degrades to disabled"
write_cfg api "'api_key_unused' => 1"; sed -i "s/'api_key' => 'test-key-not-real'/'api_key' => ''/" "$TMP/config.php"; start_site
contains "api mode without key → enabled=false" "$(curl -s $SITE/payments/status.php)" '"enabled":false'

echo "== link mode"
write_cfg link ""; start_site
R=$(post /payments/create-session.php "${FORM[@]}"); check "link: HTTP 303" "${R%%|*}" 303
L=$(echo "$R" | cut -d'|' -f2); check "link: Location = public HesabPay link" "$L" "https://hesab.com/pay/AFGHANTOURS/en"
ls "$TMP/data/intents/"*.json >/dev/null 2>&1 && ok "link: intent recorded in private data dir" || bad "link: intent recorded"

echo "== request guards (link mode)"
R=$(curl -s -o /dev/null -w '%{http_code}' "$SITE/payments/create-session.php"); check "GET create-session → 405" "$R" 405
R=$(post /payments/create-session.php --data-urlencode booking_reference=X1 --data-urlencode amount=100 --data-urlencode name=a --data-urlencode email=a@b.co); check "no Origin/Referer → 403" "${R%%|*}" 403
R=$(post /payments/create-session.php -H 'Origin: https://evil.example' --data-urlencode booking_reference=X1 --data-urlencode amount=100 --data-urlencode name=a --data-urlencode email=a@b.co); check "foreign Origin → 403" "${R%%|*}" 403
R=$(post /payments/create-session.php "${FORM[@]}" --data-urlencode website=spam); check "honeypot → 204" "${R%%|*}" 204
R=$(post /payments/create-session.php -H "Origin: $SITE" --data-urlencode booking_reference=AT1 --data-urlencode amount=-5 --data-urlencode name=a --data-urlencode email=a@b.co); check "negative amount → 400" "${R%%|*}" 400
R=$(post /payments/create-session.php -H "Origin: $SITE" --data-urlencode booking_reference=AT1 --data-urlencode amount=10.555 --data-urlencode name=a --data-urlencode email=a@b.co); check "3-decimal amount → 400" "${R%%|*}" 400
R=$(post /payments/create-session.php -H "Origin: $SITE" --data-urlencode booking_reference=AT1 --data-urlencode amount=10 --data-urlencode name=a --data-urlencode email=a@b.co); check "below min (40 AFN) → 400" "${R%%|*}" 400
R=$(post /payments/create-session.php -H "Origin: $SITE" --data-urlencode booking_reference=AT1 --data-urlencode amount=100 --data-urlencode name=a --data-urlencode email=not-an-email); check "bad email → 400" "${R%%|*}" 400
R=$(post /payments/create-session.php -H "Origin: $SITE" --data-urlencode booking_reference='<script>' --data-urlencode amount=100 --data-urlencode name=a --data-urlencode email=a@b.co); check "bad booking reference → 400" "${R%%|*}" 400
R=$(post /payments/create-session.php "${FORM[@]/currency=AFN/currency=USD}"); check "currency mismatch (USD vs AFN) → 400" "${R%%|*}" 400

echo "== max_amount + rate limit"
write_cfg link "'max_amount' => 1000,"; start_site
R=$(post /payments/create-session.php "${FORM[@]}"); check "above max_amount → 400" "${R%%|*}" 400
write_cfg link ""; sed -i "s/'rate_limit_per_hour' => 1000/'rate_limit_per_hour' => 2/" "$TMP/config.php"; rm -rf "$TMP/data/ratelimit"; start_site
post /payments/create-session.php "${FORM[@]}" >/dev/null; post /payments/create-session.php "${FORM[@]}" >/dev/null
R=$(post /payments/create-session.php "${FORM[@]}"); check "3rd attempt with limit 2/hour → 429" "${R%%|*}" 429
rm -rf "$TMP/data/ratelimit"

echo "== api mode against local stub"
write_cfg api ""; start_site
contains "status.php reports enabled=true" "$(curl -s $SITE/payments/status.php)" '"enabled":true'
R=$(post /payments/create-session.php "${FORM[@]}"); check "api: HTTP 303" "${R%%|*}" 303
L=$(echo "$R" | cut -d'|' -f2); check "api: redirect to session url from response.url" "$L" "https://checkout.example/checkout/stub-session-123?data=stub"
REQ=$(cat "$TMP/stub/create-session.json" 2>/dev/null)
contains "api: Authorization header 'API-KEY <key>'" "$REQ" '"auth": "API-KEY test-key-not-real"'
contains "api: items[0].id = booking reference" "$REQ" '"id": "AT-2026-TEST1"'
contains "api: items[0].price = 1250.5" "$REQ" '"price": 1250.5'
contains "api: items[0].name" "$REQ" '"name": "Afghan Tours booking AT-2026-TEST1 - Deposit"'
contains "api: user_id present" "$REQ" '"user_id": "PAY-AT-2026-TEST1-'
contains "api: email" "$REQ" '"email": "payer@example.com"'
contains "api: redirect_success_url" "$REQ" "\"redirect_success_url\": \"$SITE/pay/success/\""
contains "api: redirect_failure_url" "$REQ" "\"redirect_failure_url\": \"$SITE/pay/cancelled/\""
if printf '%s' "$REQ" | grep -q '"quantity"\|"currency"'; then bad "api: no undocumented quantity/currency fields"; else ok "api: no undocumented quantity/currency fields"; fi
R=$(post /payments/create-session.php "${FORM[@]}" -H 'Accept: application/json'); contains "api: JSON redirect" "$R" '"redirect":"https://checkout.example/checkout/stub-session-123?data=stub"'
USER_ID=$(php -r '$d=json_decode(file_get_contents($argv[1]),true); echo $d["body"]["user_id"];' "$TMP/stub/create-session.json")

echo "== api mode: gateway failure"
sed -i "s#'api_key' => 'test-key-not-real'#'api_key' => 'wrong-key'#" "$TMP/config.php"; start_site
R=$(post /payments/create-session.php "${FORM[@]}"); check "api: stub 401 → friendly 502" "${R%%|*}" 502
contains "api: no stack trace / key in error page" "$R" "We could not open the secure HesabPay payment page"
if printf '%s' "$R" | grep -q 'wrong-key\|Stack trace\|Fatal'; then bad "api: error page leaks nothing"; else ok "api: error page leaks nothing"; fi
write_cfg api ""; start_site

echo "== webhook"
R=$(curl -s -o /dev/null -w '%{http_code}' "$SITE/payments/webhook.php"); check "webhook GET → 405" "$R" 405
R=$(post /payments/webhook.php -H 'Content-Type: application/json' --data 'not json'); check "webhook invalid JSON → 400" "${R%%|*}" 400
R=$(post /payments/webhook.php -H 'Content-Type: application/json' --data '{"status_code":10,"success":true}'); check "webhook missing signature → 400" "${R%%|*}" 400
BADW='{"status_code":10,"success":true,"transaction_id":"TX-BAD-1","user_id":"'"$USER_ID"'","amount":1250.5,"signature":"forged","timestamp":"1707719607","items":[{"id":"AT-2026-TEST1","name":"x","price":1250.5}]}'
R=$(post /payments/webhook.php -H 'Content-Type: application/json' --data "$BADW"); check "webhook bad signature → 403" "${R%%|*}" 403
contains "verify-signature called with {signature,timestamp}" "$(cat "$TMP/stub/verify-signature.json")" '"signature": "forged"'
ls "$TMP/data/webhooks/"*.json >/dev/null 2>&1 && bad "bad signature recorded nothing" || ok "bad signature recorded nothing"
GOODW='{"status_code":10,"success":true,"message":"Operation successful","sender_account":"793111222","transaction_id":"0328379001707719668","user_id":"'"$USER_ID"'","amount":1250.5,"memo":"x","signature":"good-signature","timestamp":"1707719607","transaction_date":"2026-10-10 11:04:28","items":[{"id":"AT-2026-TEST1","name":"x","price":1250.5}],"email":"payer@example.com"}'
R=$(post /payments/webhook.php -H 'Content-Type: application/json' --data "$GOODW"); check "webhook verified → 200" "${R%%|*}" 200
contains "webhook verified → success:true" "$R" '"success":true'
N=$(ls "$TMP/data/webhooks/"*.json 2>/dev/null | wc -l); check "one webhook record written" "$N" 1
contains "intent marked paid" "$(cat "$TMP/data/intents/"*"$(echo "$USER_ID" | tr -c 'A-Za-z0-9_\n-' '_')"*.json 2>/dev/null)" '"status": "paid"'
contains "amount matches intent" "$(cat "$TMP/data/webhooks/"*.json)" '"amount_matches_intent": true'
R=$(post /payments/webhook.php -H 'Content-Type: application/json' --data "$GOODW"); check "webhook repeat → 200" "${R%%|*}" 200
contains "webhook repeat flagged duplicate (idempotent)" "$R" '"duplicate":true'
N=$(ls "$TMP/data/webhooks/"*.json 2>/dev/null | wc -l); check "still one webhook record after repeat" "$N" 1

echo "== check.php token gate"
write_cfg api "'check_token' => 'local-test-token-0123456789abcdef',"; start_site
check "check.php wrong token → 404" "$(curl -s -o /dev/null -w '%{http_code}' "$SITE/payments/check.php?token=nope")" 404
R=$(curl -s "$SITE/payments/check.php?token=local-test-token-0123456789abcdef")
contains "check.php with token → JSON checks" "$R" '"checks"'
if printf '%s' "$R" | grep -q 'test-key-not-real'; then bad "check.php never prints API key"; else ok "check.php never prints API key"; fi
printf '%s' "$R" > "$TMP/check-output.json"

echo "== lib not directly executable"
B=$(curl -s "$SITE/payments/lib/hesabpay.php" -o /dev/null -w '%{http_code}'); check "direct GET lib/hesabpay.php → 404" "$B" 404

echo "== log hygiene"
if grep -q 'test-key-not-real\|wrong-key' "$TMP/data/payments.log"; then bad "payments.log contains no API key"; else ok "payments.log contains no API key"; fi

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
