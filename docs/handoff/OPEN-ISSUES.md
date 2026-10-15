# Open issues and blockers (2026-10-15)

## Blockers to deployment (all need James)
1. **No fresh production backup.** cPanel was unreachable from the agent box (first a bot-check page, then a timeout on port 2083). Do not bypass bot protection or retry in loops.
2. **Live .htaccess not read**, so the 4 redirect changes can't be merged yet (manifests/htaccess-diff.txt).
3. **No verified rollback point.**
4. **#36, #37 and #38 are unmerged** (#38 is still a draft and based on #37's branch). Merging needs James's explicit approval.
5. **Nothing from this release is deployed.** The live site is main 4e4d9f0e and still has the popup-image bug.
6. **Production inquiry → mailbox delivery is untested.** The last live inquiries were AT-2026-00008/9 on 14 Oct; their arrival in the mailbox is unverified.

## Content and asset items waiting on James
- **Wakhan village + river photo** "238F4C8E-D4A0-4F49-92A7-340AD83E1AD1(1).jpeg": not received, not placed.
- **James's own NRVV photo:** not received. The temporary image is public/assets/images/attractions/nuristan-river-valleys-villages/hero.webp; to swap it, replace that file (WebP) and its alt in src/data/imageAlts.ts, then rebuild.
- **Photo credits:** TBD for the t245–t277 images (docs/image-register-*.csv, credit column "TBD"). Not shown on the site; don't invent credits.
- **Duplicate Mazar hub file:** `src/content/hubs/mazar-e-sharif.md` and `src/content/hubs/mazar-e-sharif-city.md` both set `hub_slug: mazar-e-sharif` and have essentially the same text.
  - **Authoritative:** mazar-e-sharif.md. Its `slug` matches the filename, the -city file's own frontmatter says `save_to: src/content/hubs/mazar-e-sharif.md`, and .htaccess 301s /hubs/mazar-e-sharif-city/ → /hubs/mazar-e-sharif/.
  - Recommendation: retire mazar-e-sharif-city.md (move it to src/content/_inactive/) once James approves, then rebuild. **Not deleted.**

## Non-blocking notes found during the handoff
- The old docs/DEPLOYMENT-CPANEL.md is superseded by docs/handoff/DEPLOYMENT-RUNBOOK.md.
- The local merge branch release-combined-local was never pushed. The final release must be rebuilt from merged main anyway.
- PR #17 (HesabPay) is a draft and CONFLICTING with main. It is out of scope; leave it.
- Inert legacy `*.backup*` / `*.before-*` component files exist in src/components/. Cleanup is optional, with James's approval only.
