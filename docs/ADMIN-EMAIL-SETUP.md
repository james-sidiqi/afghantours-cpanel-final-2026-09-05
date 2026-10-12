# AfghanTours — Email & Inquiry Setup (admin instructions)

Branch/PR: `feat/inquiry-email-routing` (NOT merged, NOT deployed). Nothing here has been done on the server.
Every step happens in cPanel (afghantours.com account `jamesbon`) and is done by James or the hosting admin.

## Current state (public DNS, checked 12 Oct 2026)
| Item | Value | Note |
|---|---|---|
| MX | `0 afghantours.com.` → 64.20.39.66 | Mail is hosted on the same cPanel server as the website |
| SPF | `v=spf1 ip4:64.20.39.66 +a +mx +ip4:157.250.199.162 ~all` | Covers the web/mail server. Valid. |
| DKIM | `default._domainkey` RSA-2048 key published | cPanel DKIM is active. Signing of PHP-sent mail still needs a header check (test 21). |
| DMARC | `v=DMARC1; p=none;` | Monitor only, no reports (`rua`) |
| mail host | `mail.afghantours.com` CNAME → afghantours.com (64.20.39.66) | |
| PTR | 64.20.39.66 → `acloudl.aryanict.com` (forward-confirms) | PTR is not on afghantours.com. This is normal for shared hosting. |
| NS | ns1/ns2.acloudl.aryanict.com | DNS is hosted by the hosting provider |

**Blocked (cannot see from outside):** which mailboxes exist, forwarders, autoresponders, quotas, the SMTP auth settings, and whether PHP `mail()` is DKIM-signed.

## 1. Mailboxes (cPanel → Email Accounts)
1. **Check these exist:** info@, james@, ramin@. Log in to Webmail for each one once.
2. **Create** `reservations@afghantours.com` with a strong password and a quota of at least 2 GB.
3. **Create** `mohammad@afghantours.com` with a strong password and a quota of at least 2 GB.
4. **Create** `website@afghantours.com` (approved by James 12 Oct 2026): the dedicated SMTP sending mailbox. It is the From address and envelope sender of every website email; recipients see the names "AfghanTours" / "AfghanTours Reservations" / "AfghanTours Website", and replies go to info@ / reservations@ (acknowledgements) or the visitor (team notifications) via Reply-To. No forwarders or autoresponder on website@.
5. Give each person their password in person or over a secure channel. Never put a password in an email or in Git.

## 2. Forwarders (cPanel → Forwarders → Add Forwarder): info@ and reservations@ ONLY
For **each** of `info@` and `reservations@`, add three forwarders: to `james@`, `ramin@` and `mohammad@`.
- Keep the local copy. In cPanel, a forwarder *adds* a copy and does not remove the original mailbox, so the original stays in place.
- Do **not** add forwarders on james@, ramin@ or mohammad@.
- **Loop check:** cPanel → Forwarders → "Trace" each of the two addresses. Each must end at 4 mailboxes (itself plus the 3 personal ones). None of them may lead back to info@ or reservations@.
- **After the forwarders work**, set `'leadership_copies' => 'forwarder'` in the private config (section 4). Otherwise leadership gets each website inquiry twice: once from the direct Cc, once from the forwarder.

## 3. Autoresponders (cPanel → Autoresponders → Add)
Settings for both:
- Character set: UTF-8.
- **Interval: 1 hour.** It replies to the same sender at most once an hour.
- HTML: off.
- Start: immediately. Stop: never.

The website already sends its own acknowledgement, with the reference number. To stop customers getting a second reply, the website's internal notifications carry `Auto-Submitted: auto-generated` and `Precedence: bulk`. cPanel/Exim autoresponders do not reply to those messages. The website's acknowledgement to the customer carries `Auto-Submitted: auto-replied`, so the customer's own autoresponder will not start a loop. The 1-hour interval is the extra safety net. Test 12 confirms this.

**info@ autoresponder**
- From: `AfghanTours`
- Subject: `Thank You for Contacting AfghanTours`
- Body (exact):
```
Dear Traveler,

Thank you for contacting AfghanTours!

We have received your message and appreciate your interest in exploring Afghanistan with us.

Our Kabul-based team will review your inquiry and respond as soon as possible.

Whether you are planning a private journey, joining a scheduled tour, or requesting a customized itinerary, we look forward to helping you discover Afghanistan.

For direct assistance, you may also contact us on WhatsApp:

+93 780 123 456

Warm regards,

AfghanTours Team
Afghanistan, Reimagined
www.AfghanTours.com
info@afghantours.com
```

**reservations@ autoresponder**
- From: `AfghanTours Reservations`
- Subject: `AfghanTours — Your Tour Inquiry Has Been Received`
- Body (exact):
```
Dear Traveler,

Thank you for your interest in traveling with AfghanTours!

We have received your tour inquiry.

Our reservations team will review your requested itinerary, travel dates, and preferences and contact you with further information.

Please note that submitting an inquiry does not constitute a confirmed reservation. Tour availability and arrangements are subject to confirmation by our team.

For direct assistance, contact us on WhatsApp:

+93 780 123 456

Warm regards,

AfghanTours Reservations Team
Afghanistan, Reimagined
www.AfghanTours.com
reservations@afghantours.com
```

## 4. Private config (never in Git, never in the docroot)
Edit `/home/jamesbon/afghantours-private/booking-config.php` with cPanel File Manager → Edit. Set its permissions to 0600. Add a `'mail'` key next to the existing keys:

```php
    // Email (website@ = dedicated authenticated sender, approved by James 12 Oct 2026). Password is typed here on the server only — never in Git.
    'mail' => [
        'transport' => 'smtp',
        'smtp' => ['host' => 'mail.afghantours.com', 'port' => 465, 'secure' => 'ssl', 'user' => 'website@afghantours.com', 'pass' => 'SET-ON-SERVER-ONLY'],
        'from_email' => 'website@afghantours.com',   // From + envelope of every message; visible names stay AfghanTours / AfghanTours Reservations; Reply-To info@ / reservations@ / visitor
        'notify_from' => ['email' => 'website@afghantours.com', 'name' => 'AfghanTours Website'],
        'leadership' => ['james@afghantours.com', 'ramin@afghantours.com', 'mohammad@afghantours.com'],
        'leadership_copies' => 'direct',             // 'forwarder' once cPanel forwarders on info@/reservations@ are live
        'owners' => ['james' => 'james@afghantours.com', 'ramin' => 'ramin@afghantours.com', 'mohammad' => 'mohammad@afghantours.com'],
        'default_owner' => 'james',
    ],
// top level, exactly this shape (escalation stays DISABLED — James 12 Oct 2026):
'escalation' => ['enabled' => false, 'timezone' => 'Asia/Kabul', 'business_days' => [6,7,1,2,3,4], 'business_hours' => ['start' => '08:00', 'end' => '20:00']],
```

- Business hours (confirmed by James 12 Oct 2026): Saturday–Thursday 08:00–20:00 Asia/Kabul, Friday closed (ISO days: 6=Sat, 7=Sun, 1=Mon … 4=Thu; 5=Fri excluded).
- Rules: customer acknowledgements and the James/Ramin/Mohammad notification go out immediately, 24/7 (Fridays and after hours included). The 2-hour overdue window counts business hours only — Friday/after-hours arrivals start counting at the next opening (e.g. Sat 08:00); after 2 business hours with no human response Ramin is alerted and the inquiry is flagged overdue. After 24 elapsed clock hours (Fridays count) all three are alerted. A recorded human response stops all alerts.
- Alerts (only if escalation is ever enabled) are independent, each sent at most once, and never after a recorded human response:
  - `[Overdue – 2 business hours] AT-…` → Ramin (inquiry flagged overdue).
  - `[Safety alert – 24h unanswered] AT-…` → James, Ramin, Mohammad (24 elapsed clock hours, Fridays count).
- All five addresses (info@, reservations@, james@, ramin@, mohammad@) are independent mailboxes; roles unchanged. website@ is send-only.
- Usernames in `owners` must match the `/manage/` login names (`admin_users`). Ramin and Mohammad need `/manage/` accounts before they can claim an inquiry.
- **If SMTP fails** (wrong password, or the port is blocked from PHP), the inquiry is still saved, marked failed, and shown in `/manage/` → Mail failures. Cron retries it. Nothing is lost.

## 5. Cron (cPanel → Cron Jobs): every 5 minutes
```
*/5 * * * * /usr/local/bin/php -q /home/jamesbon/afghantours.com/booking/lib/inquiry-cron.php >> /home/jamesbon/afghantours-private/booking/inquiry-cron.log 2>&1
```
The PHP path depends on the host's PHP selector. `/usr/local/bin/php` is the usual one; `ea-php82` is another option. The script refuses web requests, and the folder is web-denied. It retries failed deliveries with backoff of 5, 15 and 60 minutes, then 3 and 12 hours, up to 6 attempts. It then runs escalation, which does nothing while it is disabled.

## 6. DNS — DECISION (James, 12 Oct 2026): SPF and DMARC stay UNCHANGED. The notes below are for a possible later review only.
1. **DMARC:** move to monitoring with reports, e.g. `v=DMARC1; p=none; rua=mailto:dmarc@afghantours.com; fo=1`. After 2–4 clean weeks, change to `p=quarantine`.
2. **SPF:** OK as it is. Do not add any third-party senders unless one is used later. Consider changing `~all` to `-all` once DMARC reports are clean.
3. **DKIM:** already published. Check that the website's mail is signed (test 21). If it is not, use the SMTP transport.
4. **PTR:** this is controlled by the host and points to `acloudl.aryanict.com`. No action needed.

## 7. Manual end-to-end checklist (tests 1–30)
The brief listed no numbered tests, so these 30 were written to cover it. Use real external addresses, e.g. a personal Gmail.

**Mailboxes and forwarders**
1. Send to reservations@ from Gmail. It arrives in reservations@ and in the james@, ramin@ and mohammad@ inboxes.
2. Send to info@. It arrives in info@ and in all 3 leadership inboxes.
3. Send to james@. It arrives only there. No forwarding, no autoresponder.
4. Send to mohammad@. It arrives.
5. The forwarder trace shows no loop for info@ or reservations@.

**Autoresponders**
6. Send to info@ from Gmail. You get the general autoresponder with the exact text. A second mail within the hour gets no second autoresponse.
7. The same as test 6 for reservations@, with the reservations text.
8. The autoresponder From/Subject are exactly as specified, and accents and the dash display correctly (UTF-8).

**Website forms** (after the deploy)
9. Contact page general form → notification to info@, Reply-To = the visitor.
10. Tour page "Inquire" modal → notification to reservations@, subject starts with `[AT-2026-…]`.
11. Activity, custom-request, specialist and return-journey forms each go to reservations@.
12. The visitor gets exactly ONE acknowledgement (website ack with reference) and NO cPanel autoresponse to the website notification. Check the visitor inbox, and check info@/reservations@ for a bounce or loop.
13. The acknowledgement contains `Your inquiry reference: AT-2026-NNNNN` followed by the exact approved text.
14. Hitting reply on the internal notification addresses the visitor.
15. The success page or modal shows the reference.
16. Submitting twice within 10 minutes gives the same reference, no second ack, and one record.
17. An invalid email is rejected with a 400.
18. Filling the honeypot field produces no record and no email.
19. More than 6 submissions in 10 minutes from one IP get a "Too many requests" message.
20. Leadership copies arrive once: direct Cc in `direct` mode, forwarder copy only in `forwarder` mode.
21. The headers of a received notification show `dkim=pass` and `spf=pass`. If they don't, switch to SMTP.

**Failure and retry**
22. Temporarily put a wrong SMTP password in the config. Submit. The visitor still sees success with a reference, and `/manage/` → Mail failures lists the inquiry.
23. Fix the password. Within 5 minutes cron delivers it and the failure clears. Exactly one ack arrives.
24. Use "Retry email delivery now" in `/manage/`.

**Tracking, ownership and escalation**
25. A new inquiry shows owner `james` and status Acknowledged after the ack is sent.
26. Claim as ramin: owner = ramin, history shows "claimed".
27. Transfer to mohammad: Mohammad and James get the transfer notice.
28. Record a human response: last human response is set.
29. Enable escalation on a test inquiry. After 2 business hours with no response, Ramin is alerted. At 24h, all three are alerted. A recorded response stops both.
30. The cron log shows `escalation=off` while disabled, and no alerts are sent.
