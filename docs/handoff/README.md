# AfghanTours.com handoff (Grok Bot → GitHub Copilot), 2026-10-15

**Read [CURRENT-STATE-2026-10-16.md](CURRENT-STATE-2026-10-16.md) first.** It is the authoritative state as of 16 Oct 2026.

Then read in this order:
1. [AFGHANTOURS-COPILOT-HANDOFF.md](AFGHANTOURS-COPILOT-HANDOFF.md): architecture, rules, where everything is
2. [RELEASE-STATUS.md](RELEASE-STATUS.md): PRs, commits, release package and verification results (the **single source** for SHAs and numbers)
3. [OPEN-ISSUES.md](OPEN-ISSUES.md): blockers and unfinished work (the single source for open items)
4. [DEPLOYMENT-RUNBOOK.md](DEPLOYMENT-RUNBOOK.md): the only deployment and rollback procedure (supersedes the older docs/DEPLOYMENT-CPANEL.md)
5. [ASSET-MANIFEST.md](ASSET-MANIFEST.md): image assignments, provenance and missing photos
6. [NEXT-AGENT-PROMPT.md](NEXT-AGENT-PROMPT.md): the prompt to paste into Copilot

Location: branch `t271-attractions-nuristan` (PR #38), folder `docs/handoff/`.
https://github.com/james-sidiqi/afghantours-cpanel-final-2026-09-05/tree/t271-attractions-nuristan/docs/handoff

Supporting files:
- `manifests/`: stale-to-trash.txt (13), htaccess-diff.txt (4 redirect changes), htaccess-main-4e4d9f0e.txt (the repo .htaccess at main 4e4d9f0e; the live file has not been compared with it), htaccess-repo-version.txt (the proposed .htaccess), changes-vs-live.txt (git name-status), release-deploy-zip-manifest.sha256 (per-file sha256 for all 344 zip entries), release-deploy.zip.sha256
- `logs/`: the local check logs re-run on 2026-10-15 (see RELEASE-STATUS.md §4)

Release assets (GitHub prerelease `handoff-2026-10-15`):
- Deploy package: https://github.com/james-sidiqi/afghantours-cpanel-final-2026-09-05/releases/download/handoff-2026-10-15/release-deploy.zip (sha256 in RELEASE-STATUS.md)
- Handoff bundle (these docs + logs + QC screenshots): https://github.com/james-sidiqi/afghantours-cpanel-final-2026-09-05/releases/download/handoff-2026-10-15/AfghanTours-GitHub-Copilot-Handoff.zip. Its sha256 is in the release notes and in SHA256SUMS.txt on the release; it can't be stored inside itself.


## State verified 16 Oct 2026
The authoritative current state is in [CURRENT-STATE-2026-10-16.md](CURRENT-STATE-2026-10-16.md), which covers the SHAs, PR states and CI, GitHub main vs the cPanel checkout vs live, PR #39 being staging only, the blockers and the next actions. Where this file conflicts with it, CURRENT-STATE wins. Summary: #36 and #37 are open, ready, mergeable and green. #38 is an open draft, mergeable and green, stacked on #37. #39 is an open draft, staging only and green. GitHub main is `4e4d9f0e`. The cPanel Git checkout is main at `8ee09517` (older, never deploy from it). Live production is newer than that checkout and not proven equal to GitHub main.
