# Consolidated staging candidate

This branch combines the owner update at `de3ec14ae39a0870a554b4f110045204578e6d48`, the additional food-photo work from PR #53 (`023914c`), and the province/hotel popup and Food & Culture card changes from PR #54 (`5a099cf`). Main and hosting are not changed by this branch.

## Result

- Preserve the latest owner hero/gallery choices, retired attractions and food entries, the new Balkh pages, the homepage carousel typography, and the five pending-folder photos.
- Add the available GitHub food photos, including Dopiaza, Shor Chai and the owner-provided melon/watermelon photos. Reuse matching files, keep the larger Sabzi hero, and retain distinct crops. The rice photo previously filed with Shor Nakhut belongs with the existing Shola photos.
- Apply the province and hotel popup fixes, including canonical image paths, actual asset checks, image failure recovery and Safari layout changes.
- Add the 14 photographic experience cards using current canonical images, including the newer Haji Aziz and Glassblowers selections.
- Generate the retired-route source block during prebuild and require its committed result in QA. Live `.htaccess` is never edited by this process.
- Make both asset audits recognize valid source aliases while checking every built URL directly. Remove the obsolete credit record for the archived Badghis image without assigning its credit to a different photo.
- Repair drift diagnostics for added/deleted hashed assets and filenames with spaces. Regression tests preserve genuine missing-file failures.
- Update the browser test for the restored Afghan Kabob page; retain redirect coverage for an entry that remains retired.

## Verification and review

Use the exact final commit and the full `scripts/release/qa.sh` result recorded with the staging release. Checks cover booking data, PHP syntax, inquiry guards, booking/mail fixtures, policy, links, retired routes, source/build asset integrity, browser behavior and reproducible tracked `dist/`.

This is a static staging candidate. Use the attached `at-…-full.zip`, not the automatic GitHub source archive, for cPanel. Preserve Directory Privacy, noindex/robots controls, `.htaccess`, PHP, booking/manage, private configuration and server-only data. The source is separately available on the integration branch. No production deployment or live email/booking test is included.
