#!/usr/bin/env python3
"""M1 gate checks: staff auth, intake isolation, unchanged routes, private-rate leak scan.

The marker scan was adapted from feature/trip-planner-m1-contracts-20261107
scripts/trip-planner/check-m1.py. It scans the public build. It does not replace
a live cPanel authentication test. Run after npm run build.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from http.cookiejar import CookieJar
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"
TEXT_EXT = {".html", ".htm", ".js", ".mjs", ".css", ".json", ".csv", ".xml", ".txt", ".php", ".svg"}
MARKERS = (
    b"private_archive_do_not_web_upload",
    b"phase1_afn_cost_register",
    b"user_supplied_afn_supplier_register",
    b"original_master_rate_register",
    b"historical_hotel_ranges_14",
    b"attraction_fee_references_65",
    b"repo_room_cost_sell_comparison",
    b"operator_costs_and_policy.json",
    b"source_workbooks/",
    b"low_afn,medium_afn,high_afn",
)
MARKER_PATTERNS = (
    re.compile(rb"\bPDF-\d{3}\b", re.I),
    re.compile(rb"""["']?(?:low_afn|medium_afn|high_afn)["']?\s*:""", re.I),
)
FAILURES: list[str] = []


def fail(message: str) -> None:
    FAILURES.append(message)
    print("FAIL:", message, file=sys.stderr)


def php_hash(password: str) -> str:
    return subprocess.check_output(
        ["php", "-r", "echo password_hash($argv[1], PASSWORD_DEFAULT);", password],
        text=True,
    ).strip()


def fetch(opener, url: str, data: bytes | None = None, headers: dict | None = None):
    request = urllib.request.Request(url, data=data, headers=headers or {})
    try:
        with opener.open(request, timeout=15) as response:
            return response.status, response.read().decode("utf-8", "replace"), response.geturl()
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", "replace"), url


def wait_for_port(port: int) -> None:
    for _ in range(50):
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.2):
                return
        except OSError:
            time.sleep(0.05)
    raise RuntimeError(f"PHP server did not listen on {port}")


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def scan_tree(base: Path) -> None:
    if not base.exists():
        fail(f"missing tree: {base}")
        return
    for path in base.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(ROOT).as_posix().lower().encode()
        if any(marker in rel for marker in MARKERS):
            fail(f"private archive name in public path: {path.relative_to(ROOT)}")
        if path.suffix.lower() not in TEXT_EXT:
            continue
        payload = path.read_bytes().lower()
        if any(marker in payload for marker in MARKERS) or any(pattern.search(payload) for pattern in MARKER_PATTERNS):
            fail(f"private rate marker in public build: {path.relative_to(ROOT)}")


def hash_scan() -> None:
    manifest = json.loads((ROOT / "contracts/trip-planner/source-inventory.json").read_text())
    forbidden = {item["sha256"] for item in manifest["files"]}
    skip = {".git", "node_modules", ".astro"}
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [name for name in dirnames if name not in skip]
        for name in filenames:
            path = Path(dirpath) / name
            if not path.is_file() or path.is_symlink():
                continue
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            if digest in forbidden:
                fail(f"private archive bytes committed: {path.relative_to(ROOT)}")


def optional_archive_check() -> None:
    archive = os.environ.get("AFGHANTOURS_PRIVATE_ARCHIVE", "")
    if not archive:
        print("Archive hash recheck skipped (AFGHANTOURS_PRIVATE_ARCHIVE unset).")
        return
    root = Path(archive)
    manifest = json.loads((ROOT / "contracts/trip-planner/source-inventory.json").read_text())
    for item in manifest["files"]:
        path = root / item["path"]
        if not path.is_file():
            fail(f"archive file missing: {item['path']}")
            continue
        data = path.read_bytes()
        if hashlib.sha256(data).hexdigest() != item["sha256"]:
            fail(f"archive hash mismatch: {item['path']}")
        if item.get("rows") is not None and path.suffix.lower() == ".csv":
            text = data.decode("utf-8-sig")
            rows = max(0, len(text.splitlines()) - 1)
            if rows != item["rows"]:
                fail(f"archive row count mismatch: {item['path']} expected {item['rows']} counted {rows}")
    counts = manifest["counts"]
    if counts.get("user_supplied_rows_with_no_band") != 28 or counts.get("phase1_rows_with_no_band") != 33:
        fail("unpriced-row counts drifted from the reviewed archive")


def route_check() -> None:
    sitemap = ROOT / "dist/sitemap.xml"
    expected = (ROOT / "scripts/trip-planner/expected-sitemap-urls.txt").read_text().split()
    if not sitemap.is_file():
        fail("dist/sitemap.xml missing; run npm run build")
        return
    found = re.findall(r"<loc>(.*?)</loc>", sitemap.read_text())
    if found != expected:
        missing = sorted(set(expected) - set(found))
        added = sorted(set(found) - set(expected))
        fail(f"sitemap routes changed: missing {missing[:5]} added {added[:5]} counts {len(expected)} -> {len(found)}")
    if len(found) != 298:
        fail(f"sitemap count is {len(found)}, expected 298")
    for blocked in ("/private-calculator/", "/trip-request/", "/trip-planner/"):
        if blocked in sitemap.read_text():
            fail(f"{blocked} appeared in the sitemap")
    page = ROOT / "dist/trip-planner/index.html"
    if not page.is_file():
        fail("dist/trip-planner/index.html missing; run npm run build")
        return
    html = page.read_text(encoding="utf-8", errors="replace")
    form = re.search(r'<form class="at-card trip-request__form".*?</form>', html, re.S)
    if not form:
        fail("public trip form missing")
        return
    body = form.group(0)
    if 'action="/trip-request/index.php"' not in body:
        fail("public form does not post to the isolated adapter")
    for banned in ("/tour-inquiry.php", "/booking/", "/manage/"):
        if banned in body:
            fail(f"public form points at {banned}")
    if "Price to be confirmed" not in html or "still to be confirmed" not in html:
        fail("public page does not keep the received/unconfirmed wording")
    if "noindex" not in html[:2500].lower():
        fail("public prototype is not noindex near the top of the document")
    if re.search(r"\$\d", html):
        fail("public prototype contains a dollar amount")
    for marker in MARKERS:
        if marker.decode() in html.lower():
            fail("public prototype contains a private archive marker")


def packager_and_htaccess() -> None:
    import importlib.util
    spec = importlib.util.spec_from_file_location("release_package", ROOT / "scripts/release/package.py")
    package = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(package)
    for path in (
        "private-calculator/index.php",
        "trip-request/index.php",
        "trip-planner/index.html",
        "trip-planner-lib/bootstrap.php",
    ):
        if package.allowed(path):
            fail(f"release packager would ship {path}")
    root_ht = (PUBLIC / ".htaccess").read_text()
    if "private-calculator" in root_ht or "trip-request" in root_ht or "trip-planner" in root_ht:
        fail("root .htaccess was given trip-planner rules")
    for rel in ("private-calculator/.htaccess", "trip-request/.htaccess", "trip-planner-lib/.htaccess"):
        text = (PUBLIC / rel).read_text()
        if "Require all granted" in text:
            fail(f"{rel} grants access and can bypass staging Directory Privacy")
    staff = json.loads((ROOT / "contracts/trip-planner/staff-proposal.v1.schema.json").read_text())
    blob = json.dumps(staff).lower()
    if "low_afn" in blob or "operator_costs_and_policy" in blob:
        fail("staff contract contains private register contents")
    if staff.get("additionalProperties") is not False:
        fail("staff contract allows unknown fields")


def boot_location_checks() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        web = tmp_path / "web"
        web.mkdir()
        outside = tmp_path / "outside"
        outside.mkdir()
        inside_cfg = web / "config.php"
        inside_cfg.write_text("<?php return ['staff_username'=>'operator','staff_password_hash'=>'$2y$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012','ip_hash_key'=>'test-only-ip-hash-key','data_root'=>'/tmp'];\n")
        outside_cfg = outside / "config.php"
        outside_cfg.write_text(
            "<?php return ['staff_username'=>'operator','staff_password_hash'=>'$2y$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',"
            f"'ip_hash_key'=>'test-only-ip-hash-key','data_root'=>'{web.as_posix()}/data'];\n"
        )
        runner = tmp_path / "bootcheck.php"
        runner.write_text(
            "<?php\n$_SERVER['DOCUMENT_ROOT']=$argv[1]; putenv('AFGHANTOURS_TRIP_PLANNER_CONFIG='.$argv[2]);"
            " require $argv[3]; $r=atp_boot(); echo json_encode(['ok'=>$r['ok'],'error'=>$r['error']??null]);\n"
        )
        bootstrap = PUBLIC / "trip-planner-lib/bootstrap.php"
        for label, docroot, config in (
            ("config inside docroot", web, inside_cfg),
            ("data root inside docroot", web, outside_cfg),
        ):
            result = subprocess.run(
                ["php", str(runner), str(docroot), str(config), str(bootstrap)],
                text=True, capture_output=True, check=False,
            )
            try:
                payload = json.loads(result.stdout)
            except json.JSONDecodeError:
                fail(f"{label} boot check did not return JSON: {result.stdout} {result.stderr}")
                continue
            if payload.get("ok") or payload.get("error") != "location":
                fail(f"{label} was accepted: {payload}")


def http_checks() -> None:
    password = "test-only-not-a-real-staff-password"
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        data = tmp_path / "data"
        archive = data / "archive" / "cost_registers"
        archive.mkdir(parents=True)
        fixture = archive / "fixture.csv"
        fixture.write_text("col_a,col_b\nSENTINEL_SUPPLIER_ALPHA,987654\n", encoding="utf-8")
        raw = fixture.read_bytes()
        manifest = {
            "schema_version": 1,
            "archive_dirname": "archive",
            "counts": {"fixture_rows": 1},
            "files": [{
                "path": "cost_registers/fixture.csv",
                "sha256": hashlib.sha256(raw).hexdigest(),
                "bytes": len(raw),
                "rows": 1,
                "role": "fixture",
            }],
        }
        (data / "source-inventory.json").write_text(json.dumps(manifest))
        config = tmp_path / "config.php"
        config.write_text(
            "<?php return ["
            "'staff_username' => 'operator',"
            f"'staff_password_hash' => '{php_hash(password)}',"
            "'ip_hash_key' => 'test-only-ip-hash-key-not-production',"
            f"'data_root' => '{data.as_posix()}',"
            "];\n"
        )
        port = free_port()
        env = os.environ.copy()
        env["AFGHANTOURS_TRIP_PLANNER_CONFIG"] = str(config)
        env["ATP_LOGIN_DELAY"] = "0"
        server = subprocess.Popen(
            ["php", "-S", f"127.0.0.1:{port}", "-t", str(PUBLIC)],
            env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        base = f"http://127.0.0.1:{port}"
        try:
            wait_for_port(port)
            opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))
            status, body, _ = fetch(opener, base + "/private-calculator/")
            if status != 200 or "Sign in" not in body:
                fail(f"logged-out calculator did not show the login form ({status})")
            if "SENTINEL_SUPPLIER_ALPHA" in body or "987654" in body or "Expected counts" in body:
                fail("logged-out calculator exposed private data")
            status, lib_body, _ = fetch(opener, base + "/trip-planner-lib/bootstrap.php")
            if status != 404 or "ATP_DUMMY" in lib_body or "function atp_" in lib_body:
                fail(f"library file was web-executable ({status})")
            token = re.search(r'name="csrf" value="([a-f0-9]+)"', body)
            if not token:
                fail("login form has no CSRF token")
                return
            status, denied, _ = fetch(opener, base + "/private-calculator/", urllib.parse.urlencode({
                "action": "login", "csrf": "not-the-token", "username": "operator", "password": password,
            }).encode())
            if status != 403 or "Sign in" not in denied:
                fail(f"login without CSRF was accepted ({status})")
            token = re.search(r'name="csrf" value="([a-f0-9]+)"', denied) or token
            status, body, _ = fetch(opener, base + "/private-calculator/", urllib.parse.urlencode({
                "action": "login", "csrf": token.group(1), "username": "operator", "password": "wrong-password",
            }).encode())
            if status != 403 or "not accepted" not in body.lower():
                fail(f"wrong password was not rejected ({status})")
            status, body, final = fetch(opener, base + "/private-calculator/", urllib.parse.urlencode({
                "action": "login", "csrf": token.group(1), "username": "operator", "password": password,
            }).encode())
            if status != 200 or "Archive files" not in body or "match" not in body:
                fail(f"correct login did not reach the inventory ({status}, {final})")
            if "SENTINEL_SUPPLIER_ALPHA" in body or "987654" in body:
                fail("signed-in inventory echoed a private cell")
            logout_token = re.search(r'name="csrf" value="([a-f0-9]+)"', body)
            example = json.loads((ROOT / "contracts/trip-planner/public-submission.schema.json").read_text())["example"]
            poisoned = dict(example)
            poisoned["low_afn"] = "987654"
            status, body, _ = fetch(opener, base + "/trip-request/index.php", json.dumps(poisoned).encode(), {
                "Content-Type": "application/json", "Accept": "application/json",
            })
            if status != 400 or "987654" in body or "low_afn" in body:
                fail(f"intake accepted or echoed a private rate field ({status})")
            status, body, _ = fetch(opener, base + "/trip-request/index.php", json.dumps(example).encode(), {
                "Content-Type": "application/json", "Accept": "application/json",
            })
            try:
                payload = json.loads(body)
            except json.JSONDecodeError:
                payload = {}
            if status != 200 or payload.get("status") != "received" or payload.get("ok") is not True:
                fail(f"valid intake was not received ({status} {body[:240]})")
            message = payload.get("message", "")
            if "was received" not in message or "still to be confirmed" not in message or "booked" in message.lower():
                fail(f"intake confirmation wording is wrong: {message}")
            reference = payload.get("reference", "")
            stored = list(data.rglob(reference + ".json"))
            if len(stored) != 1:
                fail("intake did not store exactly one lead outside the docroot")
            else:
                record = stored[0].read_text()
                if "low_afn" in record or "987654" in record:
                    fail("stored lead contains a private rate")
                if str(PUBLIC) in str(stored[0]):
                    fail("lead was stored inside the public tree")
            before = list(data.rglob("*.json"))
            spam = dict(example)
            spam["company_website"] = "http://spam.example"
            status, body, _ = fetch(opener, base + "/trip-request/index.php", json.dumps(spam).encode(), {
                "Content-Type": "application/json", "Accept": "application/json",
            })
            if status != 200 or len(list(data.rglob("*.json"))) != len(before):
                fail("honeypot submission was stored")
            status, body, _ = fetch(opener, base + "/private-calculator/?lead=" + urllib.parse.quote(reference))
            if reference not in body or "Sample Guest" not in body:
                fail("staff inbox did not keep the original public selection")
            if "SENTINEL_SUPPLIER_ALPHA" in body:
                fail("staff lead view included the private fixture")
            if logout_token:
                status, body, _ = fetch(opener, base + "/private-calculator/", urllib.parse.urlencode({
                    "action": "logout", "csrf": logout_token.group(1),
                }).encode())
                if "Sign in" not in body or "Sample Guest" in body:
                    fail("logout did not return to the login screen")
            locked = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))
            status, body, _ = fetch(locked, base + "/private-calculator/")
            token = re.search(r'name="csrf" value="([a-f0-9]+)"', body)
            for _ in range(8):
                status, body, _ = fetch(locked, base + "/private-calculator/", urllib.parse.urlencode({
                    "action": "login", "csrf": token.group(1), "username": "operator", "password": "wrong-password",
                }).encode())
            status, body, _ = fetch(locked, base + "/private-calculator/", urllib.parse.urlencode({
                "action": "login", "csrf": token.group(1), "username": "operator", "password": password,
            }).encode())
            if status != 429:
                fail(f"login throttling did not trip ({status})")
        finally:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()


def main() -> int:
    packager_and_htaccess()
    boot_location_checks()
    http_checks()
    scan_tree(PUBLIC)
    if (ROOT / "dist").exists():
        scan_tree(ROOT / "dist")
    else:
        fail("dist/ missing; run npm run build")
    hash_scan()
    optional_archive_check()
    route_check()
    if FAILURES:
        print(f"M1 FAIL ({len(FAILURES)})")
        return 1
    print("M1 PASS | sitemap 298 | staff auth, CSRF, throttle, intake, and public leak scan")
    print("Marker scan does not replace a live staging password-gate test.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
