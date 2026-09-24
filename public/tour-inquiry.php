<?php
declare(strict_types=1);

function field(string $name): string {
    return trim((string)($_POST[$name] ?? ''));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('Method not allowed');
}

// Honeypot: bots often fill hidden fields.
if (field('website') !== '') {
    http_response_code(204);
    exit;
}

$name = field('name');
$email = field('email');
$tourName = field('tour_name');

if ($name === '' || $tourName === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    exit('Please provide your name, a valid email address, and the tour you are interested in.');
}

$to = 'info@afghantours.com';
$subject = 'AfghanTours inquiry: ' . $tourName;

$lines = [
    'New AfghanTours tour inquiry',
    '',
    'Tour: ' . $tourName,
    'Tour slug: ' . field('tour_slug'),
    'Tour URL: ' . field('tour_url'),
    '',
    'Name: ' . $name,
    'Email: ' . $email,
    'WhatsApp: ' . field('whatsapp'),
    'Country: ' . field('country'),
    'Preferred dates: ' . field('travel_dates'),
    'Travelers: ' . field('group_size'),
    '',
    'Message:',
    field('message'),
];

$headers = [
    'From: AfghanTours Website <info@afghantours.com>',
    'Reply-To: ' . $email,
    'Content-Type: text/plain; charset=UTF-8',
];

$sent = @mail($to, $subject, implode("\n", $lines), implode("\r\n", $headers));

if (!$sent) {
    http_response_code(500);
    exit('Your inquiry could not be sent from the server. Please contact info@afghantours.com.');
}

header('Content-Type: text/html; charset=UTF-8');
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Inquiry received | AfghanTours</title>
  <style>
    body{margin:0;background:#0e1815;color:#fff;font:16px/1.6 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;padding:2rem}
    main{max-width:640px;background:#fffdf8;color:#101820;padding:2rem;border-radius:24px;text-align:center}
    a{display:inline-block;margin-top:1rem;background:#0e1815;color:#fff;text-decoration:none;padding:.75rem 1rem;border-radius:999px;font-weight:800}
  </style>
</head>
<body>
  <main>
    <h1>Thank you.</h1>
    <p>Your tour inquiry has been sent to AfghanTours. We will reply using the contact information you provided.</p>
    <a href="/tours/">Return to tours</a>
  </main>
</body>
</html>
