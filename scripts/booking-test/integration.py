#!/usr/bin/env python3
"""End-to-end tests against `php -S` serving dist/ (run after `npm run build`).
Uses a throw-away private folder; mail() is captured to a file. No network, no real email."""
import json, os, re, subprocess, sys, tempfile, time, urllib.parse, urllib.request, http.cookiejar, shutil, pathlib, socket

ROOT = pathlib.Path(__file__).resolve().parents[2]
DIST = ROOT / 'dist'
results = []
def check(cond, name):
    results.append((bool(cond), name))
    print(('PASS ' if cond else 'FAIL ') + name)

def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p

tmp = pathlib.Path(tempfile.mkdtemp(prefix='atb-test-'))
private = tmp / 'afghantours-private'
private.mkdir()
mail_log = tmp / 'mail.log'
PASSWORD = 'test-only-' + os.urandom(6).hex()
h_admin = subprocess.check_output(['php', '-r', 'echo password_hash($argv[1], PASSWORD_DEFAULT);', PASSWORD]).decode()
h_view = subprocess.check_output(['php', '-r', 'echo password_hash($argv[1], PASSWORD_DEFAULT);', PASSWORD + 'v']).decode()
(private / 'booking-config.php').write_text(f"""<?php return ['admin_users' => ['james' => ['password_hash' => '{h_admin}', 'role' => 'admin'], 'office' => ['password_hash' => '{h_view}', 'role' => 'viewer']], 'login_max_attempts' => 5];""")

port = free_port()
BASE = f'http://127.0.0.1:{port}'
env = dict(os.environ, AFGHANTOURS_PRIVATE_DIR=str(private), BOOKING_TODAY='2026-10-10')
srv = subprocess.Popen(['php', '-d', f'sendmail_path=cat >> {mail_log}', '-S', f'127.0.0.1:{port}', '-t', str(DIST)], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(50):
    try:
        urllib.request.urlopen(BASE + '/booking/departures.php', timeout=1); break
    except Exception:
        time.sleep(0.1)

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None

def opener(follow=True):
    jar = http.cookiejar.CookieJar()
    handlers = [urllib.request.HTTPCookieProcessor(jar)]
    if not follow: handlers.append(NoRedirect())
    return urllib.request.build_opener(*handlers), jar

def req(op, path, data=None, headers=None):
    body = urllib.parse.urlencode(data).encode() if data is not None else None
    r = urllib.request.Request(BASE + path, data=body, headers=headers or {})
    try:
        resp = op.open(r, timeout=10)
        return resp.status, resp.read().decode('utf-8', 'replace'), dict(resp.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8', 'replace'), dict(e.headers)

pub, _ = opener()
try:
    # ---------------- public endpoint ----------------
    code, body, hdr = req(pub, '/booking/departures.php')
    data = json.loads(body)
    check(code == 200 and data['ok'] and data['source'] == 'live', 'public endpoint 200 from private store (first-run import)')
    check((private / 'booking' / 'inventory.json').exists(), 'seed imported into private store')
    ids = [d['id'] for d in data['departures']]
    seed = json.load(open(ROOT / 'data/booking/departures.json'))['departures']
    proposed = {d['id'] for d in seed if d['status'] == 'proposed'}
    past = {d['id'] for d in seed if d['end_date'] < '2026-10-10'}
    check(len(ids) == 8, f'8 published future departures public (got {len(ids)})')
    check(not (set(ids) & proposed), 'no proposed departure is public')
    check(not (set(ids) & past), 'no past departure is public')
    check('DEP-KBLS-20261005' not in ids, 'departure ending today (in progress) not public')
    forbidden = ['internal_notes', 'operational_approval', 'confirmed_count', 'pending_count', 'travelers', 'email', 'whatsapp', 'source', 'date_check', 'max_capacity']
    check(all(k not in d for d in data['departures'] for k in forbidden), 'public payload has no internal/PII fields')
    check(all(d['status'] == 'available_awaiting_minimum' and d['status_text'] == 'Awaiting group confirmation — minimum 3 travelers.' for d in data['departures']), 'all seed departures: Awaiting group confirmation — minimum 3 travelers.')
    code, body, _ = req(pub, '/booking/departures.php?tour=weekend-in-kabul')
    wk = json.loads(body)['departures']
    check(len(wk) == 1 and wk[0]['arrival_option'] == 'sat-mon' and wk[0]['price_label'] == 'From $450 per person', 'Weekend in Kabul feed: Sat–Mon arrival, From $450 per person')
    code, _, _ = req(pub, '/booking/departures.php?tour=../../etc')
    check(code == 400, 'endpoint rejects bad tour param')

    # ---------------- inquiries ----------------
    base_form = {'name': 'Test Traveler', 'email': 'traveler@example.com', 'whatsapp': '+10000000000', 'country': 'Testland', 'flow': 'scheduled', 'entity_type': 'tour', 'product_class': 'scheduled', 'source_url': '/tours/x/'}
    J = {'Accept': 'application/json'}
    f = dict(base_form, entity_name='Winter Circuit', entity_slug='winter-circuit', entity_code='WNTC', departure_id='DEP-WNTC-20261205', travelers='1', booking_type='shared', dry_run='1')
    code, body, _ = req(pub, '/tour-inquiry.php', f, J)
    d = json.loads(body)
    check(code == 200 and d['departure_check'] == 'verified:available_awaiting_minimum' and 'below the 3-traveler minimum' in d['body'], '1 traveler shared request accepted, flagged below minimum')
    f.update(travelers='2'); d = json.loads(req(pub, '/tour-inquiry.php', f, J)[1])
    check('Shared request for 2 traveler(s): below the 3-traveler minimum' in d['body'], '2 travelers → below minimum note')
    f.update(travelers='3'); d = json.loads(req(pub, '/tour-inquiry.php', f, J)[1])
    check('meets the 3-traveler minimum once they are confirmed (still needs operational approval)' in d['body'], '3 travelers → meets minimum, still needs approval')
    check(d['message'] == 'Your request has been received. Our team will confirm availability, arrangements, and next steps.', 'exact spec confirmation message')
    code, body, _ = req(pub, '/tour-inquiry.php', dict(f, departure_id='DEP-ADTF-20260921'), J)
    check(code == 409, 'past departure cannot be requested (409)')
    prop = sorted(proposed)[0]
    code, body, _ = req(pub, '/tour-inquiry.php', dict(f, departure_id=prop), J)
    check(code == 409, 'proposed (unpublished) departure cannot be requested (409)')
    code, body, _ = req(pub, '/tour-inquiry.php', dict(f, departure_id='NOPE-123'), J)
    check(code == 409, 'unknown departure id rejected (409)')
    code, body, _ = req(pub, '/tour-inquiry.php', dict(f, departure_id='bad id<>'), J)
    check(code == 400, 'malformed departure id rejected (400)')
    # Weekend in Kabul solo private (no departure id) — real submit (stored + mailed)
    solo = dict(base_form, entity_name='Weekend in Kabul', entity_slug='weekend-in-kabul', entity_code='WKND', travelers='1', booking_type='private', arrival_option='fri-sun', extension_nights='1', extras='Extra hotel night; Additional sightseeing', accommodation='Upgrade where available', notes='Solo traveler, flights TBC')
    code, body, _ = req(pub, '/tour-inquiry.php', solo, J)
    d = json.loads(body)
    check(code == 200 and d['ok'], 'Weekend in Kabul solo PRIVATE inquiry accepted (real submit)')
    mail = mail_log.read_text() if mail_log.exists() else ''
    check('Shared / private: private' in mail and 'Arrival option: Friday–Sunday' in mail and 'Private request — quoted separately; no group minimum applies.' in mail, 'email body carries private/arrival/group-minimum lines')
    check('Admin reference: INQ-' in mail and 'Name: Test Traveler' in mail and 'WhatsApp: +10000000000' in mail and 'Country: Testland' in mail, 'existing email fields intact + admin reference')
    inq = [json.loads(l) for l in (private / 'booking' / 'inquiries.jsonl').read_text().splitlines()]
    check(len(inq) == 1 and inq[0]['booking_type'] == 'private' and inq[0]['extension_nights'] == '1' and inq[0]['accommodation'] == 'Upgrade where available', 'inquiry stored in private JSONL with Part 7 fields')
    # shared request on a real departure, real submit
    code, body, _ = req(pub, '/tour-inquiry.php', dict(f, travelers='2', dry_run=''), J)
    check(code == 200, 'shared departure request (real submit) ok')
    code, body, _ = req(pub, '/booking/departures.php?tour=winter-circuit')
    w = json.loads(body)['departures']
    check(all(x['status'] == 'available_awaiting_minimum' for x in w), 'inquiries do not change public status (pending/unpaid never count)')
    check('Test Traveler' not in body and 'traveler@example.com' not in body, 'no inquiry PII in public endpoint')
    # legacy fields still work without booking fields
    code, body, _ = req(pub, '/tour-inquiry.php', {'name': 'Legacy', 'email': 'l@example.com', 'tour': 'Kabul & Surroundings', 'tour_slug': 'kabul-surroundings', 'travelers': '2', 'message': 'hi', 'dry_run': '1'}, J)
    check(code == 200 and json.loads(body)['ok'], 'legacy inquiry fields still accepted')

    # ---------------- admin ----------------
    code, body, hdr = req(opener(follow=False)[0], '/manage/?a=departures')
    check(code in (302, 303) and 'a=login' in hdr.get('Location', ''), 'admin requires auth (redirect to login)')
    adm, jar = opener()
    code, body, hdr = req(adm, '/manage/?a=login')
    check(code == 200 and 'noindex' in hdr.get('X-Robots-Tag', '') and 'name="password"' in body, 'login page served, noindex header')
    csrf = re.search(r'name="csrf" value="([^"]+)"', body).group(1)
    code, body, _ = req(adm, '/manage/?a=login', {'username': 'james', 'password': PASSWORD})
    check(code == 403, 'login POST without CSRF rejected')
    code, body, _ = req(adm, '/manage/?a=login', {'csrf': csrf, 'username': 'james', 'password': PASSWORD})
    check(code == 200 and 'Departures' in body and 'Signed in' in body, 'admin login ok')
    csrf = re.search(r'name="csrf" value="([^"]+)"', body).group(1)
    code, body, _ = req(adm, '/manage/?view=proposed')
    check(body.count('DEP-') >= len(proposed), 'admin lists proposed departures')
    # create departure
    code, body, _ = req(adm, '/manage/?a=create', {'csrf': csrf, 'tour_slug': 'kandahar-durrani-empire-tour', 'start_date': '2027-01-09', 'end_date': '', 'departure_type': 'shared', 'min_group_size': '3', 'max_capacity': '', 'status': 'draft', 'price_amount': '1250', 'price_status': 'reference_from_production'})
    check('Departure created (not public)' in body and '2027-01-14' in body, 'create departure; end auto = start + 6 − 1')
    new_id = 'DEP-KTDE-20270109'
    code, body, _ = req(adm, '/booking/departures.php?tour=kandahar-durrani-empire-tour')
    check(new_id not in body, 'new draft not public')
    code, body, _ = req(adm, '/manage/?a=op', {'csrf': csrf, 'id': new_id, 'op': 'publish'})
    check('Set a maximum capacity before publishing' in body, 'publish blocked without max capacity')
    code, body, _ = req(adm, '/manage/?a=update', {'csrf': csrf, 'id': new_id, 'tour_slug': 'kandahar-durrani-empire-tour', 'start_date': '2027-01-09', 'end_date': '2027-01-16', 'departure_type': 'shared', 'min_group_size': '3', 'max_capacity': '6', 'status': 'draft', 'price_amount': '1250', 'price_status': 'reference_from_production'})
    check('is 8 days inclusive' in body, 'edit rejects end date that does not match duration')
    code, body, _ = req(adm, '/manage/?a=update', {'csrf': csrf, 'id': new_id, 'tour_slug': 'kandahar-durrani-empire-tour', 'start_date': '2027-01-09', 'end_date': '', 'departure_type': 'shared', 'min_group_size': '2', 'max_capacity': '6', 'status': 'draft', 'price_amount': '1250', 'price_status': 'reference_from_production'})
    check('minimum of 3 travelers' in body, 'shared minimum below 3 rejected')
    code, body, _ = req(adm, '/manage/?a=update', {'csrf': csrf, 'id': new_id, 'tour_slug': 'kandahar-durrani-empire-tour', 'start_date': '2027-01-09', 'end_date': '', 'departure_type': 'shared', 'min_group_size': '3', 'max_capacity': '4', 'status': 'draft', 'price_amount': '1250', 'price_status': 'reference_from_production', 'internal_notes': 'INTERNAL-SECRET-NOTE'})
    check('Saved.' in body, 'set capacity 4')
    req(adm, '/manage/?a=op', {'csrf': csrf, 'id': new_id, 'op': 'publish'})
    code, body, _ = req(pub, '/booking/departures.php?tour=kandahar-durrani-empire-tour')
    nd = [x for x in json.loads(body)['departures'] if x['id'] == new_id]
    check(nd and nd[0]['status'] == 'available_awaiting_minimum', 'published → public as Available — Awaiting Minimum')
    check('INTERNAL-SECRET-NOTE' not in body, 'internal notes never public')
    def add_trav(name, status, size='1'):
        return req(adm, '/manage/?a=traveler', {'csrf': csrf, 'op': 'add', 'departure_id': new_id, 'name': name, 'party_size': size, 'email': name.lower() + '@example.com', 'status': status, 'payment_status': 'not_recorded'})
    def pub_status():
        b = req(pub, '/booking/departures.php?tour=kandahar-durrani-empire-tour')[1]
        return [x for x in json.loads(b)['departures'] if x['id'] == new_id][0]['status'], b
    add_trav('Alice', 'confirmed'); add_trav('Bob', 'confirmed'); add_trav('Pending Pat', 'pending', '3')
    s, b = pub_status(); check(s == 'available_awaiting_minimum', '2 confirmed + 3 pending → still awaiting minimum')
    add_trav('Carol', 'confirmed'); s, b = pub_status()
    check(s == 'available_awaiting_minimum', '3 confirmed but not approved → still awaiting (no auto-confirm)')
    req(adm, '/manage/?a=op', {'csrf': csrf, 'id': new_id, 'op': 'approve'}); s, b = pub_status()
    check(s == 'limited', '3 confirmed + approved, capacity 4 → Limited Places (1 left)')
    add_trav('Dan', 'confirmed'); s, b = pub_status()
    check(s == 'sold_out', 'capacity reached → Sold Out')
    check(all(n not in b for n in ['Alice', 'Bob', 'Carol', 'Dan', 'alice@example.com']), 'traveler names/emails never in public endpoint')
    code, body, _ = req(pub, '/tour-inquiry.php', dict(f, departure_id=new_id, entity_slug='kandahar-durrani-empire-tour'), J)
    check(code == 409, 'sold-out departure not requestable')
    req(adm, '/manage/?a=op', {'csrf': csrf, 'id': new_id, 'op': 'cancel'}); s, b = pub_status()
    check(s == 'cancelled', 'cancel → Cancelled')
    code, body, _ = req(adm, '/manage/?a=op', {'csrf': csrf, 'id': new_id, 'op': 'complete'})
    check('only on or after its end date' in body, 'cannot mark a future departure completed')
    # winter date fix action available + works
    code, body, _ = req(adm, '/manage/?a=edit&id=DEP-WNTC-20261205')
    check('Fix end date to 2026-12-16' in body, 'Winter Circuit date mismatch flagged with one-click fix (not auto-applied)')
    # category D cannot get departures
    code, body, _ = req(adm, '/manage/?a=create', {'csrf': csrf, 'tour_slug': 'noshaq-expedition-support', 'start_date': '2027-07-01', 'departure_type': 'shared', 'min_group_size': '3', 'status': 'draft'})
    check('Choose a tour' in body or 'categories A, B or C' in body, 'no departures for category D services')
    # blackout + settings + inquiries pages
    code, body, _ = req(adm, '/manage/?a=blackouts'); check('Eid al-Fitr 2027' in body and 'estimate' in body, 'blackouts page lists unconfirmed Eid estimates')
    code, body, _ = req(adm, '/manage/?a=inquiries'); check('Test Traveler' in body, 'stored inquiries listed for admin review')
    # viewer cannot write
    vw, _ = opener(); _, b, _ = req(vw, '/manage/?a=login'); vc = re.search(r'name="csrf" value="([^"]+)"', b).group(1)
    _, b, _ = req(vw, '/manage/?a=login', {'csrf': vc, 'username': 'office', 'password': PASSWORD + 'v'})
    vc = re.search(r'name="csrf" value="([^"]+)"', b).group(1)
    code, b, _ = req(vw, '/manage/?a=op', {'csrf': vc, 'id': new_id, 'op': 'reopen'})
    check(code == 403 and 'Read-only' in b, 'viewer role cannot change inventory')
    code, body, _ = req(adm, '/manage/?a=op', {'id': new_id, 'op': 'reopen'})
    check(code == 403, 'admin POST without CSRF rejected')
    # logout
    req(adm, '/manage/?a=logout', {'csrf': csrf})
    code, body, hdr = req(opener(follow=False)[0], '/manage/')
    check(code in (302, 303), 'after logout admin requires auth again')
    # rate limit (last: it also blocks this IP): 5 bad attempts then blocked even with the right password
    att, _ = opener()
    _, b, _ = req(att, '/manage/?a=login'); c2 = re.search(r'name="csrf" value="([^"]+)"', b).group(1)
    for i in range(5):
        req(att, '/manage/?a=login', {'csrf': c2, 'username': 'office', 'password': 'wrong'})
    _, b, _ = req(att, '/manage/?a=login', {'csrf': c2, 'username': 'office', 'password': PASSWORD + 'v'})
    check('Too many attempts' in b, 'login rate-limited after 5 failures')
    # files not web-served by php -S? (Apache .htaccess denies in production) — static check
    for ht in ['booking/.htaccess', 'booking/lib/.htaccess', 'booking/seed/.htaccess', 'manage/.htaccess']:
        check((DIST / ht).exists() and 'deny' in (DIST / ht).read_text().lower(), f'dist/{ht} denies access')
    check(not any(p.name.endswith(('.jsonl',)) or p.name in ('travelers.json', 'inventory.json', 'booking-config.php') for p in DIST.rglob('*')), 'no private store files in dist/')
    # ---------------- private folder missing → email-only fallback ----------------
    port2 = free_port()
    mail2 = tmp / 'mail2.log'
    env2 = dict(env, AFGHANTOURS_PRIVATE_DIR='/nonexistent-atb-private/x')
    srv2 = subprocess.Popen(['php', '-d', f'sendmail_path=cat >> {mail2}', '-S', f'127.0.0.1:{port2}', '-t', str(DIST)], env=env2, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        time.sleep(0.6)
        r = urllib.request.urlopen(f'http://127.0.0.1:{port2}/booking/departures.php', timeout=5)
        d2 = json.loads(r.read())
        check(d2['ok'] and d2['source'] == 'seed' and len(d2['departures']) == 8, 'no private folder: public feed falls back to read-only seed')
        r = urllib.request.urlopen(urllib.request.Request(f'http://127.0.0.1:{port2}/tour-inquiry.php', data=urllib.parse.urlencode(solo).encode(), headers=J), timeout=5)
        d3 = json.loads(r.read())
        check(d3['ok'] and mail2.exists() and 'Admin reference' not in mail2.read_text(), 'no private folder: inquiry still emailed (email-only)')
        try:
            urllib.request.urlopen(f'http://127.0.0.1:{port2}/manage/', timeout=5); code3 = 200
        except urllib.error.HTTPError as e:
            code3 = e.code
        check(code3 == 503, 'no private folder/config: admin shows not-configured (503), nothing editable')
    finally:
        srv2.terminate()
finally:
    srv.terminate()
    shutil.rmtree(tmp, ignore_errors=True)

failed = [n for ok, n in results if not ok]
print(f'\nINTEGRATION: {len(results) - len(failed)} passed, {len(failed)} failed')
sys.exit(1 if failed else 0)
