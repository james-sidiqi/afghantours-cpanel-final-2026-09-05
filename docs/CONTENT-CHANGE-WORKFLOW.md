# Future content changes — short owner workflow

1. Tell the editing agent what to change, with the page URL and exact wording/image decision. The repository is the source of truth; do not make routine content edits directly in File Manager.
2. The agent updates source, rebuilds tracked `dist/`, runs checks and opens a PR. Review the change and any owner decisions; do not merge a red or draft/unapproved PR.
3. After approving the code merge and green main CI, have Grokbot create the verified release ZIP and stage it on the separate cPanel staging site.
4. Review the staging link. Approve the **release ID** when satisfied.
5. Grokbot verifies a fresh backup and promotes that exact ZIP to production, checks the site and records the deployment.

GitHub builds the package. cPanel staging is where you review the deployed preview. Production is a separate approval. Do not use the broken cPanel Git button or upload a whole source/old handoff ZIP.

The technical details and rollback procedure are in `RELEASE-RUNBOOK.md`; the copyable agent instruction is `GROKBOT-HANDOFF.md`.
