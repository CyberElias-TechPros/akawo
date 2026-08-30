// Transactional email. Uses Resend's HTTP API (Workers-compatible) and falls
// back to a console log when no key is configured, so the app still works in
// development and in environments without email configured.

export async function sendEmail(env, { to, subject, text, html }) {
  const key = env.RESEND_API_KEY;
  const from = env.FROM_EMAIL || 'no-reply@akawo.com';
  const payload = { from: `Akawo Platform <${from}>`, to: [to], subject, text: text || html, html: html || text };

  if (!key) {
    console.log(`[email:log] to=${to} subject="${subject}"\n${text || ''}`);
    return { delivered: false, reason: 'RESEND_API_KEY not configured; logged to console' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Email send failed (${res.status}): ${body}`);
  }
  return { delivered: true };
}

export async function sendVerificationApproval(env, user) {
  await sendEmail(env, {
    to: user.email,
    subject: 'Your Akawo account has been verified',
    text: `Hi ${user.name},\n\nGreat news — your Akawo account has been verified. You can now start contributing toward your savings goals.\n\n— The Akawo Team`,
  });
}

export async function sendVerificationRejection(env, user) {
  await sendEmail(env, {
    to: user.email,
    subject: 'Akawo verification needs attention',
    text: `Hi ${user.name},\n\nWe were unable to verify your identity with the documents you provided. Please log in and submit a clearer facial image and liveness video.\n\n— The Akawo Team`,
  });
}

export async function sendPasswordReset(env, user, resetToken) {
  await sendEmail(env, {
    to: user.email,
    subject: 'Reset your Akawo password',
    text: `Hi ${user.name},\n\nUse the link below to reset your password (valid for 1 hour):\n\n${resetToken}\n\nIf you did not request this, please ignore this email.\n\n— The Akawo Team`,
  });
}
