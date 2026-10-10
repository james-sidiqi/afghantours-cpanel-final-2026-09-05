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
    check(len(ids) == 7, f'7 published future departures public — 8 minus the Eid-conflict one awaiting review (got {len(ids)})')
    check('DEP-WKND-20270306' not in ids, 'published Weekend 6–8 Mar 2027 overlaps the Eid al-Fitr block → hidden pending admin review (not deleted)')
    inv0 = json.load(open(private / 'booking' / 'inventory.json'))
    check(any(d['id'] == 'DEP-WKND-20270306' and d['published'] is True for d in inv0['departures']), 'Eid-conflict departure still stored as published (not moved/deleted)')
    eb0 = data.get('eid_blocks') or []
    check(len(eb0) == 2 and eb0[0]['start'] == '2027-03-08' and eb0[0]['end'] == '2027-03-12' and eb0[0]['label'].endswith('(expected)') and eb0[1]['start'] == '2027-05-15', 'feed carries Eid blocks (day before … +3), estimated shown as "expected"')
    check(data.get('eid_notice', '').startswith('Eid operating period — standard scheduled departures are not available on these dates.'), 'feed carries exact Eid notice')
    ram = sorted(d['id'] for d in data['departures'] if d.get('advisories'))
    check(ram == ['DEP-BSKI-20270209', 'DEP-BUZE-20270223', 'DEP-WNTC-20270216'], f'Ramadan advisory on exactly the published departures overlapping Ramadan (got {ram})')
    check(all(d['selectable'] and d['status'] == 'open' for d in data['departures'] if d.get('advisories')), 'Ramadan departures stay open and selectable (advisory only)')
    check(not (set(ids) & proposed), 'no proposed departure is public')
    check(not (set(ids) & past), 'no past departure is public')
    check('DEP-KBLS-20261005' not in ids, 'departure ending today (in progress) not public')
    forbidden = ['internal_notes', 'operational_approval', 'confirmed_count', 'pending_count', 'travelers', 'email', 'whatsapp', 'source', 'date_check', 'max_capacity']
    check(all(k not in d for d in data['departures'] for k in forbidden), 'public payload has no internal/PII fields')
    longs = [d for d in data['departures'] if d['duration_days'] >= 5]
    shorts = [d for d in data['departures'] if d['duration_days'] <= 4]
    lm = {d['id']: d for d in longs}
    far = [d for d in longs if d['id'] not in ('DEP-ADTF-20261012', 'DEP-KTDE-20261026')]
    check(len(longs) == 7 and all(d['status'] == 'open' and d['status_text'] == 'Open — minimum 6 travelers to operate' and d['selectable'] and d['min_group_size'] == 6 for d in far), '5+ day legacy departures >45 days out: Open, normal request flow, neutral wording (count unknown ≠ "awaiting")')
    a1, k1 = lm.get('DEP-ADTF-20261012'), lm.get('DEP-KTDE-20261026')
    check(a1 and a1['manual_contact'] and a1['last_minute'] and a1['booking_window_closed'] and not a1['selectable'] and a1['cta'] == 'Contact us for last-minute availability' and a1['status_text'] == 'Availability on request', 'Discovery Fall 12–20 Oct (2 days, count unknown): visible, last-minute contact CTA')
    check(k1 and k1['manual_contact'] and not k1['last_minute'] and not k1['selectable'] and k1['cta'] == 'Contact us for availability', 'Kandahar 26–31 Oct (16 days, count unknown): visible, "Contact us for availability"')
    low = body.lower()
    check(not any(w in low for w in ('count unknown', 'migrat', '0/0', '0 confirmed', '0 of 6', 'awaiting minimum 6')), 'no unknown/migration/0-count/"awaiting 6" wording in the public feed')
    check(len(shorts) == 0, 'the only short published departure (Weekend 6–8 Mar) is held back by the Eid rule')
    check(all(d['status'] in ('open', 'confirmed', 'limited', 'sold_out', 'closed') for d in data['departures']), 'public feed uses only the 5-status vocabulary')
    check('Available' not in body, 'no generic "Available" in public feed')
    code, body, _ = req(pub, '/booking/departures.php?tour=weekend-in-kabul')
    wk = json.loads(body)['departures']
    check(len(wk) == 0, 'Weekend in Kabul feed empty until the Eid conflict is reviewed')
    code, _, _ = req(pub, '/booking/departures.php?tour=../../etc')
    check(code == 400, 'endpoint rejects bad tour param')

    # ---------------- inquiries ----------------
    base_form = {'name': 'Test Traveler', 'email': 'traveler@example.com', 'whatsapp': '+10000000000', 'country': 'Testland', 'flow': 'scheduled', 'entity_type': 'tour', 'product_class': 'scheduled', 'source_url': '/tours/x/'}
    J = {'Accept': 'application/json'}
    f = dict(base_form, entity_name='Winter Circuit', entity_slug='winter-circuit', entity_code='WNTC', departure_id='DEP-WNTC-20261205', travelers='1', booking_type='shared', dry_run='1')
    code, body, _ = req(pub, '/tour-inquiry.php', f, J)
    d = json.loads(body)
    check(code == 200 and d['departure_check'] == 'verified:open' and 'below the 6-traveler minimum to operate' in d['body'], 'long tour: 1 traveler shared request accepted, flagged below 6')
    for n in ('2', '3'):
        f.update(travelers=n); d = json.loads(req(pub, '/tour-inquiry.php', f, J)[1])
        check(f'Shared request for {n} traveler(s), below the 6-traveler minimum' in d['body'], f'long tour: {n} travelers → below 6 note')
    f.update(travelers='6'); d = json.loads(req(pub, '/tour-inquiry.php', f, J)[1])
    check('meets the 6-traveler minimum once they are confirmed (still needs operational approval)' in d['body'], 'long tour: 6 travelers → meets minimum, still needs approval')
    wkf = dict(base_form, entity_name='Weekend in Kabul', entity_slug='weekend-in-kabul', entity_code='WKND', departure_id='DEP-WKND-20270306', booking_type='shared', dry_run='1')
    d = json.loads(req(pub, '/tour-inquiry.php', dict(wkf, travelers='1'), J)[1])
    check('below the 2-traveler minimum' in d['body'], 'short tour: 1 traveler shared → below 2')
    check(d['ok'] and d['departure_check'] == 'eid_review_required' and d['manual_review'] is True and 'MANUAL REVIEW REQUIRED' in d['body'], 'Eid: inquiry on a departure awaiting Eid review is still accepted, routed to manual review')
    d = json.loads(req(pub, '/tour-inquiry.php', dict(base_form, flow='private-fixed', entity_name='Panjshir', entity_slug='panjshir-valley-emeralds-history', travelers='2', booking_type='private', preferred_dates='2027-05-16 to 2027-05-18', dry_run='1'), J)[1])
    check(d['ok'] and d['manual_review'] is True and 'Eid al-Adha 2027' in d['body'] and 'Do not confirm or promise' in d['body'], 'Eid: private special request in the Eid al-Adha block → manual review, never auto-confirmed')
    d = json.loads(req(pub, '/tour-inquiry.php', dict(base_form, flow='custom', entity_type='custom', entity_name='Custom journey', preferred_dates='2027-03-09', travelers='4', dry_run='1'), J)[1])
    check(d['ok'] and d['manual_review'] is True, 'Eid: custom-journey request during Eid al-Fitr → manual review')
    d = json.loads(req(pub, '/tour-inquiry.php', dict(base_form, flow='private-fixed', entity_name='Panjshir', entity_slug='panjshir-valley-emeralds-history', travelers='2', booking_type='private', preferred_dates='2027-05-20 to 2027-05-22', dry_run='1'), J)[1])
    check(d['ok'] and d['manual_review'] is False, 'Eid: request starting the day after the block → no manual review')
    d = json.loads(req(pub, '/tour-inquiry.php', dict(base_form, entity_name='Bamyan Skiing', entity_slug='bamyan-skiing-tour', departure_id='DEP-BSKI-20270209', travelers='2', booking_type='shared', dry_run='1'), J)[1])
    check(d['ok'] and d['departure_check'] == 'verified:open' and d['manual_review'] is False, 'Ramadan departure: booking request accepted normally (advisory only)')
    for n in ('2', '3', '6'):
        d = json.loads(req(pub, '/tour-inquiry.php', dict(wkf, travelers=n), J)[1])
        check('meets the 2-traveler minimum' in d['body'], f'short tour: {n} travelers shared → meets 2')
    d = json.loads(req(pub, '/tour-inquiry.php', dict(wkf, departure_id='', travelers='1', booking_type='private'), J)[1])
    check('no group minimum applies' in d['body'], 'short tour: 1 traveler private → no minimum')
    d = json.loads(req(pub, '/tour-inquiry.php', dict(base_form, entity_name='Panjshir', entity_slug='panjshir-valley-emeralds-history', travelers='1', booking_type='private', dry_run='1'), J)[1])
    check(d['ok'] and 'no group minimum applies' in d['body'], 'Panjshir: solo private request accepted')
    d = json.loads(req(pub, '/tour-inquiry.php', dict(base_form, entity_name='Kandahar', entity_slug='kandahar-durrani-empire-tour', travelers='3', booking_type='shared', dry_run='1'), J)[1])
    check('below the 6-traveler minimum' in d['body'], 'no departure chosen: tour rule (6) still applied for a 6-day tour')
    f.update(travelers='3')
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
    check(len(inq) >= 1 and inq[0]['booking_type'] == 'private' and inq[0]['extension_nights'] == '1' and inq[0]['accommodation'] == 'Upgrade where available', 'inquiry stored in private JSONL with Part 7 fields')
    code, body, _ = req(pub, '/tour-inquiry.php', dict(base_form, flow='private-fixed', name='Eid Requester', entity_name='Panjshir', entity_slug='panjshir-valley-emeralds-history', travelers='2', booking_type='private', preferred_dates='2027-03-10'), J)
    inq = [json.loads(l) for l in (private / 'booking' / 'inquiries.jsonl').read_text().splitlines()]
    eidq = [x for x in inq if x['name'] == 'Eid Requester']
    check(code == 200 and eidq and eidq[0]['manual_review']['reason'] == 'eid' and eidq[0]['manual_review']['auto_confirm'] is False and 'itinerary_feasibility' in eidq[0]['manual_review']['checklist'], 'Eid special request stored with manual-review flag + checklist')
    # shared request on a real departure, real submit
    code, body, _ = req(pub, '/tour-inquiry.php', dict(f, travelers='2', dry_run=''), J)
    check(code == 200, 'shared departure request (real submit) ok')
    code, body, _ = req(pub, '/booking/departures.php?tour=winter-circuit')
    w = json.loads(body)['departures']
    check(all(x['status'] == 'open' for x in w), 'inquiries do not change public status (pending/unpaid never count)')
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
    code, body, _ = req(adm, '/manage/?a=create', {'csrf': csrf, 'tour_slug': 'kandahar-durrani-empire-tour', 'start_date': '2027-01-09', 'end_date': '', 'departure_type': 'shared', 'min_group_size': '', 'max_capacity': '', 'status': 'draft', 'price_amount': '1250', 'price_status': 'reference_from_production'})
    check('Departure created (not public)' in body and '2027-01-14' in body, 'create departure; end auto = start + 6 − 1')
    check('name="min_group_size" id="min_group_size" value="6"' in body and 'name="max_capacity" id="max_capacity" value="18"' in body, 'new 6-day shared departure defaults to 6–18')
    new_id = 'DEP-KTDE-20270109'
    code, body, _ = req(adm, '/booking/departures.php?tour=kandahar-durrani-empire-tour')
    check(new_id not in body, 'new draft not public')
    base_upd = {'csrf': csrf, 'id': new_id, 'tour_slug': 'kandahar-durrani-empire-tour', 'start_date': '2027-01-09', 'end_date': '', 'departure_type': 'shared', 'status': 'draft', 'price_amount': '1250', 'price_status': 'reference_from_production'}
    code, body, _ = req(adm, '/manage/?a=update', dict(base_upd, min_group_size='3', max_capacity='18'))
    check('minimum of 6 and a normal maximum of 18' in body, 'long tour: minimum 3 rejected (must be 6)')
    code, body, _ = req(adm, '/manage/?a=update', dict(base_upd, min_group_size='6', max_capacity='20'))
    check('minimum of 6 and a normal maximum of 18' in body, 'long tour: capacity 20 rejected without approved exception')
    code, body, _ = req(adm, '/manage/?a=update', dict(base_upd, min_group_size='6', max_capacity='20', group_exception_note='Trade partner group, approved by James 2026-10-10'))
    check('Saved.' in body, 'long tour: capacity 20 accepted with recorded exception')
    wk_new = req(adm, '/manage/?a=create', {'csrf': csrf, 'tour_slug': 'weekend-in-kabul', 'start_date': '2027-04-02', 'end_date': '', 'departure_type': 'shared', 'min_group_size': '3', 'max_capacity': '', 'status': 'draft', 'price_amount': '450', 'price_status': 'reference_from_production'})[1]
    check('minimum of 2 confirmed travelers' in wk_new, 'short tour: shared minimum 3 rejected (must be 2)')
    wk_new = req(adm, '/manage/?a=create', {'csrf': csrf, 'tour_slug': 'weekend-in-kabul', 'start_date': '2027-04-02', 'end_date': '', 'departure_type': 'shared', 'min_group_size': '', 'max_capacity': '', 'status': 'draft', 'price_amount': '450', 'price_status': 'reference_from_production'})[1]
    check('Departure created' in wk_new and 'name="min_group_size" id="min_group_size" value="2"' in wk_new and 'name="max_capacity" id="max_capacity" value=""' in wk_new, 'short tour: defaults to minimum 2, no standard maximum')
    code, body, _ = req(adm, '/manage/?a=update', dict(base_upd, end_date='2027-01-16', min_group_size='6', max_capacity='18'))
    check('is 8 days inclusive' in body, 'edit rejects end date that does not match duration')
    code, body, _ = req(adm, '/manage/?a=update', dict(base_upd, min_group_size='6', max_capacity='18', internal_notes='INTERNAL-SECRET-NOTE'))
    check('Saved.' in body, 'back to standard 6–18')
    code, body, _ = req(adm, '/manage/?a=op', {'csrf': csrf, 'id': new_id, 'op': 'publish'})
    check('Price not approved' in body, 'publish blocked until the price is owner-approved (reference ≠ approval)')
    code, body, _ = req(adm, '/manage/?a=op', {'csrf': csrf, 'id': new_id, 'op': 'approve'})
    check('price is not owner-approved' in body, 'operational approval of an unpublished departure blocked until price approved')
    code, body, _ = req(adm, '/manage/?a=update', dict(base_upd, min_group_size='6', max_capacity='18', internal_notes='INTERNAL-SECRET-NOTE', price_approved='1'))
    check('Saved.' in body and 'Price approved by james' in body, 'price approval recorded with who/when')
    req(adm, '/manage/?a=op', {'csrf': csrf, 'id': new_id, 'op': 'publish'})
    code, body, _ = req(pub, '/booking/departures.php?tour=kandahar-durrani-empire-tour')
    nd = [x for x in json.loads(body)['departures'] if x['id'] == new_id]
    check(nd and nd[0]['status'] == 'open' and nd[0]['status_text'] == 'Open — awaiting minimum 6 travelers', 'published → public as "Open — awaiting minimum 6 travelers"')
    check('INTERNAL-SECRET-NOTE' not in body, 'internal notes never public')
    def add_trav(name, status, size='1', pay='payment_received'):
        return req(adm, '/manage/?a=traveler', {'csrf': csrf, 'op': 'add', 'departure_id': new_id, 'name': name, 'party_size': size, 'email': name.lower() + '@example.com', 'status': status, 'payment_status': pay})
    def pub_status():
        b = req(pub, '/booking/departures.php?tour=kandahar-durrani-empire-tour')[1]
        return [x for x in json.loads(b)['departures'] if x['id'] == new_id][0]['status'], b
    add_trav('Alice', 'confirmed'); add_trav('Bob', 'confirmed'); add_trav('Pending Pat', 'pending', '3')
    s, b = pub_status(); check(s == 'open', '2 confirmed + 3 pending → still open')
    add_trav('Carol', 'confirmed', '3'); s, b = pub_status()
    check(s == 'open', '5 confirmed → still open (minimum 6)')
    # booking confirmation: booking confirmed while the departure is still open
    eb = req(adm, f'/manage/?a=edit&id={new_id}')[1]
    tid = re.search(r'a=confirmation&amp;traveler=(TRV-[0-9a-f]+)', eb).group(1)
    cb = req(adm, f'/manage/?a=confirmation&traveler={tid}')[1]
    check('Your booking is confirmed.' in cb and 'Departure status at time of booking: Open — awaiting minimum 6 travelers' in cb and 'Required minimum group size: 6 travelers' in cb and 'Amount paid:' in cb and 'Balance due date:' in cb, 'booking confirmation record has the spec fields')
    check('unconfirmed' not in cb.lower(), 'accepted booking never called "unconfirmed"')
    add_trav('Unpaid Uma', 'confirmed', '1', 'not_recorded'); s, b = pub_status()
    check(s == 'open', 'accepted booking without payment received does not count (5 + 1 unpaid → open)')
    eb = req(adm, f'/manage/?a=edit&id={new_id}')[1]
    check('Accepted, payment not recorded (not counted): 1' in eb and 'not counted' in eb, 'admin shows accepted-unpaid separately')
    add_trav('Dave', 'confirmed'); s, b = pub_status()
    check(s == 'open', '6 confirmed but not approved → still open (no auto-confirm)')
    eb = req(adm, f'/manage/?a=edit&id={new_id}')[1]
    check('Departure confirmed on: <strong>not yet' in eb, 'departure confirmed-on not set before approval')
    req(adm, '/manage/?a=op', {'csrf': csrf, 'id': new_id, 'op': 'approve'}); s, b = pub_status()
    check(s == 'confirmed', '6 confirmed + approved → Confirmed')
    eb = req(adm, f'/manage/?a=edit&id={new_id}')[1]
    check('Departure confirmed on: <strong>2026-10-10' in eb, 'date departure became confirmed recorded')
    add_trav('Erin', 'confirmed', '10'); s, b = pub_status()
    check(s == 'confirmed', '16 of 18 → still Confirmed (no automatic Limited threshold)')
    req(adm, '/manage/?a=op', {'csrf': csrf, 'id': new_id, 'op': 'mark_limited'}); s, b = pub_status()
    check(s == 'limited', 'admin marks Limited manually → Limited')
    add_trav('Finn', 'confirmed', '2'); s, b = pub_status()
    check(s == 'sold_out', '18 of 18 → Sold out')
    check(all(n not in b for n in ['Alice', 'Bob', 'Carol', 'Dave', 'Erin', 'alice@example.com']), 'traveler names/emails never in public endpoint')
    code, body, _ = req(pub, '/tour-inquiry.php', dict(f, departure_id=new_id, entity_slug='kandahar-durrani-empire-tour'), J)
    check(code == 409, 'sold-out departure not requestable')
    req(adm, '/manage/?a=op', {'csrf': csrf, 'id': new_id, 'op': 'cancel'})
    b = req(pub, '/booking/departures.php?tour=kandahar-durrani-empire-tour')[1]
    check(new_id not in b, 'cancelled departure removed from public feed (internal state only)')
    code, body, _ = req(adm, '/manage/?a=op', {'csrf': csrf, 'id': new_id, 'op': 'complete'})
    check('only on or after its end date' in body, 'cannot mark a future departure completed')
    # winter date fix action available + works
    code, body, _ = req(adm, '/manage/?a=edit&id=DEP-WNTC-20261205')
    check('Fix end date to 2026-12-16' in body, 'Winter Circuit date mismatch flagged with one-click fix (not auto-applied)')
    # category D cannot get departures
    code, body, _ = req(adm, '/manage/?a=create', {'csrf': csrf, 'tour_slug': 'noshaq-expedition-support', 'start_date': '2027-07-01', 'departure_type': 'shared', 'min_group_size': '3', 'status': 'draft'})
    check('Choose a tour' in body or 'categories A, B or C' in body, 'no departures for category D services')
    # blackout + settings + inquiries pages
    code, body, _ = req(adm, '/manage/?a=calendar'); check('Eid al-Fitr 2027 operating block' in body and '2027-03-08 → 2027-03-12' in body and 'estimated' in body and 'Ramadan 2027 (advisory)' in body, 'religious calendar page: Ramadan advisory + Eid blocks, estimated state')
    # ---- Eid conflict flag + review in /manage/ ----
    code, body, _ = req(adm, '/manage/?view=upcoming')
    check('Eid conflict — review required' in body and 'Ramadan advisory' in body, 'departure list flags Eid conflict and Ramadan advisory')
    code, body, _ = req(adm, '/manage/?a=edit&id=DEP-WKND-20270306')
    check('EID CONFLICT — owner/operational review required' in body and 'has not been moved or deleted' in body, 'edit page shows the Eid conflict flag')
    code, body, _ = req(adm, '/manage/?a=op', {'csrf': csrf, 'id': 'DEP-WKND-20270306', 'op': 'approve'})
    check('Not approved: Eid conflict' in body, 'operational approval blocked while the Eid conflict is unreviewed')
    code, body, _ = req(adm, '/manage/?a=op', {'csrf': csrf, 'id': 'DEP-WKND-20270306', 'op': 'eid_review', 'block_key': 'eid_al_fitr:2027-03-08:2027-03-12', 'note': ''})
    check('explicit override' in body, 'Eid review needs an explicit override + note')
    code, body, _ = req(adm, '/manage/?a=op', {'csrf': csrf, 'id': 'DEP-WKND-20270306', 'op': 'eid_review', 'block_key': 'eid_al_fitr:2027-03-08:2027-03-12', 'note': 'Test: owner approved operating 8 Mar (Chaand Raat)', 'override': '1'})
    check('Eid review recorded' in body, 'Eid review override recorded')
    wk = json.loads(req(pub, '/booking/departures.php?tour=weekend-in-kabul')[1])['departures']
    check(len(wk) == 1 and wk[0]['id'] == 'DEP-WKND-20270306' and wk[0]['advisories'] and wk[0]['price_label'] == 'From $450 per person on shared departures', 'after review the departure is public again (with its Ramadan advisory)')
    # calendar change: move Eid al-Adha onto a published departure → recalculated, flagged, hidden; old override invalid if block moves
    cal_form = {'csrf': csrf, 'y[0][year]': '2027', 'y[0][ramadan_start]': '2027-02-08', 'y[0][ramadan_end]': '2027-03-08', 'y[0][ramadan_state]': 'estimated', 'y[0][ramadan_source]': 'test', 'y[0][fitr]': '2027-03-10', 'y[0][fitr_state]': 'estimated', 'y[0][fitr_source]': 'test', 'y[0][adha]': '2027-04-21', 'y[0][adha_state]': 'confirmed', 'y[0][adha_source]': 'test'}
    code, body, _ = req(adm, '/manage/?a=calendar_save', cal_form)
    check('DEP-ADTS-20270420 × Eid al-Adha 2027' in body and 'DEP-WKND-20270306 ×' not in body, 'Eid date change revalidates: new conflict flagged (ADTS 20 Apr), Weekend no longer in block')
    ids2 = [d['id'] for d in json.loads(req(pub, '/booking/departures.php')[1])['departures']]
    check('DEP-ADTS-20270420' not in ids2 and 'DEP-WKND-20270306' in ids2, 'feed recalculated after the Eid change')
    cal_form.update({'y[0][fitr]': '2027-03-09', 'y[0][adha]': '2027-05-16', 'y[0][adha_state]': 'estimated'})
    req(adm, '/manage/?a=calendar_save', cal_form)
    ids3 = [d['id'] for d in json.loads(req(pub, '/booking/departures.php')[1])['departures']]
    check('DEP-ADTS-20270420' in ids3 and 'DEP-WKND-20270306' in ids3, 'restored calendar: override for the same block dates still valid')
    # new departure inside an Eid block cannot be published even with an approved price
    nb = req(adm, '/manage/?a=create', {'csrf': csrf, 'tour_slug': 'kabul-surroundings', 'start_date': '2027-05-17', 'end_date': '', 'departure_type': 'shared', 'min_group_size': '', 'max_capacity': '', 'status': 'scheduled', 'price_amount': '', 'price_status': 'price_on_request', 'price_approved': '1'})[1]
    nid = re.search(r'(DEP-[A-Z]+-20270517)', nb).group(1)
    code, body, _ = req(adm, '/manage/?a=op', {'csrf': csrf, 'id': nid, 'op': 'publish'})
    check('Eid conflict' in body and 'Not published' in body, 'new standard departure inside the Eid al-Adha block cannot be published')
    # private departure in the block: booking needs the manual-review note before confirmation
    pb = req(adm, '/manage/?a=create', {'csrf': csrf, 'tour_slug': 'panjshir-valley-emeralds-history', 'start_date': '2027-05-16', 'end_date': '', 'departure_type': 'private', 'min_group_size': '1', 'max_capacity': '', 'status': 'on_request', 'price_amount': '', 'price_status': 'price_on_request'})[1]
    pid = re.search(r'(DEP-[A-Z]+-20270516-P)', pb).group(1)
    check('Eid special request — MANUAL REVIEW' in pb, 'private departure in Eid block flagged for manual review')
    code, body, _ = req(adm, '/manage/?a=traveler', {'csrf': csrf, 'op': 'add', 'departure_id': pid, 'name': 'Solo Sam', 'party_size': '1', 'status': 'confirmed', 'payment_status': 'not_recorded'})
    check('manual review required' in body and 'Solo Sam' not in body.split('Add traveler')[0], 'private Eid booking cannot be confirmed without the review note')
    code, body, _ = req(adm, '/manage/?a=traveler', {'csrf': csrf, 'op': 'add', 'departure_id': pid, 'name': 'Solo Sam', 'party_size': '1', 'status': 'confirmed', 'payment_status': 'not_recorded', 'eid_review_note': 'Guide+driver confirmed, hotel open, site access ok'})
    check('Traveler added' in body and 'ATB-2' in body, 'private solo booking confirmed after manual review; booking reference issued')
    trs = json.load(open(private / 'booking' / 'travelers.json'))['travelers']
    sam = [t for t in trs if t['name'] == 'Solo Sam'][0]
    check(all(k in sam for k in ('booking_reference', 'terms_acceptance', 'policy_acceptance')) and sam['terms_acceptance'] is None, 'booking record carries Terms/Cancellation acceptance fields (data model only, not forced)')
    # ---- long-tour 45-day review / 7-day cutoff / unknown-count reconciliation ----
    lf = dict(base_form, entity_name='Afghanistan Discovery Tour Fall', entity_slug='afghanistan-discovery-tour-fall', entity_code='ADTF', departure_id='DEP-ADTF-20261012', travelers='2', booking_type='shared', dry_run='1')
    d = json.loads(req(pub, '/tour-inquiry.php', lf, J)[1])
    check(d['ok'] and d['departure_check'] == 'last_minute_request' and d['last_minute'] is True and d['last_minute_forced'] is True and d['manual_review'] is True, 'normal selection inside the final cutoff is routed as a last-minute request (manual review)')
    kf = dict(lf, entity_name='Kandahar', entity_slug='kandahar-durrani-empire-tour', entity_code='KTDE', departure_id='DEP-KTDE-20261026')
    d = json.loads(req(pub, '/tour-inquiry.php', kf, J)[1])
    check(d['ok'] and d['departure_check'] == 'manual_contact_request' and d['manual_contact'] is True and d['last_minute'] is False and d['manual_review'] is True, 'unknown-count departure inside 45 days: inquiry routed as manual contact')
    code, body, _ = req(adm, '/manage/?view=upcoming')
    check('Traveler count unknown — immediate review required' in body and 'Traveler count unknown — minimum-group review required' in body, '/manage/ flags unknown counts (immediate inside 7 days, min-group inside 45)')
    check('count unknown — reconcile by 2026-10-21' in body and 'final cutoff reached (2026-10-05)' in body and '2 days out' in body and 'min-group review due' in body, '/manage/ shows days-out, review-due, reconcile-by and final-cutoff indicators')
    code, body, _ = req(adm, '/manage/?a=edit&id=DEP-KTDE-20261026')
    check('Reconcile traveler count' in body and 'name="qualifying_count"' in body, 'edit page offers the reconciliation form')
    code, body, _ = req(adm, '/manage/?a=op', {'csrf': csrf, 'id': 'DEP-KTDE-20261026', 'op': 'reconcile', 'qualifying_count': '2', 'pending_count': '1', 'operating': '', 'note': ''})
    check('Reconciliation needs' in body, 'reconciliation requires counts, operating yes/no and a note')
    ntrav0 = len(json.load(open(private / 'booking' / 'travelers.json'))['travelers'])
    code, body, _ = req(adm, '/manage/?a=op', {'csrf': csrf, 'id': 'DEP-KTDE-20261026', 'op': 'reconcile', 'qualifying_count': '2', 'pending_count': '1', 'operating': 'no', 'note': 'Office ledger: 2 paid, 1 enquiry'})
    check('Traveler count reconciled (2 qualifying, 1 pending' in body and 'No customer records were created' in body, 'reconciliation recorded')
    inv1 = json.load(open(private / 'booking' / 'inventory.json'))
    kd = [x for x in inv1['departures'] if x['id'] == 'DEP-KTDE-20261026'][0]
    check(kd['traveler_count_status'] == 'verified' and kd['reconciliation']['reconciled_by'] == 'james' and kd['reconciliation']['reconciled_at'] and kd['reconciliation']['operating'] is False, 'reconciliation stores counts, operating, reconciled_by/at')
    check(len(json.load(open(private / 'booking' / 'travelers.json'))['travelers']) == ntrav0, 'reconciliation fabricates no customer records')
    ids4 = [x['id'] for x in json.loads(req(pub, '/booking/departures.php')[1])['departures']]
    check('DEP-KTDE-20261026' not in ids4, 'reconciled below minimum after the review date, no decision → removed from public booking')
    code, _, _ = req(pub, '/tour-inquiry.php', kf, J)
    check(code == 409, 'held departure cannot be requested (409)')
    code, body, _ = req(adm, '/manage/?view=upcoming')
    check('Minimum not reached — operational decision required · REVIEW OVERDUE' in body, 'known below-minimum shows the overdue decision flag')
    code, body, _ = req(adm, '/manage/?a=op', {'csrf': csrf, 'id': 'DEP-KTDE-20261026', 'op': 'approve_exception', 'note': 'try'})
    check('needs the approval note/reason, the pricing-review acknowledgement and operational approval' in body, 'decision B requires note + pricing review + operational approval')
    req(adm, '/manage/?a=traveler', {'csrf': csrf, 'op': 'add', 'departure_id': 'DEP-KTDE-20261026', 'name': 'Kara', 'party_size': '1', 'email': 'kara@example.com', 'status': 'confirmed', 'payment_status': 'payment_received'})
    code, body, _ = req(adm, '/manage/?a=op', {'csrf': csrf, 'id': 'DEP-KTDE-20261026', 'op': 'offer_private', 'note': 'Private 6-day Kandahar quoted separately'})
    check('Private option recorded' in body and 'private option offered' in body, 'decision C records a private offer on bookings (no conversion)')
    kara = [t for t in json.load(open(private / 'booking' / 'travelers.json'))['travelers'] if t['name'] == 'Kara'][0]
    code, body, _ = req(adm, '/manage/?a=traveler', {'csrf': csrf, 'op': 'propose_move', 'departure_id': 'DEP-KTDE-20261026', 'traveler_id': kara['id'], 'to_departure_id': new_id})
    kara = [t for t in json.load(open(private / 'booking' / 'travelers.json'))['travelers'] if t['name'] == 'Kara'][0]
    check(kara['departure_id'] == 'DEP-KTDE-20261026' and kara['proposed_move']['status'] == 'pending_traveler_confirmation', 'decision D records a proposed move; traveler not moved')
    code, body, _ = req(adm, '/manage/?a=op', {'csrf': csrf, 'id': 'DEP-KTDE-20261026', 'op': 'cancel_low_numbers', 'note': 'Below minimum at review; offered Jan departure or private quote'})
    kara = [t for t in json.load(open(private / 'booking' / 'travelers.json'))['travelers'] if t['name'] == 'Kara'][0]
    check('Cancelled for insufficient numbers' in body and kara['low_numbers_refund']['due'] is True and kara['low_numbers_refund']['percent'] == 100 and kara['low_numbers_refund']['executed'] is False, 'decision A: cancelled, 100% low-numbers refund noted on bookings, not executed')
    code, body, _ = req(adm, '/manage/?a=op', {'csrf': csrf, 'id': 'DEP-ADTF-20261012', 'op': 'reconcile', 'qualifying_count': '7', 'pending_count': '0', 'operating': 'yes', 'operational_approval': '1', 'note': 'Ledger: 7 paid'})
    a2 = [x for x in json.loads(req(pub, '/booking/departures.php?tour=afghanistan-discovery-tour-fall')[1])['departures'] if x['id'] == 'DEP-ADTF-20261012']
    check(a2 and a2[0]['status'] == 'confirmed' and a2[0]['cta'] == 'Contact us for last-minute availability' and a2[0]['booking_window_closed'] and not a2[0]['manual_contact'], 'reconciled 7 + approval inside 7 days → Confirmed, visible, last-minute CTA (not Closed)')
    d = json.loads(req(pub, '/tour-inquiry.php', lf, J)[1])
    check(d['departure_check'] == 'last_minute_request', 'confirmed departure inside cutoff: inquiry still last-minute only')
    code, body, _ = req(adm, '/manage/?a=settings')
    check('name="long_tour_min_group_review_days" value="45"' in body and 'name="long_tour_final_booking_cutoff_days" value="7"' in body, 'review/cutoff days are admin-editable settings')
    # inquiry manual review checklist
    code, body, _ = req(adm, '/manage/?a=inquiries'); check('manual review: eid' in body, 'inquiries list flags manual review')
    eid_inq = eidq[0]['id']
    code, body, _ = req(adm, f'/manage/?a=inquiry&id={eid_inq}')
    check('MANUAL REVIEW' in body and 'Itinerary feasibility' in body and 'Local operating conditions' in body, 'inquiry shows the Eid review checklist')
    code, body, _ = req(adm, '/manage/?a=inquiry', {'csrf': csrf, 'id': eid_inq, 'op': 'review', 'chk_guide': '1', 'note_guide': 'Edrees available', 'review_status': 'open'})
    check('Manual review saved' in body and 'Edrees available' in body, 'checklist notes saved')
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
        check(d2['ok'] and d2['source'] == 'seed' and len(d2['departures']) == 7, 'no private folder: public feed falls back to read-only seed (Eid rule applied)')
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
