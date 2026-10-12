#!/usr/bin/env python3
"""Inquiry email system tests: routing, AT refs (+concurrency), store-before-send, mail-failure retention + retry,
dedupe, header injection, SMTP client (local sink), escalation disabled/enabled with pinned clock, ownership/human
response stopping alerts, autoresponder-loop headers. No network beyond 127.0.0.1."""
import json, os, socket, subprocess, sys, tempfile, threading, time, urllib.parse, urllib.request, pathlib, glob

ROOT = pathlib.Path(__file__).resolve().parents[2]
LIB = ROOT / 'public/booking/lib'
fails = 0
def check(c, msg):
    global fails
    print(('PASS ' if c else 'FAIL ') + msg)
    if not c: fails += 1

LEAD = ['james@afghantours.com', 'ramin@afghantours.com', 'mohammad@afghantours.com']
OWNERS = {'james': LEAD[0], 'ramin': LEAD[1], 'mohammad': LEAD[2]}

def env_for(mailcfg, top=None):
    priv = pathlib.Path(tempfile.mkdtemp(prefix='aimtest-'))
    (priv / 'booking').mkdir()
    out = priv / 'out'; out.mkdir()
    cfg = {'transport': 'file', 'file_dir': str(out), 'leadership': LEAD, 'owners': OWNERS}
    cfg.update(mailcfg)
    conf = {'mail': cfg}
    conf.update(top or {})
    (priv / 'booking-config.php').write_text('<?php return ' + php_export(conf) + ';')
    e = dict(os.environ, AFGHANTOURS_PRIVATE_DIR=str(priv))
    return priv, out, e

def php_export(v):
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, (int, float)): return str(v)
    if isinstance(v, str): return "'" + v.replace('\\', '\\\\').replace("'", "\\'") + "'"
    if isinstance(v, list): return '[' + ','.join(php_export(x) for x in v) + ']'
    return '[' + ','.join(php_export(k) + '=>' + php_export(x) for k, x in v.items()) + ']'

def php(env, code, now=None):
    e = dict(env)
    if now: e['AIM_NOW'] = now
    src = f"require '{LIB}/booking.php'; require '{LIB}/inquiry-mail.php'; " + code
    r = subprocess.run(['php', '-r', src], env=e, capture_output=True, text=True)
    if r.returncode != 0: print(r.stdout, r.stderr)
    try: return json.loads(r.stdout.strip().splitlines()[-1])
    except Exception: return r.stdout

def _dec(t):
    import email.header, re
    return re.sub(r'(?m)^Subject: (.*)$', lambda m: 'Subject: ' + str(email.header.make_header(email.header.decode_header(m.group(1)))), t, count=1)
def emls(out): return [_dec(pathlib.Path(p).read_text()) for p in sorted(glob.glob(str(out / '*.eml')))]

REC = "['flow'=>'%s','name'=>'Ana Test','email'=>'ana@example.com','whatsapp'=>'+1000','entity_name'=>'Bamyan Explorer','notes'=>'%s']"

# --- routing + refs + store-before-send + ack + loop headers
priv, out, env = env_for({})
r = php(env, "$s = aim_store_new(" + (REC % ('scheduled', 'hello')) + "); echo json_encode([$s['record']['id'], aim_deliver($s['record']['id'], 'BODY', 'Subj'), aim_get($s['record']['id'])]);", now='2026-10-12T08:00:00Z')
ref, res, rec = r
check(ref == 'AT-2026-00001', 'first reference AT-2026-00001')
check(res == {'notification': 'sent', 'ack': 'sent'}, 'notification and ack sent')
check(rec['status'] == 'acknowledged' and not rec.get('last_human_response_at'), 'ack sets Acknowledged, not a human response')
check(rec['assigned_to'] == 'james', 'default owner james')
m = emls(out)
check(len(m) == 2, 'exactly two emails (notification + ack)')
n, a = m[0], m[1]
check('To: reservations@afghantours.com' in n and 'Cc: james@afghantours.com, ramin@afghantours.com, mohammad@afghantours.com' in n, 'tour inquiry → reservations@, leadership Cc (direct mode)')
check('Reply-To: ana@example.com' in n and 'From: AfghanTours Website' in n.replace('=?UTF-8?Q?AfghanTours_Website?=', 'AfghanTours Website'), 'Reply-To visitor, From site address')
check('Auto-Submitted: auto-generated' in n and 'Precedence: bulk' in n and 'X-Auto-Response-Suppress: All' in n, 'notification carries anti-autoresponder headers')
check('To: ana@example.com' in a and 'Auto-Submitted: auto-replied' in a and 'reservations@afghantours.com' in a.split('\n\n')[0], 'ack to visitor, auto-replied, From reservations@')
body = a.split('\n\n', 1)[1]
check(body.startswith('Your inquiry reference: AT-2026-00001\n\nDear Traveler,') and 'does not constitute a confirmed reservation' in body and body.rstrip().endswith('reservations@afghantours.com'), 'reservations ack exact text + reference line')
check('X-Envelope-To: ana@example.com' in a and 'Cc:' not in a.split('\n\n')[0], 'ack goes only to visitor')

r = php(env, "$s = aim_store_new(" + (REC % ('general', 'q')) + "); aim_deliver($s['record']['id'], 'B', 'S'); echo json_encode($s['record']);", now='2026-10-12T08:01:00Z')
m = emls(out)
check(r['id'] == 'AT-2026-00002' and r['route'] == 'general', 'second ref increments; general route')
check('To: info@afghantours.com' in m[2] and 'Thank You for Contacting AfghanTours' in m[3] and 'Our Kabul-based team' in m[3], 'general → info@, general ack text')

# --- dedupe
r = php(env, "$s = aim_store_new(" + (REC % ('general', 'q')) + "); echo json_encode([$s['duplicate'], $s['record']['id']]);", now='2026-10-12T08:05:00Z')
check(r == [True, 'AT-2026-00002'], 'duplicate within window returns same ref, no new record')
r = php(env, "$s = aim_store_new(" + (REC % ('general', 'q')) + "); echo json_encode([$s['duplicate'], $s['record']['id']]);", now='2026-10-12T09:00:00Z')
check(r == [False, 'AT-2026-00003'], 'same content after window is a new inquiry')

# --- forwarder mode: no Cc (avoid duplicate copies)
priv2, out2, env2 = env_for({'leadership_copies': 'forwarder'})
php(env2, "$s = aim_store_new(" + (REC % ('custom', 'x')) + "); aim_deliver($s['record']['id'], 'B', 'S'); echo '1';")
check('Cc:' not in emls(out2)[0].split('\n\n')[0], 'forwarder mode sends no direct leadership Cc')

# --- dedicated sender website@ (James 12 Oct): From/envelope website@, visible names kept, Reply-To info@/reservations@
pW, oW, eW = env_for({'from_email': 'website@afghantours.com'})
php(eW, "$s = aim_store_new(" + (REC % ('scheduled', 'w')) + "); aim_deliver($s['record']['id'], 'B', 'S'); $g = aim_store_new(" + (REC % ('general', 'w2')) + "); aim_deliver($g['record']['id'], 'B', 'S'); echo 1;")
mw = [x.split('\n\n')[0] for x in emls(oW)]
check(all('X-Envelope-From: website@afghantours.com' in h and '<website@afghantours.com>' in h.split('From: ', 2)[-1].splitlines()[0] for h in mw), 'website@: From + envelope on every message')
check('AfghanTours Reservations' in mw[1].replace('_', ' ') and 'Reply-To: reservations@afghantours.com' in mw[1], 'reservations ack: name AfghanTours Reservations, Reply-To reservations@')
check('Reply-To: info@afghantours.com' in mw[3] and 'Reply-To: ana@example.com' in mw[0], 'general ack Reply-To info@; notification Reply-To visitor')

# --- concurrency: 20 parallel stores → 20 unique refs
priv3, out3, env3 = env_for({'rate_limit': {'max': 1000, 'window_minutes': 10}})
procs = [subprocess.Popen(['php', '-r', f"require '{LIB}/booking.php'; require '{LIB}/inquiry-mail.php'; echo aim_store_new(['flow'=>'general','name'=>'P{i}','email'=>'p{i}@example.com','notes'=>'n{i}'])['record']['id'];"], env=env3, stdout=subprocess.PIPE, text=True) for i in range(20)]
refs = [p.communicate()[0].strip() for p in procs]
check(len(set(refs)) == 20 and all(x.startswith('AT-2026-') for x in refs), 'concurrent submissions get 20 unique references')
check(sorted(refs) == [f'AT-2026-{i:05d}' for i in range(1, 21)], 'references are gap-free sequential')
lines = (priv3 / 'booking/inquiries.jsonl').read_text().splitlines()
check(len(lines) == 20, 'all 20 records stored')

# --- rate limit
priv4, out4, env4 = env_for({'rate_limit': {'max': 2, 'window_minutes': 10}})
r = php(env4, "$o=[]; for($i=0;$i<3;$i++){ $o[] = aim_store_new(['flow'=>'general','name'=>'R','notes'=>'n'.$i], 'iphash')['rate_limited']; } echo json_encode($o);")
check(r == [False, False, True], 'per-IP rate limit kicks in')

# --- mail failure retention + retry queue
priv5, out5, env5 = env_for({})
(out5 / 'FAIL').write_text('1')
r = php(env5, "$s = aim_store_new(" + (REC % ('activity', 'f')) + "); echo json_encode([aim_deliver($s['record']['id'],'B','S'), aim_get($s['record']['id']), count(aim_failures())]);", now='2026-10-12T08:00:00Z')
check(r[0] == {'notification': 'failed', 'ack': 'failed'} and r[1]['notification']['attempts'] == 1, 'mail failure flagged (not discarded)')
check(r[1]['name'] == 'Ana Test' and r[2] == 1, 'record retained; appears in failure report')
r = php(env5, "echo json_encode(aim_process_retries());", now='2026-10-12T08:02:00Z')
check(r == [], 'retry respects backoff')
(out5 / 'FAIL').unlink()
r = php(env5, "echo json_encode([aim_process_retries(), count(aim_failures())]);", now='2026-10-12T08:10:00Z')
check(r[0] == {'AT-2026-00001': {'notification': 'sent', 'ack': 'sent'}} and r[1] == 0, 'retry delivers after recovery; failure cleared')
r = php(env5, "echo json_encode(aim_process_retries());", now='2026-10-12T09:10:00Z')
check(r == [] and len(emls(out5)) == 2, 'no double send after success (no double ack)')
cron = subprocess.run(['php', str(LIB / 'inquiry-cron.php')], env=env5, capture_output=True, text=True)
check(cron.returncode == 0 and 'escalation=off' in cron.stdout, 'cron CLI runs; escalation off by default')

# --- header injection
priv6, out6, env6 = env_for({})
r = php(env6, "$s = aim_store_new(['flow'=>'general','name'=>\"Eve\\r\\nBcc: x@evil.test\",'email'=>\"eve@example.com\\r\\nBcc: x@evil.test\",'notes'=>'i']); echo json_encode(aim_deliver($s['record']['id'], 'B', \"Subj\\r\\nBcc: y@evil.test\"));")
m = emls(out6)
check(len(m) == 1 and all(not any(l.lower().startswith('bcc:') for l in x.split('\n\n')[0].splitlines()) and 'evil.test' not in x.split('\n\n')[0].split('X-Envelope-To:')[1].splitlines()[0] for x in m), 'CRLF injection in name/email/subject cannot add headers')
check('Reply-To' not in m[0].split('\n\n')[0], 'invalid email → no Reply-To and no ack')

# --- escalation (exact production shape, top-level key; Sat–Thu 08:00–20:00 Asia/Kabul, Friday closed)
from datetime import datetime, timedelta, timezone as _tz
KABUL = _tz(timedelta(hours=4, minutes=30))
def k(txt):  # 'YYYY-MM-DD HH:MM' Kabul local → UTC ISO
    return datetime.strptime(txt, '%Y-%m-%d %H:%M').replace(tzinfo=KABUL).astimezone(_tz.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
ESC = {'enabled': True, 'timezone': 'Asia/Kabul', 'business_days': [6, 7, 1, 2, 3, 4], 'business_hours': {'start': '08:00', 'end': '20:00'}}
def esc_case(arrive, top=None):
    pv, ov, ev = env_for({}, top if top is not None else {'escalation': ESC})
    php(ev, "aim_store_new(" + (REC % ('scheduled', 'esc ' + arrive)) + "); echo 1;", now=k(arrive))
    return ov, ev
def run(ev, at): return php(ev, "echo json_encode(aim_run_escalations());", now=k(at))
R = 'AT-2026-00001'

check(php(env, "echo json_encode([date('l', strtotime('2027-01-01')), date('N', strtotime('2027-01-01'))]);") == ['Friday', '5'], '1 Jan 2027 is a Friday (ISO 5, excluded)')
pv, ov, ev = env_for({}, {'escalation': ESC})
check(php(ev, "echo json_encode(aim_cfg()['escalation']);")['business_days'] == [6, 7, 1, 2, 3, 4] and php(ev, "echo json_encode(aim_cfg()['escalation']['business_hours']);") == {'start': '08:00', 'end': '20:00'}, 'config shape read exactly (days replace defaults, hours 08:00–20:00)')

# immediate ack + leadership notification on Friday night
ov, ev = esc_case('2026-10-16 22:00')
php(ev, "echo json_encode(aim_deliver('" + R + "', 'B', 'S'));", now=k('2026-10-16 22:00'))
m = emls(ov)
check(len(m) == 2 and 'Cc: james@afghantours.com, ramin@afghantours.com, mohammad@afghantours.com' in m[0] and 'To: ana@example.com' in m[1], 'Friday 22:00 arrival: leadership notified and customer ack sent immediately')

# Thu 19:00 → Ramin Sat 09:00 (24h critical fires Fri 19:00, Fridays count)
ov, ev = esc_case('2026-10-15 19:00')
check(run(ev, '2026-10-15 20:59') == [], 'Thu 19:00: nothing after hours Thu')
check(run(ev, '2026-10-16 18:59') == [], 'Thu 19:00: nothing during Friday (<24h)')
check(run(ev, '2026-10-16 19:00') == {R: ['critical']}, 'Thu 19:00: 24 elapsed hours across Friday → all three (Fri 19:00)')
check('james@afghantours.com' in emls(ov)[-1] and 'mohammad@afghantours.com' in emls(ov)[-1] and 'ramin@afghantours.com' in emls(ov)[-1], '24h alert addressed to all three')
check(run(ev, '2026-10-17 08:59') == [], 'Thu 19:00: not overdue Sat 08:59 (1h59m business)')
check(run(ev, '2026-10-17 09:00') == {R: ['overdue']}, 'Thu 19:00 arrival → Ramin overdue Sat 09:00')
x = php(ev, "echo json_encode(aim_get('" + R + "'));")
check('To: ramin@afghantours.com' in emls(ov)[-1] and '[Overdue – 2 business hours] AT-2026-00001' in emls(ov)[-1] and x['overdue'] is True, 'overdue alert to Ramin; inquiry flagged overdue')
check(run(ev, '2026-10-17 12:00') == [], 'each alert sent once')

# closing time
ov, ev = esc_case('2026-10-12 19:30')  # Mon
check(run(ev, '2026-10-13 09:29') == [] and run(ev, '2026-10-13 09:30') == {R: ['overdue']}, 'Mon 19:30 (30 min before close) → overdue Tue 09:30')
ov, ev = esc_case('2026-10-12 20:00')
check(run(ev, '2026-10-13 09:59') == [] and run(ev, '2026-10-13 10:00') == {R: ['overdue']}, 'arrival exactly 20:00 counts from next opening → Tue 10:00')
ov, ev = esc_case('2026-10-12 19:59')
check(run(ev, '2026-10-13 09:58') == [] and run(ev, '2026-10-13 09:59') == {R: ['overdue']}, 'arrival 19:59 → 1 min + Tue 08:00–09:59')
# Friday arrival
ov, ev = esc_case('2026-10-16 10:00')
check(run(ev, '2026-10-16 23:59') == [] and run(ev, '2026-10-17 09:59') == [], 'Friday 10:00 arrival: no business time counts on Friday')
check(run(ev, '2026-10-17 10:00') == {R: ['overdue', 'critical']}, 'Friday 10:00 → Sat 10:00: overdue (2 business h) and 24h elapsed together')
# Saturday reopening (early arrival)
ov, ev = esc_case('2026-10-17 06:00')
check(run(ev, '2026-10-17 09:59') == [] and run(ev, '2026-10-17 10:00') == {R: ['overdue']}, 'Sat 06:00 arrival starts at 08:00 → overdue 10:00')
# month boundary
ov, ev = esc_case('2026-10-29 19:30')
check(run(ev, '2026-10-31 09:29') == {R: ['critical']}, 'month boundary: only 24h alert before Sat 09:30')
check(run(ev, '2026-10-31 09:30') == {R: ['overdue']}, 'Thu 29 Oct 19:30 → overdue Sat 31 Oct 09:30')
# year boundary
ov, ev = esc_case('2026-12-31 19:00')
check(run(ev, '2027-01-01 18:59') == [] and run(ev, '2027-01-01 19:00') == {R: ['critical']}, 'year boundary: 24h fires on Fri 1 Jan 2027 19:00')
check(run(ev, '2027-01-02 08:59') == [] and run(ev, '2027-01-02 09:00') == {R: ['overdue']}, 'Thu 31 Dec 2026 19:00 → overdue Sat 2 Jan 2027 09:00')
x = php(ev, "echo json_encode(aim_get('" + R + "'));")
check(x['id'] == 'AT-2026-00001', 'reference keeps arrival year')
# response stops alerts
ov, ev = esc_case('2026-10-15 19:00')
php(ev, "aim_record_response('" + R + "','james','email','replied'); echo 1;", now=k('2026-10-15 19:30'))
n0 = len(emls(ov))
check(run(ev, '2026-10-17 09:00') == [] and run(ev, '2026-10-20 09:00') == [] and len(emls(ov)) == n0, 'human response stops overdue and 24h alerts')
# disabled sends nothing (exact production block with enabled=false)
ov, ev = esc_case('2026-10-15 19:00', {'escalation': dict(ESC, enabled=False)})
check(run(ev, '2026-10-20 12:00') == [] and len(emls(ov)) == 0, 'enabled=false: no alerts after 5 days')
cron = subprocess.run(['php', str(LIB / 'inquiry-cron.php')], env=dict(ev, AIM_NOW=k('2026-10-20 12:00')), capture_output=True, text=True)
check('escalation=off' in cron.stdout and not any('X-AfghanTours-Type: internal-alert' in x for x in emls(ov)), 'cron with disabled escalation sends no alerts (only queued delivery)')
# default (no config) also disabled
ov, ev = esc_case('2026-10-15 19:00', {})
check(run(ev, '2026-10-20 12:00') == [], 'default config: escalation disabled')
# non-boolean 'enabled' not treated as on
ov, ev = esc_case('2026-10-15 19:00', {'escalation': dict(ESC, enabled='yes')})
check(run(ev, '2026-10-20 12:00') == [], "enabled must be boolean true ('yes' ignored)")

# --- ownership + human response stop alerts
privH, outH, envH = env_for({}, {'escalation': ESC})
php(envH, "aim_store_new(" + (REC % ('scheduled', 'h')) + "); echo 1;", now='2026-10-12T04:00:00Z')
r = php(envH, "aim_claim('AT-2026-00001','ramin'); aim_transfer('AT-2026-00001','mohammad','ramin','handover'); $x = aim_get('AT-2026-00001'); echo json_encode([$x['assigned_to'], array_column($x['history'],'action')]);", now='2026-10-12T04:30:00Z')
check(r[0] == 'mohammad' and r[1] == ['assigned', 'claimed', 'transferred'], 'single owner; claim + transfer history')
m = emls(outH)
check(any('Inquiry transferred to mohammad' in x and 'james@afghantours.com' in x for x in m), 'transfer notifies new owner and James')
check(php(envH, "echo json_encode(aim_transfer('AT-2026-00001','nobody','x'));") is None, 'transfer to unknown owner rejected')
php(envH, "aim_record_response('AT-2026-00001','mohammad','whatsapp','sent quote'); echo 1;", now='2026-10-12T05:00:00Z')
n0 = len(emls(outH))
r = php(envH, "echo json_encode(aim_run_escalations());", now='2026-10-14T05:00:00Z')
check(r == [] and len(emls(outH)) == n0, 'recorded human response stops overdue and 24h alerts')

# --- SMTP client against a local sink
def smtp_sink(port, log):
    s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); s.bind(('127.0.0.1', port)); s.listen(1)
    c, _ = s.accept(); f = c.makefile('rwb')
    def w(x): f.write(x.encode() + b'\r\n'); f.flush()
    w('220 sink'); data = False
    for line in f:
        t = line.decode().rstrip('\r\n'); log.append(t)
        if data:
            if t == '.': data = False; w('250 queued')
            continue
        u = t.upper()
        if u.startswith('EHLO'): w('250-sink'); w('250 AUTH LOGIN')
        elif u == 'AUTH LOGIN': w('334 VXNlcm5hbWU6')
        elif len(log) == 3: w('334 UGFzc3dvcmQ6')
        elif len(log) == 4: w('235 ok')
        elif u.startswith('DATA'): w('354 go'); data = True
        elif u.startswith('QUIT'): w('221 bye'); break
        else: w('250 ok')
    c.close(); s.close()
port = 25000 + os.getpid() % 3000
log = []
t = threading.Thread(target=smtp_sink, args=(port, log)); t.start(); time.sleep(0.3)
privS, outS, envS = env_for({'transport': 'smtp', 'ack_enabled': False, 'smtp': {'host': '127.0.0.1', 'port': port, 'secure': 'none', 'user': 'web@afghantours.com', 'pass': 'testpass', 'timeout': 5}})
r = php(envS, "$s = aim_store_new(" + (REC % ('scheduled', '.leading dot')) + "); echo json_encode(aim_deliver($s['record']['id'], \".dot line\\nB\", 'S'));")
t.join(5)
check(r == {'notification': 'sent', 'ack': 'not_applicable'}, 'SMTP AUTH LOGIN delivery succeeds')
check('MAIL FROM:<web@afghantours.com>' in log and 'RCPT TO:<reservations@afghantours.com>' in log and sum(1 for x in log if x.startswith('RCPT TO')) == 4, 'SMTP envelope: authenticated sender, primary + 3 leadership')
check('..dot line' in log, 'SMTP dot-stuffing')
privT, outT, envT = env_for({'transport': 'smtp', 'smtp': {'host': '127.0.0.1', 'port': 1, 'secure': 'none', 'user': 'u', 'pass': 'p', 'timeout': 2}})
r = php(envT, "$s = aim_store_new(" + (REC % ('scheduled', 'down')) + "); echo json_encode([aim_deliver($s['record']['id'],'B','S'), aim_get($s['record']['id'])['notification']['status']]);")
check(r[1] == 'failed', 'SMTP server down → failed + queued, record kept')

# --- handler end-to-end (php -S on public/)
privW, outW, envW = env_for({})
hp = 26000 + os.getpid() % 3000
srv = subprocess.Popen(['php', '-S', f'127.0.0.1:{hp}', '-t', str(ROOT / 'public')], env=envW, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
def post(d):
    req = urllib.request.Request(f'http://127.0.0.1:{hp}/tour-inquiry.php', data=urllib.parse.urlencode(d).encode(), headers={'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req) as x: st, raw = x.status, x.read()
    except urllib.error.HTTPError as e: st, raw = e.code, e.read()
    try: return st, json.loads(raw)
    except ValueError: return st, {}
try:
    st, j = post({'flow': 'general', 'name': 'Web Visitor', 'email': 'web@example.com', 'notes': 'hello from the contact page'})
    check(st == 200 and j['ok'] and j['reference'] == 'AT-2026-00001', 'handler returns AT reference after storing')
    m = emls(outW)
    check(len(m) == 2 and 'To: info@afghantours.com' in m[0] and 'Admin reference: AT-2026-00001' in m[0], 'handler: general → info@ notification')
    st, j = post({'flow': 'general', 'name': 'Web Visitor', 'email': 'web@example.com', 'notes': 'hello from the contact page'})
    check(st == 200 and j['reference'] == 'AT-2026-00001' and len(emls(outW)) == 2, 'handler: double submit → same ref, no second ack')
    st, j = post({'flow': 'general', 'name': 'Bot', 'email': 'b@example.com', 'notes': 'spam', 'website': 'http://spam'})
    check(len(emls(outW)) == 2, 'honeypot submission sends nothing')
    st, j = post({'flow': 'general', 'name': 'X', 'email': 'not-an-email', 'notes': 'n'})
    check(st == 400, 'server-side email validation')
finally:
    srv.terminate()

print(f'\n{fails} failure(s)')
sys.exit(1 if fails else 0)
