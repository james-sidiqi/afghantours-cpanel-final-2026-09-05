#!/usr/bin/env bash
# Build a deployable release package from an already-built dist/.
# Usage: scripts/release/build-release.sh [outdir]   (run after `npm run build`)
# Produces: <id>.zip, <id>.zip.sha256, <id>.manifest.sha256, <id>.version.json
set -euo pipefail
OUT="${1:-release-out}"
SHA="$(git rev-parse HEAD)"; SHORT="${SHA:0:8}"
BUILT_AT="$(TZ=UTC git show -s --date=format-local:%Y-%m-%dT%H:%M:%SZ --format=%cd HEAD)"  # commit time: makes the zip reproducible
ID="at-${BUILT_AT:0:4}${BUILT_AT:5:2}${BUILT_AT:8:2}-${SHORT}"
[ -f dist/index.html ] || { echo "dist/ missing; run npm run build" >&2; exit 1; }
if ! git diff --quiet HEAD -- dist src public data 2>/dev/null; then echo "working tree dirty; refuse" >&2; exit 1; fi
rm -rf "$OUT" && mkdir -p "$OUT/stage"
# Copy dist, then drop excluded paths
cp -a dist/. "$OUT/stage/"
( cd "$OUT/stage"
  find . -name '.htaccess' -delete
  find . -name '*.php' -delete
  find . -name 'README.md' -delete
  rm -rf booking manage photo-credits .well-known
  find . -type d -empty -delete )
cat > "$OUT/stage/version.json" <<JSON
{"release":"$ID","commit":"$SHA","built_at":"$BUILT_AT","repo":"james-sidiqi/afghantours-cpanel-final-2026-09-05"}
JSON
# Guard: nothing forbidden may remain
if ( cd "$OUT/stage" && find . \( -name '*.php' -o -name '.htaccess' -o -path './booking*' -o -path './manage*' -o -path './.well-known*' -o -path './photo-credits*' -o -name '.env*' \) | grep -q . ); then
  echo "forbidden path in package" >&2; exit 1; fi
( cd "$OUT/stage" && find . -type f | sed 's#^\./##' | LC_ALL=C sort | xargs -d '\n' sha256sum > "../$ID.manifest.sha256" )
python3 - "$OUT/stage" "$OUT/$ID.zip" <<'PY'
import os,sys,zipfile
src,dst=sys.argv[1],sys.argv[2]
files=sorted(os.path.relpath(os.path.join(r,f),src) for r,_,fs in os.walk(src) for f in fs)
with zipfile.ZipFile(dst,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for f in files:
        i=zipfile.ZipInfo(f,(1980,1,1,0,0,0)); i.external_attr=0o644<<16; i.compress_type=zipfile.ZIP_DEFLATED
        z.writestr(i,open(os.path.join(src,f),'rb').read())
PY
( cd "$OUT" && sha256sum "$ID.zip" > "$ID.zip.sha256" && cp stage/version.json "$ID.version.json" )
echo "$ID" > "$OUT/RELEASE_ID"
echo "release=$ID files=$(wc -l < "$OUT/$ID.manifest.sha256") zip_sha256=$(cut -d' ' -f1 "$OUT/$ID.zip.sha256")"
