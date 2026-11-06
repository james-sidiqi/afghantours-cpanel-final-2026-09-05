#!/usr/bin/env bash
# Same fail-closed checks for PRs and publishable releases. PHP and Chromium required.
set -euo pipefail
node scripts/validate-booking-data.mjs
node scripts/check-owner-venues.mjs
node --test scripts/booking-test/core.test.mjs
python3 -m unittest discover -s scripts/release -p 'test_*.py'
npm run build
php -l public/tour-inquiry.php
php scripts/booking-test/test-inquiry-guards.php
node scripts/booking-test/parity.mjs
php scripts/booking-test/test-core.php
for f in public/booking/departures.php public/booking/lib/*.php public/manage/index.php scripts/booking/hash-password.php \
  public/private-calculator/index.php public/trip-request/index.php public/trip-planner-lib/*.php scripts/trip-planner/hash-password.php
do php -l "$f"; done
python3 scripts/trip-planner/test_m1.py
python3 scripts/booking-test/integration.py
python3 scripts/booking-test/test-inquiry-mail.py
node --test scripts/booking-test/policy.test.mjs
node scripts/check-internal-links.mjs
node scripts/audit-retired-routes.mjs
python3 scripts/site_integrity_audit.py . --strict
node scripts/audit-content-slugs.mjs
node scripts/audit-images.mjs | tee /tmp/afghantours-image-audit.json
python3 -c 'import json; d=json.load(open("/tmp/afghantours-image-audit.json")); assert d.get("missing_count") == 0, d'
python3 scripts/audit-tour-sales-funnel.py
node scripts/audit-inquiry-entrypoints.mjs
node scripts/audit-tour-image-identity.mjs
npx playwright test
node scripts/clean-static-build.mjs
git add -f dist/
if ! git diff --cached --quiet -- dist/; then
  echo 'Tracked dist/ does not match the build. Rebuild and commit it; do not hand-edit HTML.'
  git diff --cached --stat -- dist/
  node scripts/ci-dist-drift-diagnose.mjs
  exit 1
fi
