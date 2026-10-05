<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;

require __DIR__ . '/../vendor/autoload.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, ['ok' => false, 'error' => 'Method not allowed.']);
}

$contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
if ($contentType !== 'application/json') {
    respond(415, ['ok' => false, 'error' => 'Invalid request format.']);
}

$data = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($data)) {
    respond(400, ['ok' => false, 'error' => 'Invalid request. Please try again.']);
}

$name = trim((string) ($data['name'] ?? ''));
$email = trim((string) ($data['email'] ?? ''));
$phone = trim((string) ($data['phone'] ?? ''));

if (
    $name === '' ||
    strlen($name) > 240 ||
    filter_var($email, FILTER_VALIDATE_EMAIL) === false ||
    strlen($email) > 254 ||
    !preg_match('/^[+\d().\-\s]{7,40}$/', $phone)
) {
    respond(422, ['ok' => false, 'error' => 'Please check your name, email, and phone number.']);
}

$host = getenv('SMTP_HOST') ?: '';
$username = getenv('SMTP_USERNAME') ?: '';
$password = getenv('GMAIL_APP_PASSWORD') ?: '';
$recipient = getenv('RECIPIENT_EMAIL') ?: '';
$port = filter_var(getenv('SMTP_PORT') ?: '587', FILTER_VALIDATE_INT);

if (
    $host === '' ||
    $username === '' ||
    $password === '' ||
    filter_var($recipient, FILTER_VALIDATE_EMAIL) === false ||
    $port === false
) {
    respond(503, ['ok' => false, 'error' => 'Email delivery is not configured yet.']);
}

try {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $host;
    $mail->SMTPAuth = true;
    $mail->Username = $username;
    $mail->Password = $password;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = $port;
    $mail->Timeout = 15;
    $mail->CharSet = 'UTF-8';

    $mail->setFrom($username, 'Brizall Catalogue Request');
    $mail->addAddress($recipient);
    $mail->addReplyTo($email, $name);
    $mail->Subject = 'New Brizall catalogue request';
    $mail->Body = "A new catalogue request was submitted.\n\n"
        . "Name: {$name}\n"
        . "Email: {$email}\n"
        . "Phone: {$phone}\n";
    $mail->send();

    respond(200, ['ok' => true]);
} catch (Throwable $error) {
    error_log('Brizall email delivery failed: ' . $error->getMessage());
    respond(502, ['ok' => false, 'error' => 'We could not send your details. Please try again later.']);
}
