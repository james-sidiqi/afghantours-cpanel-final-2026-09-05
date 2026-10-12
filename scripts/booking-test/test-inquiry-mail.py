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

def env_for(mailcfg):
    priv = pathlib.Path(tempfile.mkdtemp(prefix='aimtest-'))
    (priv / 'booking').mkdir()
    out = priv / 'out'; out.mkdir()
    cfg = {'transport': 'file', 'file_dir': str(out), 'leadership': LEAD, 'owners': OWNERS}
    cfg.update(mailcfg)
    (priv / 'booking-config.php').write_text('<?php return ' + php_export({'mail': cfg}) + ';')
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

def emls(out): return [pathlib.Path(p).read_text() for p in sorted(glob.glob(str(out / '*.eml')))]

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

# --- escalation
ESC = {'enabled': True, 'timezone': 'Asia/Kabul', 'business_days': [6, 7, 1, 2, 3, 4], 'business_hours': {'start': '08:00', 'end': '17:00'}}
privD, outD, envD = env_for({})
php(envD, "aim_store_new(" + (REC % ('scheduled', 'e')) + "); echo 1;", now='2026-10-12T04:00:00Z')
r = php(envD, "echo json_encode(aim_run_escalations());", now='2026-10-14T04:00:00Z')
check(r == [], 'escalation disabled by default: no alerts even after 48h')

privE, outE, envE = env_for({'escalation': ESC})
# Mon 12 Oct 2026 08:30 Kabul = 04:00Z
php(envE, "aim_store_new(" + (REC % ('scheduled', 'e')) + "); echo 1;", now='2026-10-12T04:00:00Z')
r = php(envE, "echo json_encode(aim_run_escalations());", now='2026-10-12T05:00:00Z')
check(r == [], 'enabled: 1 business hour → nothing')
r = php(envE, "echo json_encode(aim_run_escalations());", now='2026-10-12T06:31:00Z')
m = emls(outE)
check(r == {'AT-2026-00001': 'overdue'} and len(m) == 1 and 'To: ramin@afghantours.com' in m[0], 'enabled: 2 business hours → overdue alert to Ramin only')
r = php(envE, "echo json_encode(aim_run_escalations());", now='2026-10-12T07:00:00Z')
check(r == [], 'overdue alert sent once')
r = php(envE, "echo json_encode(aim_run_escalations());", now='2026-10-13T04:00:00Z')
m = emls(outE)
check(r == {'AT-2026-00001': 'critical'} and 'james@afghantours.com' in m[-1] and 'ramin@afghantours.com' in m[-1] and 'mohammad@afghantours.com' in m[-1] and 'IMMEDIATE ATTENTION' in m[-1], '24h → all three, immediate attention')
# out-of-hours: Friday is not a business day
privF, outF, envF = env_for({'escalation': ESC})
php(envF, "aim_store_new(" + (REC % ('scheduled', 'fri')) + "); echo 1;", now='2026-10-16T04:00:00Z')  # Friday
r = php(envF, "echo json_encode(aim_run_escalations());", now='2026-10-16T10:00:00Z')
check(r == [], 'non-business day does not count toward 2 business hours')
# empty hours while enabled → never 'overdue'
privG, outG, envG = env_for({'escalation': {'enabled': True}})
php(envG, "aim_store_new(" + (REC % ('scheduled', 'g')) + "); echo 1;", now='2026-10-12T04:00:00Z')
r = php(envG, "echo json_encode(aim_run_escalations());", now='2026-10-12T10:00:00Z')
check(r == [], 'enabled with unconfirmed (empty) business hours → no overdue alert')

# --- ownership + human response stop alerts
privH, outH, envH = env_for({'escalation': ESC})
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
