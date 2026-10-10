<?php
/**
 * AfghanTours — HesabPay payment configuration TEMPLATE.
 *
 * DO NOT put real values in this file and DO NOT upload it to the web root (/home/jamesbon/afghantours.com).
 *
 * On the live cPanel account (home /home/jamesbon; afghantours.com is an ADDON domain whose
 * document root is /home/jamesbon/afghantours.com — not public_html):
 *   1. Create the folder  /home/jamesbon/afghantours-private/   (next to afghantours.com, NOT inside it)
 *   2. Copy this file there as  hesabpay-config.php  and fill in the values.
 *   3. chmod 600 hesabpay-config.php ; chmod 700 afghantours-private
 *
 * The payment scripts look for the file at:
 *   - the path in env var HESABPAY_CONFIG, if set; otherwise
 *   - <docroot>/../afghantours-private/hesabpay-config.php
 *     = /home/jamesbon/afghantours-private/hesabpay-config.php
 * Environment variables (HESABPAY_API_KEY, HESABPAY_MODE, ...) override values here.
 *
 * With no config at all, online payment is DISABLED.
 */

return [
    // disabled | link | api
    //   disabled: /pay/ explains online payment is not available yet and points to contact/WhatsApp.
    //   link:     sends the customer to the public HesabPay link below (no amount or reference passed).
    //   api:      creates a HesabPay payment session for the invoiced amount and redirects to it.
    'mode' => 'disabled',

    // From HesabPay dashboard → Developer → API Key. Required for 'api' mode and for webhooks.
    'api_key' => '',

    // Production: https://api.hesab.com   Sandbox: https://api-sandbox.hesab.com
    'api_base' => 'https://api.hesab.com',

    // Public merchant link (must be activated by HesabPay — call customer service 580).
    'public_link_url' => 'https://hesab.com/pay/AFGHANTOURS/en',

    // Where HesabPay sends the customer's browser afterwards (customer-facing only; webhook is the truth).
    'success_url' => 'https://afghantours.com/pay/success/',
    'cancel_url' => 'https://afghantours.com/pay/cancelled/',

    // HesabPay docs: item prices are treated as AFN. Change only if HesabPay confirms another currency.
    'currency' => 'AFN',

    // Amount guards (in the currency above). HesabPay docs: international cards need ~40 AFN or more.
    'min_amount' => 40,
    'max_amount' => null,   // e.g. a ceiling James chooses, to catch typos

    // Private folder for payments.log, payment intents, webhook records, rate-limit counters.
    'data_dir' => dirname(__FILE__) . '/payments-data',

    // Payment notices (uses PHP mail(), same as tour-inquiry.php).
    'notify_email' => 'info@afghantours.com',
    'notify_from' => 'AfghanTours Website <info@afghantours.com>',
    'notify_on_webhook' => true,   // email when HesabPay confirms a payment / failure
    'notify_on_intent' => false,   // email when a customer starts a payment (useful in 'link' mode)

    // Max payment-start attempts per IP per hour (0 = off).
    'rate_limit_per_hour' => 10,

    // Extra origins allowed to POST to /payments/create-session.php besides the site's own host.
    'allowed_origins' => [],

    'http_connect_timeout' => 5,
    'http_timeout' => 15,

    // Server check page: /payments/check.php?token=<this value>. Leave '' to keep it switched off (404).
    // Use a long random string (24+ chars), run the check, then set it back to ''.
    'check_token' => '',
];
