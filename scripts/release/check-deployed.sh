#!/usr/bin/env bash
# Read-only: which release is live on staging/production, and is GitHub main ahead of it?
# Usage: check-deployed.sh   (needs curl, git; STAGING_AUTH="user:pass" optional for the protected staging site)
set -uo pipefail
REPO=james-sidiqi/afghantours-cpanel-final-2026-09-05
MAIN=$(git ls-remote "https://github.com/$REPO" refs/heads/main | cut -f1)
echo "github main: $MAIN"
show(){ local name=$1 url=$2; shift 2
  local j; j=$(curl -fsS "$@" "$url/version.json?cb=$(date +%s)" 2>/dev/null) || { echo "$name: no version.json (pre-workflow release or unreachable)"; return; }
  local c; c=$(printf '%s' "$j" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["release"],d["commit"],d["built_at"])')
  set -- $c; echo "$name: release=$1 commit=$2 built_at=$3"
  if [ "$2" = "$MAIN" ]; then echo "  -> up to date with main"; else
    n=$(git rev-list --count "$2..$MAIN" 2>/dev/null || echo "?"); echo "  -> main is $n commit(s) ahead (git fetch first if '?')"; fi; }
show production https://afghantours.com
show staging https://staging.afghantours.com ${STAGING_AUTH:+-u "$STAGING_AUTH"}
