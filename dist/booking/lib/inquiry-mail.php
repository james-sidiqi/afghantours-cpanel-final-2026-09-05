<?php
declare(strict_types=1);
/**
 * AfghanTours inquiry routing, references, delivery status, acknowledgements, retry queue,
 * ownership and (disabled-by-default) escalation.
 *
 * Requires booking.php (private store + lock helpers). All addresses that are not public
 * (leadership copies, SMTP credentials, owner emails) come ONLY from the private config
 * <private>/booking-config.php under the 'mail' key. Nothing secret lives in the public build.
 * This folder is denied to the web by booking/lib/.htaccess.
 */

const AIM_STATUSES = ['new' => 'New', 'acknowledged' => 'Acknowledged', 'assigned' => 'Assigned', 'quotation_sent' => 'Quotation Sent',
    'awaiting_customer' => 'Awaiting Customer', 'confirmed' => 'Confirmed', 'closed' => 'Closed'];
const AIM_ACK_SUBJECT = ['general' => 'Thank You for Contacting AfghanTours', 'reservations' => 'AfghanTours — Your Tour Inquiry Has Been Received'];
const AIM_ACK_FROM_NAME = ['general' => 'AfghanTours', 'reservations' => 'AfghanTours Reservations'];
// Owner-approved acknowledgement texts (12 Oct 2026) — verbatim.
const AIM_ACK_BODY = [
'general' => "Dear Traveler,\n\nThank you for contacting AfghanTours!\n\nWe have received your message and appreciate your interest in exploring Afghanistan with us.\n\nOur Kabul-based team will review your inquiry and respond as soon as possible.\n\nWhether you are planning a private journey, joining a scheduled tour, or requesting a customized itinerary, we look forward to helping you discover Afghanistan.\n\nFor direct assistance, you may also contact us on WhatsApp:\n\n+93 780 123 456\n\nWarm regards,\n\nAfghanTours Team\nAfghanistan, Reimagined\nwww.AfghanTours.com\ninfo@afghantours.com",
'reservations' => "Dear Traveler,\n\nThank you for your interest in traveling with AfghanTours!\n\nWe have received your tour inquiry.\n\nOur reservations team will review your requested itinerary, travel dates, and preferences and contact you with further information.\n\nPlease note that submitting an inquiry does not constitute a confirmed reservation. Tour availability and arrangements are subject to confirmation by our team.\n\nFor direct assistance, contact us on WhatsApp:\n\n+93 780 123 456\n\nWarm regards,\n\nAfghanTours Reservations Team\nAfghanistan, Reimagined\nwww.AfghanTours.com\nreservations@afghantours.com",
];

function aim_cfg(): array {
    $d = [
        'transport' => 'mail',            // 'mail' (PHP mail(), -f envelope) | 'smtp' (authenticated) | 'file' (tests only)
        'file_dir' => '',                 // transport=file: directory for .eml files
        'smtp' => ['host' => '', 'port' => 465, 'secure' => 'ssl', 'user' => '', 'pass' => '', 'timeout' => 15, 'helo' => 'afghantours.com'],
        'primary' => ['general' => 'info@afghantours.com', 'reservations' => 'reservations@afghantours.com'],
        'notify_from' => ['email' => 'info@afghantours.com', 'name' => 'AfghanTours Website'],
        'from_email' => '',               // dedicated authenticated sender (website@). When set, it is the From address + envelope of EVERY message; display names stay 'AfghanTours' / 'AfghanTours Reservations' / 'AfghanTours Website', Reply-To carries info@/reservations@ (acks) or the visitor (notifications).
        'envelope_from' => '',            // bounce address; defaults to notify_from email (or SMTP user)
        'leadership' => [],               // e.g. ['james@…','ramin@…','mohammad@…'] — PRIVATE CONFIG ONLY
        'leadership_copies' => 'direct',  // 'direct' = website mail Cc's leadership; 'forwarder' = cPanel forwarders copy it (no Cc → no duplicates)
        'ack_enabled' => true,
        'max_attempts' => 6,
        'retry_backoff_minutes' => [5, 15, 60, 180, 720],
        'dedupe_minutes' => 10,
        'rate_limit' => ['max' => 6, 'window_minutes' => 10],
        'owners' => ['james' => '', 'ramin' => '', 'mohammad' => ''], // username => email (PRIVATE CONFIG)
        'default_owner' => 'james',
        'escalation' => [
            'enabled' => false,           // stays OFF until business hours are confirmed and response tracking is tested
            'timezone' => 'Asia/Kabul',
            'business_days' => [6, 7, 1, 2, 3, 4],                 // ISO weekdays: Sat–Thu (6=Sat … 4=Thu); 5 = Friday closed. Confirmed by James 12 Oct 2026
            'business_hours' => ['start' => '08:00', 'end' => '20:00'], // Asia/Kabul
            'overdue_business_hours' => 2,
            'critical_hours' => 24,
            'secondary_owner' => 'ramin',
        ],
    ];
    $all = function_exists('atb_config') ? atb_config() : [];
    $c = is_array($all['mail'] ?? null) ? $all['mail'] : [];
    $out = array_replace_recursive($d, $c);
    // Top-level 'escalation' => ['enabled'=>…, 'timezone'=>…, 'business_days'=>[…], 'business_hours'=>['start'=>…, 'end'=>…]] (preferred shape).
    if (is_array($all['escalation'] ?? null)) {
        $e = $all['escalation'];
        foreach (['enabled', 'timezone', 'overdue_business_hours', 'critical_hours', 'secondary_owner'] as $k) if (array_key_exists($k, $e)) $out['escalation'][$k] = $e[$k];
        if (array_key_exists('business_days', $e)) $out['escalation']['business_days'] = array_values((array)$e['business_days']); // replace, never merge lists
        if (is_array($e['business_hours'] ?? null)) $out['escalation']['business_hours'] = array_replace($out['escalation']['business_hours'], $e['business_hours']);
    }
    $out['escalation']['enabled'] = ($out['escalation']['enabled'] ?? false) === true;
    $out['escalation']['business_days'] = array_values(array_unique(array_filter(array_map('intval', (array)$out['escalation']['business_days']), static fn($n) => $n >= 1 && $n <= 7)));
    return $out;
}

function aim_now(): DateTimeImmutable {
    $o = getenv('AIM_NOW');
    return new DateTimeImmutable(is_string($o) && $o !== '' ? $o : 'now', new DateTimeZone('UTC'));
}

/** general (info@) vs reservations (reservations@). Everything tour/booking/quote-related is reservations. */
function aim_route(array $rec): string {
    $flow = (string)($rec['flow'] ?? '');
    return ($flow === '' || $flow === 'general') ? 'general' : 'reservations';
}

function aim_clean_header(string $v, int $max = 200): string {
    $v = preg_replace('/[\x00-\x1F\x7F]/u', '', str_replace(["\r", "\n"], '', $v)) ?? '';
    return mb_substr(trim($v), 0, $max);
}

function aim_valid_email(string $e): bool {
    return $e !== '' && strlen($e) <= 190 && !preg_match('/[\r\n,;<>"]/', $e) && filter_var($e, FILTER_VALIDATE_EMAIL) !== false;
}

function aim_addr(string $email, string $name = ''): string {
    $email = aim_clean_header($email, 190);
    $name = aim_clean_header($name, 80);
    return $name === '' ? $email : (mb_encode_mimeheader($name, 'UTF-8', 'Q') . ' <' . $email . '>');
}

/* ------------------------------------------------------------- store + references */

function aim_inquiries_path(): string { return atb_data_dir() . DIRECTORY_SEPARATOR . 'inquiries.jsonl'; }
function aim_meta_path(): string { return atb_data_dir() . DIRECTORY_SEPARATOR . 'inquiry-status.json'; }

function aim_fingerprint(array $r): string {
    return hash('sha256', strtolower(trim((string)($r['email'] ?? ''))) . '|' . trim((string)($r['whatsapp'] ?? '')) . '|' . ($r['entity_slug'] ?? '') . '|' . ($r['departure_id'] ?? '')
        . '|' . trim((string)($r['preferred_dates'] ?? '')) . '|' . trim((string)($r['notes'] ?? '')));
}

/** Tail of the jsonl store (recent rows only; cheap on shared hosting). */
function aim_recent_rows(int $max = 300): array {
    $p = aim_inquiries_path();
    if (!is_file($p)) return [];
    $lines = file($p, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    $out = [];
    foreach (array_slice($lines, -$max) as $l) { $r = json_decode($l, true); if (is_array($r)) $out[] = $r; }
    return $out;
}

/**
 * Durably store a new inquiry with a collision-safe AT-YYYY-NNNNN reference (sequence + append under one exclusive lock).
 * Returns ['record'=>…, 'duplicate'=>bool, 'rate_limited'=>bool]. Throws if the store is unavailable.
 */
function aim_store_new(array $record, string $ipHash = ''): array {
    $cfg = aim_cfg();
    $now = aim_now();
    return atb_with_lock(static function () use ($record, $cfg, $now, $ipHash) {
        $fp = aim_fingerprint($record);
        $recent = aim_recent_rows();
        $cutDup = $now->modify('-' . (int)$cfg['dedupe_minutes'] . ' minutes')->format(DATE_ATOM);
        foreach (array_reverse($recent) as $r) {
            if (($r['fingerprint'] ?? '') === $fp && (string)($r['received_at'] ?? '') >= $cutDup) return ['record' => $r, 'duplicate' => true, 'rate_limited' => false];
        }
        if ($ipHash !== '') {
            $cutRate = $now->modify('-' . (int)$cfg['rate_limit']['window_minutes'] . ' minutes')->format(DATE_ATOM);
            $n = 0;
            foreach ($recent as $r) if (($r['ip_hash'] ?? '') === $ipHash && (string)($r['received_at'] ?? '') >= $cutRate) $n++;
            if ($n >= (int)$cfg['rate_limit']['max']) return ['record' => null, 'duplicate' => false, 'rate_limited' => true];
        }
        $seqPath = atb_data_dir() . DIRECTORY_SEPARATOR . 'inquiry-seq.json';
        $seq = atb_read_json_file($seqPath) ?? [];
        $year = $now->setTimezone(new DateTimeZone('Asia/Kabul'))->format('Y');
        $n = (int)($seq[$year] ?? 0);
        // Never reuse a reference even if the sequence file was lost: skip past any existing one.
        foreach ($recent as $r) if (preg_match('/^AT-' . $year . '-(\d{5,})$/', (string)($r['id'] ?? ''), $m)) $n = max($n, (int)$m[1]);
        $n++;
        $seq[$year] = $n;
        atb_write_json_atomic($seqPath, $seq);
        $ref = sprintf('AT-%s-%05d', $year, $n);
        $kind = aim_route($record);
        $rec = ['id' => $ref, 'reference' => $ref, 'received_at' => $now->format(DATE_ATOM), 'status' => 'new', 'route' => $kind,
            'assigned_to' => (string)$cfg['default_owner'], 'fingerprint' => $fp, 'ip_hash' => $ipHash,
            'notification' => ['status' => 'pending', 'attempts' => 0], 'ack' => ['status' => aim_valid_email((string)($record['email'] ?? '')) && $cfg['ack_enabled'] ? 'pending' : 'not_applicable', 'attempts' => 0],
            'history' => [['at' => $now->format(DATE_ATOM), 'by' => 'system', 'action' => 'assigned', 'to' => (string)$cfg['default_owner']]]] + $record;
        if (!atb_append_jsonl(aim_inquiries_path(), $rec)) throw new RuntimeException('Inquiry store write failed');
        return ['record' => $rec, 'duplicate' => false, 'rate_limited' => false];
    });
}

/** Load one inquiry with its side-file meta merged. */
function aim_get(string $id): ?array {
    foreach (atb_load_inquiries() as $r) if (($r['id'] ?? '') === $id) return $r;
    return null;
}

/** Read-modify-write the side-file meta under the lock. $fn receives the merged record, returns changes. */
function aim_update(string $id, callable $fn, string $actor = 'system'): ?array {
    return atb_with_lock(static function () use ($id, $fn, $actor) {
        $cur = null;
        foreach (atb_load_inquiries() as $r) if (($r['id'] ?? '') === $id) $cur = $r;
        if ($cur === null) return null;
        $changes = $fn($cur);
        if (!$changes) return $cur;
        $meta = atb_read_json_file(aim_meta_path()) ?? [];
        $meta[$id] = array_replace($meta[$id] ?? [], $changes, ['updated_at' => aim_now()->format(DATE_ATOM), 'updated_by' => $actor]);
        atb_write_json_atomic(aim_meta_path(), $meta);
        return array_replace($cur, $meta[$id]);
    });
}

function aim_history_add(array $cur, array $entry): array {
    $h = is_array($cur['history'] ?? null) ? $cur['history'] : [];
    $h[] = ['at' => aim_now()->format(DATE_ATOM)] + $entry;
    return $h;
}

/* ------------------------------------------------------------- messages */

function aim_notification_message(array $rec, string $body, string $subject): array {
    $cfg = aim_cfg();
    $kind = $rec['route'] ?? aim_route($rec);
    $to = [(string)$cfg['primary'][$kind]];
    $cc = [];
    if ($cfg['leadership_copies'] === 'direct') {
        foreach ((array)$cfg['leadership'] as $l) if (aim_valid_email((string)$l) && !in_array(strtolower($l), array_map('strtolower', $to), true)) $cc[] = (string)$l;
    }
    $headers = [
        // Internal, machine-generated: mailbox autoresponders (cPanel honors Precedence/Auto-Submitted) must not answer it.
        'Auto-Submitted' => 'auto-generated', 'Precedence' => 'bulk', 'X-Auto-Response-Suppress' => 'All',
        'X-AfghanTours-Ref' => $rec['id'], 'X-AfghanTours-Type' => 'website-notification',
    ];
    $replyTo = aim_valid_email((string)($rec['email'] ?? '')) ? (string)$rec['email'] : '';
    return ['to' => $to, 'cc' => array_values(array_unique($cc)), 'from' => aim_from($cfg, (string)$cfg['notify_from']['name'], (string)$cfg['notify_from']['email']), 'reply_to' => $replyTo,
        'subject' => '[' . $rec['id'] . '] ' . $subject, 'body' => $body . "\n\nReference: " . $rec['id'], 'headers' => $headers];
}

function aim_ack_message(array $rec): ?array {
    $cfg = aim_cfg();
    $email = (string)($rec['email'] ?? '');
    if (!$cfg['ack_enabled'] || !aim_valid_email($email)) return null;
    $kind = $rec['route'] ?? aim_route($rec);
    $fromEmail = (string)$cfg['primary'][$kind];
    $body = 'Your inquiry reference: ' . $rec['id'] . "\n\n" . AIM_ACK_BODY[$kind];
    return ['to' => [$email], 'cc' => [], 'from' => aim_from($cfg, AIM_ACK_FROM_NAME[$kind], $fromEmail), 'reply_to' => $fromEmail,
        'subject' => AIM_ACK_SUBJECT[$kind], 'body' => $body,
        'headers' => ['Auto-Submitted' => 'auto-replied', 'X-Auto-Response-Suppress' => 'All', 'X-AfghanTours-Ref' => $rec['id'], 'X-AfghanTours-Type' => 'acknowledgement']];
}

/** From header: the dedicated sender (website@) when configured, else the given address. Display name is always kept. */
function aim_from(array $cfg, string $name, string $email): array {
    $f = (string)($cfg['from_email'] ?? '');
    return ['email' => aim_valid_email($f) ? $f : $email, 'name' => $name];
}

/* ------------------------------------------------------------- transport */

/** Build RFC 5322 headers + body. Every header value is CR/LF-stripped (no header injection). */
function aim_build(array $m): array {
    $h = [];
    $h['From'] = aim_addr((string)$m['from']['email'], (string)($m['from']['name'] ?? ''));
    $h['To'] = implode(', ', array_map(static fn($a) => aim_addr($a), $m['to']));
    if ($m['cc']) $h['Cc'] = implode(', ', array_map(static fn($a) => aim_addr($a), $m['cc']));
    if (!empty($m['reply_to'])) $h['Reply-To'] = aim_addr((string)$m['reply_to']);
    $h['Subject'] = mb_encode_mimeheader(aim_clean_header((string)$m['subject'], 250), 'UTF-8', 'B');
    $h['Date'] = aim_now()->format(DATE_RFC2822);
    $h['Message-ID'] = '<' . bin2hex(random_bytes(12)) . '@afghantours.com>';
    $h['MIME-Version'] = '1.0';
    $h['Content-Type'] = 'text/plain; charset=UTF-8';
    $h['Content-Transfer-Encoding'] = '8bit';
    foreach ((array)($m['headers'] ?? []) as $k => $v) $h[preg_replace('/[^A-Za-z0-9-]/', '', (string)$k)] = aim_clean_header((string)$v, 200);
    $body = str_replace(["\r\n", "\r"], "\n", (string)$m['body']);
    return [$h, $body];
}

/** Send one message. Returns [bool ok, string error]. */
function aim_send(array $m): array {
    $cfg = aim_cfg();
    [$h, $body] = aim_build($m);
    $rcpt = array_merge($m['to'], $m['cc']);
    foreach ($rcpt as $r) if (!aim_valid_email((string)$r)) return [false, 'invalid recipient'];
    $envelope = (string)($cfg['envelope_from'] ?: ($cfg['from_email'] ?: ($cfg['transport'] === 'smtp' && $cfg['smtp']['user'] ? $cfg['smtp']['user'] : $cfg['notify_from']['email'])));
    try {
        if ($cfg['transport'] === 'file') {
            $dir = (string)$cfg['file_dir'];
            if ($dir === '' || !is_dir($dir)) return [false, 'file transport dir missing'];
            if (is_file($dir . '/FAIL')) return [false, 'simulated failure'];
            $raw = '';
            foreach ($h as $k => $v) $raw .= "$k: $v\n";
            file_put_contents($dir . '/' . microtime(true) . '-' . bin2hex(random_bytes(3)) . '.eml', "X-Envelope-From: $envelope\nX-Envelope-To: " . implode(',', $rcpt) . "\n" . $raw . "\n" . $body);
            return [true, ''];
        }
        if ($cfg['transport'] === 'smtp') return aim_smtp_send($cfg['smtp'], $envelope, $rcpt, $h, $body);
        $to = $h['To']; $subject = $h['Subject'];
        unset($h['To'], $h['Subject']);
        $hdr = '';
        foreach ($h as $k => $v) $hdr .= ($hdr === '' ? '' : "\r\n") . "$k: $v";
        $ok = @mail($to, $subject, $body, $hdr, aim_valid_email($envelope) ? '-f' . $envelope : '');
        return [$ok, $ok ? '' : 'mail() returned false'];
    } catch (Throwable $e) {
        return [false, substr($e->getMessage(), 0, 200)];
    }
}

/** Minimal authenticated SMTP client (SSL :465 or STARTTLS :587). No third-party code. */
function aim_smtp_send(array $s, string $from, array $rcpt, array $h, string $body): array {
    if ($s['host'] === '' || $s['user'] === '' || $s['pass'] === '') return [false, 'smtp not configured'];
    $remote = ($s['secure'] === 'ssl' ? 'ssl://' : 'tcp://') . $s['host'] . ':' . (int)$s['port'];
    $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true, 'SNI_enabled' => true]]);
    $fp = @stream_socket_client($remote, $errno, $errstr, (float)$s['timeout'], STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) return [false, 'smtp connect failed: ' . $errstr];
    stream_set_timeout($fp, (int)$s['timeout']);
    $read = static function () use ($fp): array { $data = ''; while (($l = fgets($fp, 1024)) !== false) { $data .= $l; if (strlen($l) < 4 || $l[3] === ' ') break; } return [(int)substr($data, 0, 3), $data]; };
    $cmd = static function (string $c, array $ok) use ($fp, $read): void { fwrite($fp, $c . "\r\n"); [$code, $d] = $read(); if (!in_array($code, $ok, true)) throw new RuntimeException('smtp ' . explode(' ', $c)[0] . ' ' . $code); };
    try {
        [$c] = $read(); if ($c !== 220) throw new RuntimeException('smtp greeting ' . $c);
        $cmd('EHLO ' . $s['helo'], [250]);
        if ($s['secure'] === 'tls') {
            $cmd('STARTTLS', [220]);
            if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) throw new RuntimeException('starttls failed');
            $cmd('EHLO ' . $s['helo'], [250]);
        }
        $cmd('AUTH LOGIN', [334]); $cmd(base64_encode($s['user']), [334]); $cmd(base64_encode($s['pass']), [235]);
        $cmd('MAIL FROM:<' . $from . '>', [250]);
        foreach ($rcpt as $r) $cmd('RCPT TO:<' . $r . '>', [250, 251]);
        $cmd('DATA', [354]);
        $raw = '';
        foreach ($h as $k => $v) $raw .= "$k: $v\r\n";
        $raw .= "\r\n" . preg_replace('/^\./m', '..', str_replace("\n", "\r\n", $body)) . "\r\n.";
        $cmd($raw, [250]);
        @fwrite($fp, "QUIT\r\n");
        return [true, ''];
    } catch (Throwable $e) {
        return [false, $e->getMessage()];
    } finally {
        @fclose($fp);
    }
}

/* ------------------------------------------------------------- delivery with status */

/** Attempt the notification (and then the ack) for a stored record; updates status. Never deletes anything. */
function aim_deliver(string $id, ?string $notifyBody = null, ?string $notifySubject = null): array {
    $rec = aim_get($id);
    if (!$rec) return ['notification' => 'missing', 'ack' => 'missing'];
    $cfg = aim_cfg();
    $now = aim_now()->format(DATE_ATOM);
    $out = [];
    foreach (['notification', 'ack'] as $what) {
        $st = (array)($rec[$what] ?? []);
        if (in_array($st['status'] ?? '', ['sent', 'not_applicable', 'gave_up'], true)) { $out[$what] = $st['status']; continue; }
        // Ack only after the record exists (it does) — and never before the internal notification was at least attempted.
        if ($what === 'notification') {
            $body = $notifyBody ?? (string)($rec['notify_body'] ?? aim_fallback_body($rec));
            $subject = $notifySubject ?? (string)($rec['notify_subject'] ?? ('AfghanTours inquiry: ' . ($rec['entity_name'] ?? $rec['name'] ?? '')));
            $msg = aim_notification_message($rec, $body, $subject);
        } else {
            $msg = aim_ack_message($rec);
            if ($msg === null) { $out[$what] = 'not_applicable'; continue; }
        }
        [$ok, $err] = aim_send($msg);
        $attempts = (int)($st['attempts'] ?? 0) + 1;
        $new = ['status' => $ok ? 'sent' : ($attempts >= (int)$cfg['max_attempts'] ? 'gave_up' : 'failed'), 'attempts' => $attempts, 'last_attempt_at' => $now, 'last_error' => $ok ? '' : $err];
        if ($ok) $new['sent_at'] = $now;
        $extra = [];
        if ($what === 'notification' && $notifyBody !== null) { $extra['notify_body'] = $notifyBody; $extra['notify_subject'] = $notifySubject; }
        $rec = aim_update($id, static function ($cur) use ($what, $new, $extra, $ok) {
            $ch = [$what => $new] + $extra;
            if ($what === 'ack' && $ok && ($cur['status'] ?? 'new') === 'new') $ch['status'] = 'acknowledged'; // ack is NOT a human response
            return $ch;
        }) ?? $rec;
        if (!$ok) error_log('[afghantours inquiry] ' . $what . ' failed for ' . $id . ': ' . $err);
        $out[$what] = $new['status'];
    }
    return $out;
}

function aim_fallback_body(array $r): string {
    $l = ['New AfghanTours inquiry ' . $r['id'], ''];
    foreach (['name' => 'Name', 'email' => 'Email', 'whatsapp' => 'WhatsApp / phone', 'entity_name' => 'Tour / experience', 'preferred_dates' => 'Dates', 'travelers' => 'Travelers', 'notes' => 'Message'] as $k => $lab) $l[] = $lab . ': ' . (string)($r[$k] ?? '');
    return implode("\n", $l);
}

/** Retry queue: due failed/pending deliveries (backoff), oldest first. */
function aim_process_retries(int $limit = 20): array {
    $cfg = aim_cfg();
    $now = aim_now();
    $done = [];
    foreach (array_reverse(atb_load_inquiries()) as $r) {
        if (!str_starts_with((string)($r['id'] ?? ''), 'AT-')) continue;
        foreach (['notification', 'ack'] as $w) {
            $st = (array)($r[$w] ?? []);
            if (!in_array($st['status'] ?? '', ['failed', 'pending'], true)) continue;
            $att = (int)($st['attempts'] ?? 0);
            $wait = (int)($cfg['retry_backoff_minutes'][min(max($att - 1, 0), count($cfg['retry_backoff_minutes']) - 1)] ?? 60);
            $last = (string)($st['last_attempt_at'] ?? '');
            if ($att > 0 && $last !== '' && $now < (new DateTimeImmutable($last))->modify("+$wait minutes")) continue 2;
            $done[$r['id']] = aim_deliver((string)$r['id']);
            if (count($done) >= $limit) return $done;
            continue 2;
        }
    }
    return $done;
}

function aim_failures(): array {
    return array_values(array_filter(atb_load_inquiries(), static fn($r) => in_array($r['notification']['status'] ?? '', ['failed', 'gave_up'], true) || in_array($r['ack']['status'] ?? '', ['failed', 'gave_up'], true)));
}

/* ------------------------------------------------------------- ownership */

function aim_owner_names(): array { return array_keys((array)aim_cfg()['owners']); }

function aim_claim(string $id, string $user): ?array {
    return aim_update($id, static function ($cur) use ($user) {
        if (($cur['assigned_to'] ?? '') === $user) return [];
        return ['assigned_to' => $user, 'status' => in_array($cur['status'] ?? 'new', ['new', 'acknowledged'], true) ? 'assigned' : $cur['status'],
            'history' => aim_history_add($cur, ['by' => $user, 'action' => 'claimed', 'from' => $cur['assigned_to'] ?? '', 'to' => $user])];
    }, $user);
}

function aim_transfer(string $id, string $to, string $by, string $note = ''): ?array {
    if (!in_array($to, aim_owner_names(), true)) return null;
    $r = aim_update($id, static function ($cur) use ($to, $by, $note) {
        if (($cur['assigned_to'] ?? '') === $to) return [];
        return ['assigned_to' => $to, 'status' => in_array($cur['status'] ?? 'new', ['new', 'acknowledged'], true) ? 'assigned' : $cur['status'],
            'history' => aim_history_add($cur, ['by' => $by, 'action' => 'transferred', 'from' => $cur['assigned_to'] ?? '', 'to' => $to, 'note' => mb_substr($note, 0, 300)])];
    }, $by);
    if ($r) aim_internal_alert([$to, 'james'], '[' . $id . '] Inquiry transferred to ' . $to, "Inquiry $id was transferred to $to by $by." . ($note !== '' ? "\nNote: $note" : ''), $id);
    return $r;
}

/** A human (not the autoresponder) has replied to the customer — stops escalation. */
function aim_record_response(string $id, string $by, string $channel, string $note = ''): ?array {
    return aim_update($id, static function ($cur) use ($by, $channel, $note) {
        $at = aim_now()->format(DATE_ATOM);
        return ['last_human_response_at' => $at, 'last_human_response_by' => $by,
            'history' => aim_history_add($cur, ['by' => $by, 'action' => 'human_response', 'channel' => mb_substr($channel, 0, 40), 'note' => mb_substr($note, 0, 300)])];
    }, $by);
}

function aim_internal_alert(array $owners, string $subject, string $body, string $ref): bool {
    $cfg = aim_cfg();
    $to = [];
    foreach (array_unique($owners) as $o) { $e = (string)($cfg['owners'][$o] ?? ''); if (aim_valid_email($e)) $to[] = $e; }
    if (!$to) return false;
    [$ok] = aim_send(['to' => $to, 'cc' => [], 'from' => aim_from($cfg, (string)$cfg['notify_from']['name'], (string)$cfg['notify_from']['email']), 'reply_to' => '', 'subject' => $subject, 'body' => $body,
        'headers' => ['Auto-Submitted' => 'auto-generated', 'Precedence' => 'bulk', 'X-Auto-Response-Suppress' => 'All', 'X-AfghanTours-Ref' => $ref, 'X-AfghanTours-Type' => 'internal-alert']]);
    return $ok;
}

/* ------------------------------------------------------------- escalation (disabled by default) */

/** Business minutes between two instants, using configured days/hours in the configured timezone. Null if not configured. */
function aim_business_minutes(DateTimeImmutable $from, DateTimeImmutable $to, array $esc): ?int {
    $days = array_map('intval', (array)$esc['business_days']);
    $start = (string)$esc['business_hours']['start']; $end = (string)$esc['business_hours']['end'];
    if (!$days || !preg_match('/^\d\d:\d\d$/', $start) || !preg_match('/^\d\d:\d\d$/', $end) || $end <= $start) return null;
    $tz = new DateTimeZone((string)$esc['timezone']);
    $a = $from->setTimezone($tz); $b = $to->setTimezone($tz);
    if ($b <= $a) return 0;
    $mins = 0;
    for ($d = $a->setTime(0, 0); $d <= $b; $d = $d->modify('+1 day')) {
        if (!in_array((int)$d->format('N'), $days, true)) continue;
        [$sh, $sm] = array_map('intval', explode(':', $start)); [$eh, $em] = array_map('intval', explode(':', $end));
        $ws = max($d->setTime($sh, $sm), $a); $we = min($d->setTime($eh, $em), $b);
        if ($we > $ws) $mins += intdiv($we->getTimestamp() - $ws->getTimestamp(), 60);
    }
    return $mins;
}

/** Pure decision: escalation stages due now for this record, in order (empty = none).
 *  overdue  = >= N BUSINESS hours since arrival (Friday/after-hours arrivals start at the next opening) → secondary owner.
 *  critical = >= 24 ELAPSED clock hours (Fridays count) → all owners. A recorded human response stops both. */
function aim_escalation_due(array $r, DateTimeImmutable $now, array $esc): array {
    if (empty($esc['enabled'])) return [];
    if (!empty($r['last_human_response_at'])) return [];
    if (in_array($r['status'] ?? 'new', ['confirmed', 'closed', 'quotation_sent', 'awaiting_customer'], true)) return [];
    $recv = new DateTimeImmutable((string)$r['received_at']);
    $sent = (array)($r['escalation'] ?? []);
    $due = [];
    $bm = aim_business_minutes($recv, $now, $esc);
    if ($bm !== null && empty($sent['overdue']) && $bm >= (int)$esc['overdue_business_hours'] * 60) $due[] = 'overdue';
    if (empty($sent['critical']) && ($now->getTimestamp() - $recv->getTimestamp()) >= (int)$esc['critical_hours'] * 3600) $due[] = 'critical';
    return $due;
}

function aim_run_escalations(): array {
    $cfg = aim_cfg(); $esc = $cfg['escalation'];
    if (empty($esc['enabled'])) return [];
    $now = aim_now(); $done = [];
    foreach (atb_load_inquiries() as $r) {
        if (!str_starts_with((string)($r['id'] ?? ''), 'AT-')) continue;
        foreach (aim_escalation_due($r, $now, $esc) as $stage) {
            $owners = $stage === 'critical' ? aim_owner_names() : [(string)$esc['secondary_owner']];
            $subj = $stage === 'critical' ? '[Safety alert – ' . (int)$esc['critical_hours'] . 'h unanswered] ' . $r['id'] . ' — no human response recorded (all leadership)' : '[Overdue – ' . (int)$esc['overdue_business_hours'] . ' business hours] ' . $r['id'] . ' — no human response yet (Ramin may claim it)';
            aim_internal_alert($owners, $subj, "Inquiry {$r['id']} from " . ($r['name'] ?? '') . " received {$r['received_at']}, assigned to " . ($r['assigned_to'] ?? '') . ".\nNo human response has been recorded.", (string)$r['id']);
            aim_update((string)$r['id'], static fn($cur) => ['overdue' => true] + ($stage === 'critical' ? ['critical' => true] : []) + ['escalation' => array_replace((array)($cur['escalation'] ?? []), [$stage => $now->format(DATE_ATOM)]),
                'history' => aim_history_add($cur, ['by' => 'system', 'action' => 'escalated_' . $stage, 'to' => implode(',', $owners)])]);
            $done[$r['id']][] = $stage;
        }
    }
    return $done;
}
