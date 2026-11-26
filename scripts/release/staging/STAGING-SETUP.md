# Staging controls supplied with every verified release

These three sidecar files are release assets outside the production ZIP. They
can also be downloaded from `scripts/release/staging/` on the approved PR while
preparing hosting. Never extract the repository source into a document root.

1. Verify the actual staging document root and back up its existing `.htaccess`
   outside webroots. Keep the cPanel Directory Privacy authentication/password
   files and existing PHP/booking/manage deny rules intact.
2. Upload `robots-staging.txt` to that staging root. It uses a reserved filename
   excluded from every production ZIP. Do not rename it `robots.txt`.
3. Merge `STAGING-HTACCESS-FRAGMENT.txt` into the existing staging `.htaccess`,
   before catch-all rewrite rules. It is a fragment, not a replacement file.
   Review the complete merged file before upload, preserving authentication.
   If the editor is broken, an authorized file upload of that merged file may
   be used. If access is denied by permissions/protection, stop and report the
   exact error; do not bypass it, loosen permissions or disable protection.
4. Verify valid HTTPS, unauthenticated 401 responses, authenticated page/asset/
   version responses, and the `X-Robots-Tag: noindex, nofollow` header. Verify
   authenticated `/robots.txt` serves `User-agent: *` and `Disallow: /`, and that
   PHP, booking and management endpoints remain blocked. Test directory routes
   and `/index.html` directly. The actual server must support the fragment's
   Apache 2.4.10+ headers expression and rewrite directives; an absent header
   or 500 response is a blocker, not a passed check. Restore the backup on failure.
5. Extract the exact unchanged release ZIP into staging. Repeat the checks.
   Extraction can overwrite production's `robots.txt`, but the persistent
   rewrite continues serving `robots-staging.txt`. The ZIP contains neither
   `.htaccess` nor this reserved staging robots file.
6. At production promotion, extract only the approved static ZIP. Do not install
   any staging sidecar there. Verify production remains public and indexable.

Authentication is the staging access barrier. Robots/noindex are additional
controls and do not replace it. A module guard can skip an unavailable module,
so inspect real responses rather than assuming successful upload proves setup.

Reference syntax:
- https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- https://httpd.apache.org/docs/2.4/rewrite/intro.html
