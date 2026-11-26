#!/usr/bin/env bash
# Booking system tests: data validation, JS core, PHP core (+JS parity), PHP lint, end-to-end on php -S (needs dist/).
set -euo pipefail
node scripts/validate-booking-data.mjs
node --test scripts/booking-test/core.test.mjs
node scripts/booking-test/parity.mjs
php scripts/booking-test/test-core.php
for f in public/tour-inquiry.php public/booking/departures.php public/booking/lib/booking.php public/manage/index.php public/booking/lib/inquiry-mail.php public/booking/lib/inquiry-cron.php scripts/booking/hash-password.php; do php -l "$f"; done
python3 scripts/booking-test/integration.py
python3 scripts/booking-test/test-inquiry-mail.py
node --test scripts/booking-test/policy.test.mjs
