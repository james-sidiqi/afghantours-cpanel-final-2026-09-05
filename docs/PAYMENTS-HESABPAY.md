# Online payments — HesabPay framework

**Status:** built, **disabled by default**. No real payments are possible until James adds a HesabPay API key (or activates the public link) in a private config file on the server. Nothing here is linked from the nav, footer, or tour pages yet.

## 1. Architecture

```
Customer ── /pay/ (static Astro page, noindex, not in sitemap)
   │  POST booking_reference, amount, name, email, description, notes
   ▼
/payments/create-session.php  (PHP on cPanel)
   ├─ mode=disabled → "Online payment is not available yet" page (HTTP 503) + contact/WhatsApp
   ├─ mode=link     → 303 redirect to https://hesab.com/pay/AFGHANTOURS/en
   └─ mode=api      → POST https://api.hesab.com/api/v1/payment/create-session (API key, server-side)
                       → 303 redirect to HesabPay hosted checkout (response "url")
Customer pays by card on HesabPay's page (no card data ever touches afghantours.com)
   ├─ browser returns to /pay/success/ or /pay/cancelled/   (customer-facing only)
   └─ HesabPay → POST /payments/webhook.php                  (source of truth)
                   → verify via POST /api/v1/hesab/webhooks/verify-signature
                   → record once (idempotent on transaction_id) in the private folder
                   → email a payment notice to info@afghantours.com
```

HesabPay pages cannot be embedded: hesab.com sends `X-Frame-Options: SAMEORIGIN`, so the customer is always redirected to HesabPay.

## 2. Files

| File | Purpose |
|---|---|
| `src/pages/pay/index.astro` | `/pay/` form. Customer enters the invoiced amount; no prices published. Calls `/payments/status.php` to show "not available yet" and disable the button when off. |
| `src/pages/pay/success.astro`, `src/pages/pay/cancelled.astro` | Return pages (`redirect_success_url` / `redirect_failure_url`). |
| `src/components/payments/PaymentResult.astro` | Shared layout for the two return pages. |
| `src/layouts/BaseLayout.astro` | New optional `robots` prop (default unchanged); payment pages pass `noindex`, which also keeps them out of `sitemap.xml`. |
| `public/payments/create-session.php` | Starts a payment (POST only). |
| `public/payments/webhook.php` | HesabPay webhook receiver. |
| `public/payments/status.php` | Public, non-secret: `{enabled, currency, min_amount, max_amount}`. |
| `public/payments/check.php` | Server diagnostics. **Off (404) unless** `check_token` is set in the private config. |
| `public/payments/lib/hesabpay.php` | Shared library + the single **HesabPay adapter** (all endpoint paths and field names). |
| `public/payments/.htaccess`, `public/payments/lib/.htaccess` | Deny logs/json/examples/config; deny the whole `lib/` folder. |
| `public/.htaccess` | Added a deny rule for `hesabpay-config*`, `*.example.php`, `payments.log`, `afghantours-private/`, `payments-data/`. |
| `config/hesabpay-config.example.php` | Config template (not in `public/`, so never in `dist/` or the ZIP). |
| `scripts/test-payments.sh`, `scripts/payments-test/hesab-stub.php` | Local test harness with a fake HesabPay API. Runs in CI. |

## 3. Configuration (server-side only — never in git, never in the ZIP)

Live host facts (read-only cPanel inspection, 2026-10-10): account home `/home/jamesbon`; afghantours.com is an **addon domain** with document root `/home/jamesbon/afghantours.com` (not `public_html`); PHP 8.1 (ea-php81); AutoSSL valid for afghantours.com + www (auto-renews); `info@afghantours.com` mailbox exists.

Config file location (first match wins):
1. Path in environment variable `HESABPAY_CONFIG`
2. `<docroot>/../afghantours-private/hesabpay-config.php` = **`/home/jamesbon/afghantours-private/hesabpay-config.php`**

Environment variables override file values: `HESABPAY_MODE`, `HESABPAY_API_KEY`, `HESABPAY_API_BASE`, `HESABPAY_PUBLIC_LINK_URL`, `HESABPAY_SUCCESS_URL`, `HESABPAY_CANCEL_URL`, `HESABPAY_CURRENCY`, `HESABPAY_MIN_AMOUNT`, `HESABPAY_MAX_AMOUNT`, `HESABPAY_DATA_DIR`, `HESABPAY_NOTIFY_EMAIL`, `HESABPAY_RATE_LIMIT_PER_HOUR`.

| Key | Default | Notes |
|---|---|---|
| `mode` | `disabled` | `disabled` \| `link` \| `api`. No config → `disabled`. Invalid value, `api` without key, or non-HTTPS URL → `disabled`. |
| `api_key` | `''` | HesabPay dashboard → Developer → API Key. Needed for `api` mode **and** for webhook verification. |
| `api_base` | `https://api.hesab.com` | Sandbox: `https://api-sandbox.hesab.com`. HTTPS required (http only allowed for 127.0.0.1 tests). |
| `public_link_url` | `https://hesab.com/pay/AFGHANTOURS/en` | Used in `link` mode. Currently **inactive** at HesabPay. |
| `success_url` / `cancel_url` | `https://afghantours.com/pay/success/` / `.../pay/cancelled/` | Sent as `redirect_success_url` / `redirect_failure_url`. |
| `currency` | `AFN` | HesabPay docs: item prices are treated as AFN. Must match the `/pay/` page (`PAYMENT_CURRENCY`). |
| `min_amount` | `40` | Docs: international cards need ~40 AFN or more. |
| `max_amount` | `null` | Typo guard — James to choose. |
| `data_dir` | `/home/jamesbon/afghantours-private/payments-data` | `payments.log` (JSON lines), `intents/`, `webhooks/`, `ratelimit/`. Created 0700. |
| `notify_email` / `notify_from` | `info@afghantours.com` | PHP `mail()`, same pattern as `tour-inquiry.php`. |
| `notify_on_webhook` | `true` | Email per verified webhook. |
| `notify_on_intent` | `false` | Email when a customer starts a payment (useful in `link` mode, which cannot carry amount/reference). |
| `rate_limit_per_hour` | `10` | Per IP for create-session. 0 = off. |
| `allowed_origins` | `[]` | Extra origins allowed to POST (same host always allowed). |
| `http_connect_timeout` / `http_timeout` | `5` / `15` s | Calls to HesabPay. |
| `check_token` | `''` | Enables `/payments/check.php?token=…` (24+ chars). Set back to `''` after use. |

## 4. Modes

- **disabled** (default): `/pay/` shows a yellow "Online payment is not available yet" notice with email/WhatsApp and disables the button. A direct POST gets a friendly HTML page (HTTP 503) or JSON `{"ok":false,"reason":"disabled"}`.
- **link**: after validation, the customer is redirected (303) to the public HesabPay link. The link cannot carry the amount or booking reference — the customer types the amount on HesabPay, and staff reconcile manually in the HesabPay dashboard (turn on `notify_on_intent` to get an email with what the customer entered). Requires HesabPay to activate the link (call 580).
- **api**: after validation, the server creates a HesabPay session for the exact invoiced amount and redirects to the hosted checkout. The webhook confirms the result and emails info@afghantours.com.

## 5. HesabPay API contract used (and source)

Sources: official docs https://docs.hesab.com (pages: api-reference/authentication, api-reference/create-payment-session, quickstart/create-session, quickstart/handle-result, webhooks/overview, webhooks/event-payloads, webhooks/verify-signatures, api-reference/errors, payment-methods/international-cards; read 2026-10-10) and the WordPress plugin *Integrate HesabPay for WooCommerce* v1.0.0 PHP source.

| Item | Value used | Source |
|---|---|---|
| Auth header | `Authorization: API-KEY <key>` | docs authentication; plugin |
| Create session | `POST {api_base}/api/v1/payment/create-session`, JSON | docs; plugin |
| Request body | `user_id` (≤50, our unique `PAY-<ref>-<time>-<rand>`), `items:[{id (≤50) = booking ref, name (≤500) = "Afghan Tours booking <ref> - <description>", price (≤2 dp)}]`, `email`, `redirect_success_url`, `redirect_failure_url`. **No** `quantity`, **no** `currency` field. | docs create-session (field list + limits) |
| Response | `{"status_code":10,"success":true,"message":…,"url":"https://…","expires_at":…}` → redirect to `url` | docs; plugin reads `url` |
| Errors | 400 `{"success":false,"message":…}`, 401 `{"detail":…}`, 403/404/429/500 | docs errors |
| Webhook events | `payment_success`, `payment_failure` (registered in dashboard → Developer → Webhooks) | docs webhooks/overview |
| Webhook payload (success) | `status_code`, `success`, `message`, `sender_account`, `transaction_id`, `user_id`, `amount`, `memo`, `signature`, `timestamp`, `transaction_date`, `items[{id,name,price}]`, `email` | docs event-payloads |
| Paid rule | `status_code == 10 && success === true` | docs payload; plugin |
| Verify | `POST {api_base}/api/v1/hesab/webhooks/verify-signature` body `{"signature","timestamp"}`; trusted only if response `success === true` | docs verify-signatures; plugin |
| Idempotency | on `transaction_id` (fallback signature+timestamp) | docs event-payloads "Handling" |
| Currency | item prices treated as **AFN**; int'l cards need ≈40 AFN+ | docs international-cards |

## 6. VERIFY items (could not be confirmed from public sources)

All isolated in the adapter section at the top of `public/payments/lib/hesabpay.php`:

1. **Currency.** Docs say prices are treated as AFN and there is no currency field. If AfghanTours invoices in USD, James must confirm with HesabPay whether USD charging is possible; otherwise invoices for online payment must be in AFN. (No FX rate is invented here.)
2. **`payment_failure` payload shape** is not documented (only the success payload is). We record any verified failure webhook and mark the intent `failed`; a failure webhook without `transaction_id` is de-duplicated on signature+timestamp.
3. **Redirect query parameters.** Docs don't specify what HesabPay appends to the success/failure URL (a third-party Dart SDK mentions `?data=`). Our return pages ignore query params and never treat a redirect as proof of payment.
4. **Webhook timestamp freshness / replay window** is not documented. We rely on HesabPay's verify-signature endpoint plus our idempotency; no local age check.
5. **Verify-signature response** beyond `success` is not documented. Network error/5xx → we answer 503 (so HesabPay can retry); a definite non-success → 403.
6. **Webhook retry policy / expected response** (we return HTTP 200 JSON `{"success":true}` like the plugin).
7. **Whether the public link `https://hesab.com/pay/AFGHANTOURS/en` accepts cards** once activated — test after activation.
8. **Sandbox access** (`https://api-sandbox.hesab.com`, developers-sandbox.hesab.com) — whether James's account has one for a dry run before production.

## 7. How James switches it on

1. **Activate the merchant link:** call HesabPay customer service **580** (the link currently says "Payment link is not active").
2. **Get the API key:** sign in to the HesabPay developer dashboard (developers.hesab.com; sandbox: developers-sandbox.hesab.com) → Developer → API Key → generate. Keep it secret.
3. **Deploy the site** (includes `/payments/` and `/pay/`). The upload **must include `dist/.htaccess`** — the live docroot currently has no top-level `.htaccess`.
4. **Create the private folder** (cPanel File Manager, outside the docroot):
   `/home/jamesbon/afghantours-private/` (permissions 700)
   Copy `config/hesabpay-config.example.php` there as `hesabpay-config.php` (permissions 600) and fill in `api_key`. Leave `mode => 'disabled'` for now.
5. **Run the server check:** temporarily set `check_token` to a long random string, open `https://afghantours.com/payments/check.php?token=<it>`, confirm curl, openssl, json, mbstring, mail(), HTTPS, private folder writable/outside docroot, and outbound HTTPS to api.hesab.com are all `ok:true`. Then set `check_token` back to `''`.
6. **Register the webhook** in the HesabPay dashboard → Developer → Webhooks: URL `https://afghantours.com/payments/webhook.php`, events `payment_success` and `payment_failure`.
7. **Switch mode** to `api` (or `link` if only the public link is available).
8. **Test with a small real payment** (≥ 40 AFN) using a test booking reference: confirm the redirect to HesabPay, the return to `/pay/success/`, the notice email at info@afghantours.com, and a record under `afghantours-private/payments-data/webhooks/`.
9. **Decide visibility** (see below) — only then link `/pay/` from the site.

To switch off instantly: set `mode => 'disabled'` (or rename the config file).

## 8. Security notes

- API key only in the private config/env; never in git, `dist/`, the ZIP, HTML, JS, logs, or error pages. `status.php` and `check.php` expose no secrets (`check.php` shows "api_key present: yes/no" only, and is 404 unless the token is set).
- Card data never reaches our server (hosted checkout).
- `create-session.php`: POST only; same-origin check (Origin/Referer host must match; `Sec-Fetch-Site` honoured); honeypot `website`; per-IP rate limit; strict validation (reference pattern, email, amount `^\d{1,9}(\.\d{1,2})?$` within min/max, currency must match config); 5 s connect / 15 s total timeouts; no redirects followed; TLS verification on; customers see only friendly messages.
- `webhook.php`: POST only; 64 KB body cap; requires `signature` + `timestamp`; **verified with HesabPay before anything is recorded**; unverified → 403; idempotent (`fopen('x')` on a per-transaction file); amount compared with what the customer entered and flagged in the email if different.
- Logs: minimal JSON lines (event, reference, amount, internal id, HTTP status). Payer name/email are stored only in the private `intents/` records.
- `.htaccess` denies `lib/`, logs, JSON, examples, and config names under the web root as a second line of defence; the private folder is outside the docroot anyway.

## 9. Decisions needed from James

1. **Deposit policy** — deposit vs. full payment, and how much; who issues booking references and invoices.
2. **Currency** — invoice online payments in AFN (as HesabPay documents), or confirm USD support with HesabPay.
3. **`max_amount`** typo ceiling.
4. **Refund / cancellation / payment terms wording** for `/pay/` (TODO placeholder in `src/pages/pay/index.astro`; nothing invented) and whether `/terms/` needs a payments section.
5. **Visibility** — whether/where to link "Pay" (nav, footer, tour pages, invoice emails only).
6. **`link` vs `api` mode** while waiting for the API key.
7. **Notification** — keep emails to info@afghantours.com, add a second recipient, or also turn on `notify_on_intent`.

## 10. Local testing

```
bash scripts/test-payments.sh
```

Starts PHP's built-in server for `public/` and a fake HesabPay API on 127.0.0.1, then checks disabled/link/api modes, request guards, the exact create-session request, webhook rejection/acceptance/idempotency, the check-page token gate, and log hygiene. It never contacts HesabPay. The same script runs in CI.
