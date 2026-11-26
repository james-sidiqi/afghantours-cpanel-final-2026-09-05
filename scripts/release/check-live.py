#!/usr/bin/env python3
"""Read-only marker/commit comparison. Does not prove file, backend, or mail health."""
import argparse
import json
import re
import subprocess
import urllib.request

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url', default='https://afghantours.com/version.json')
p.add_argument('--main', default='origin/main', help='Fetch this ref before running')
a = p.parse_args()


def git(*args):
    return subprocess.check_output(['git', *args], text=True, stderr=subprocess.DEVNULL).strip()


try:
    req = urllib.request.Request(a.url, headers={'Cache-Control': 'no-cache', 'User-Agent': 'AfghanTours-release-check'})
    with urllib.request.urlopen(req, timeout=20) as response:
        version = json.load(response)
    live = version.get('commit_sha', '')
    if not re.fullmatch('[0-9a-f]{40}', live):
        raise ValueError('Missing/invalid full commit SHA')
    main = git('rev-parse', a.main)
    print('Live marker:', version.get('release_id'), live)
    print('Fetched main:', main)
    if live == main:
        print('Marker matches main. Verify file checksums and hosting/mail separately.')
    elif subprocess.run(['git', 'merge-base', '--is-ancestor', live, main], capture_output=True).returncode == 0:
        print(git('rev-list', '--count', f'{live}..{main}'), 'commits ahead of the live marker (may include docs-only commits).')
    else:
        raise ValueError('Live SHA unknown/diverged; fetch history and investigate')
except Exception as e:
    print('UNKNOWN —', e)
    raise SystemExit(1)
