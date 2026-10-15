# AfghanTours.com handoff (Grok Bot → GitHub Copilot), 2026-10-15

Read in this order:
1. [AFGHANTOURS-COPILOT-HANDOFF.md](AFGHANTOURS-COPILOT-HANDOFF.md): architecture, rules, where everything is
2. [RELEASE-STATUS.md](RELEASE-STATUS.md): PRs, commits, release package and verification results (the **single source** for SHAs and numbers)
3. [OPEN-ISSUES.md](OPEN-ISSUES.md): blockers and unfinished work (the single source for open items)
4. [DEPLOYMENT-RUNBOOK.md](DEPLOYMENT-RUNBOOK.md): the only deployment and rollback procedure (supersedes the older docs/DEPLOYMENT-CPANEL.md)
5. [ASSET-MANIFEST.md](ASSET-MANIFEST.md): image assignments, provenance and missing photos
6. [NEXT-AGENT-PROMPT.md](NEXT-AGENT-PROMPT.md): the prompt to paste into Copilot

Location: branch `t271-attractions-nuristan` (PR #38), folder `docs/handoff/`.
https://github.com/james-sidiqi/afghantours-cpanel-final-2026-09-05/tree/t271-attractions-nuristan/docs/handoff

Supporting files:
- `manifests/`: stale-to-trash.txt (13), htaccess-diff.txt (4 redirect changes), htaccess-main-4e4d9f0e.txt (the repo .htaccess at the live baseline), htaccess-repo-version.txt (the proposed .htaccess), changes-vs-live.txt (git name-status), release-deploy-zip-manifest.sha256 (per-file sha256 for all 344 zip entries), release-deploy.zip.sha256
- `logs/`: the local check logs re-run on 2026-10-15 (see RELEASE-STATUS.md §4)

Release assets (GitHub prerelease `handoff-2026-10-15`):
- Deploy package: https://github.com/james-sidiqi/afghantours-cpanel-final-2026-09-05/releases/download/handoff-2026-10-15/release-deploy.zip (sha256 in RELEASE-STATUS.md)
- Handoff bundle (these docs + logs + QC screenshots): https://github.com/james-sidiqi/afghantours-cpanel-final-2026-09-05/releases/download/handoff-2026-10-15/AfghanTours-GitHub-Copilot-Handoff.zip. Its sha256 is in the release notes and in SHA256SUMS.txt on the release; it can't be stored inside itself.
