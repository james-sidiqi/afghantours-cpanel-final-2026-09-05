#!/usr/bin/env bash
# Build an "update package" containing only files that differ from the release currently deployed.
# Usage: make-delta.sh <deployed.manifest.sha256> <new.manifest.sha256> <new-stage-dir> <out.zip>
# Writes <out>.changed.txt (added/replaced) and <out>.stale.txt (in old, not in new: NEVER auto-deleted).
set -euo pipefail
OLD="$1"; NEW="$2"; STAGE="$3"; OUTZIP="$4"; BASE="${OUTZIP%.zip}"
python3 - "$OLD" "$NEW" "$STAGE" "$OUTZIP" "$BASE" <<'PY'
import sys,os,zipfile
old,new,stage,outzip,base=sys.argv[1:]
rd=lambda p:{l[66:].rstrip('\n'):l[:64] for l in open(p) if len(l)>66}
o,n=rd(old),rd(new)
changed=sorted(f for f in n if o.get(f)!=n[f] or f=='version.json')
stale=sorted(set(o)-set(n))
open(base+'.changed.txt','w').write(''.join(f+'\n' for f in changed))
open(base+'.stale.txt','w').write(''.join(f+'\n' for f in stale))
with zipfile.ZipFile(outzip,'w',zipfile.ZIP_DEFLATED) as z:
    for f in changed:
        i=zipfile.ZipInfo(f,(1980,1,1,0,0,0)); i.external_attr=0o644<<16; i.compress_type=zipfile.ZIP_DEFLATED
        z.writestr(i,open(os.path.join(stage,f),'rb').read())
print(f"changed={len(changed)} stale={len(stale)} (stale files are listed for manual review only)")
PY
