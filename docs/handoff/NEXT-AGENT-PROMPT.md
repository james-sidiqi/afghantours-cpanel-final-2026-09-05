# Prompt to paste into GitHub Copilot

```
You are taking over the AfghanTours.com website (repo james-sidiqi/afghantours-cpanel-final-2026-09-05) from a previous agent. You have no other history; everything is in docs/handoff/ on branch t271-attractions-nuristan (PR #38).

1. Read first, in order: docs/handoff/CURRENT-STATE-2026-10-16.md (the authoritative state as of 16 Oct 2026), README.md, AFGHANTOURS-COPILOT-HANDOFF.md, RELEASE-STATUS.md, OPEN-ISSUES.md, DEPLOYMENT-RUNBOOK.md, ASSET-MANIFEST.md. Also read AGENT-RULES.md at the repo root.
2. Inspect the actual state: gh pr view 36, 37, 38, 39 (heads, base branches, checks, draft status, mergeability). Compare it with RELEASE-STATUS.md and report any difference.
3. Before any change, confirm your current branch and commit (git status; git rev-parse HEAD), and work only on the correct PR branch.
4. Confirm that the release artifacts are reachable: GitHub release handoff-2026-10-15 (release-deploy.zip, sha256 fe3fd8a50a02488e1ac5793c80b75ac1bc7c7133562c8fb60211c19bf14fe62a; AfghanTours-GitHub-Copilot-Handoff.zip).
5. Preserve all approved work in #36, #37 and #38. Don't revert, restyle or rewrite it.
6. Work only on the items in OPEN-ISSUES.md.
7. No redesigns, no content rewrites, no AI or stock images, never the tagline "Afghanistan, Reimagined.", and never remove a photo only over provenance.
8. You may prepare for deployment (rebuild, reconcile the zip, run the checks in RELEASE-STATUS.md §4), but you must NOT deploy, use cPanel, or change production.
9. The cPanel Git checkout (main 8ee09517) is older than live and GitHub. Never deploy from it. PR #39 stays a draft and staging only. Live is not proven equal to GitHub main.
10. Ask James for explicit authorization before merging any PR, retargeting #38, or touching production, .htaccess, /booking/, /manage/, the private config or HesabPay PR #17. Never print credentials.

Start by reporting: the PR status you found, any differences from the handoff, and what you propose to do next. Make no changes until James replies.
```


## State verified 16 Oct 2026
The authoritative current state is in [CURRENT-STATE-2026-10-16.md](CURRENT-STATE-2026-10-16.md), which covers the SHAs, PR states and CI, GitHub main vs the cPanel checkout vs live, PR #39 being staging only, the blockers and the next actions. Where this file conflicts with it, CURRENT-STATE wins. Summary: #36 and #37 are open, ready, mergeable and green. #38 is an open draft, mergeable and green, stacked on #37. #39 is an open draft, staging only and green. GitHub main is `4e4d9f0e`. The cPanel Git checkout is main at `8ee09517` (older, never deploy from it). Live production is newer than that checkout and not proven equal to GitHub main.
