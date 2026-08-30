// Akawo Platform — Cloudflare Workers API
// Routes:
//   /api/health
//   /api/auth/*            register, login, logout, me, forgot/reset password
//   /api/users/*           me, profile, dashboard
//   /api/contributions/*   CRUD
//   /api/payments/*        initiate, verify, upload-proof, list, webhook
//   /api/verification/*    submit, status
//   /api/admin/*           stats, users, contributions, payments, verifications
//   /api/files/:key        stream an uploaded object from R2

import { json, ok, okList, fail, notFound, readJson, HttpError, corsHeaders } from './http.js';
import { signToken, verifyToken, hashPassword, verifyPassword } from './auth.js';
import { initSchema, first, all, run } from './db.js';
import * as paystack from './paystack.js';
import * as email from './email.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BVN_RE = /^\d{11}$/;

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    bvn: row.bvn,
    phone: row.phone,
    role: row.role,
    isVerified: !!row.is_verified,
    createdAt: row.created_at,
  };
}

function publicContribution(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    amount: row.amount,
    status: row.status,
    paymentDueDate: row.payment_due_date,
    createdAt: row.created_at,
  };
}

function publicPayment(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    contributionId: row.contribution_id,
    amount: row.amount,
    reference: row.reference,
    proofUrl: row.proof_url,
    status: row.status,
    createdAt: row.created_at,
  };
}

function publicVerification(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    facialImage: row.facial_image,
    livenessVideo: row.liveness_video,
    status: row.status,
    createdAt: row.created_at,
  };
}

function nowIso() {
  return new Date().toISOString();
}

// ---------------------------------------------------------------- helpers

async function authenticate(request, env) {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Not authorized to access this route');
  let payload;
  try {
    payload = await verifyToken(token, env.JWT_SECRET);
  } catch (e) {
    throw new HttpError(401, 'Not authorized to access this route');
  }
  const user = await first(env.DB, 'SELECT * FROM users WHERE id = ?', payload.id);
  if (!user) throw new HttpError(401, 'Not authorized to access this route');
  return user;
}

async function requireAdmin(request, env) {
  const user = await authenticate(request, env);
  if (user.role !== 'admin') throw new HttpError(403, 'User role is not authorized to access this route');
  return user;
}

function require(fields, body) {
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || String(body[f]).trim() === '') {
      throw new HttpError(400, `Please provide ${f}`);
    }
  }
}

// ------------------------------------------------------------- storage

async function uploadToR2(env, file, folder) {
  if (!file || typeof file.arrayBuffer !== 'function') throw new HttpError(400, 'Please upload a file');
  const key = `${folder}/${crypto.randomUUID()}-${file.name || 'upload'}`;
  await env.BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });
  return `/api/files/${key}`;
}

async function streamFromR2(env, key) {
  const object = await env.BUCKET.get(key);
  if (!object) throw new HttpError(404, 'File not found');
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

// ------------------------------------------------------------- rate limit (in-memory, best-effort)

const buckets = new Map();
function rateLimit(key, { limit = 20, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const entry = buckets.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }
  entry.count += 1;
  buckets.set(key, entry);
  if (buckets.size > 10_000) buckets.clear();
  return entry.count > limit;
}

// ------------------------------------------------------------- auth handlers

async function handleRegister(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (rateLimit(`reg:${ip}`, { limit: 10 })) throw new HttpError(429, 'Too many attempts, please try again later');

  const body = await readJson(request);
  require(['name', 'email', 'password', 'bvn'], body);

  const emailVal = String(body.email).toLowerCase().trim();
  const bvn = String(body.bvn).trim();
  if (!EMAIL_RE.test(emailVal)) throw new HttpError(400, 'Please add a valid email');
  if (String(body.password).length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  if (!BVN_RE.test(bvn)) throw new HttpError(400, 'BVN must be exactly 11 digits');

  const existing = await first(env.DB, 'SELECT id FROM users WHERE email = ?', emailVal);
  if (existing) throw new HttpError(400, 'User already exists');
  const existingBvn = await first(env.DB, 'SELECT id FROM users WHERE bvn = ?', bvn);
  if (existingBvn) throw new HttpError(400, 'A user with this BVN already exists');

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(String(body.password));
  await run(
    env.DB,
    'INSERT INTO users (id, name, email, password_hash, bvn, phone, role, is_verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)',
    id,
    String(body.name).trim(),
    emailVal,
    passwordHash,
    bvn,
    body.phone ? String(body.phone).trim() : null,
    'user',
    nowIso()
  );

  const user = await first(env.DB, 'SELECT * FROM users WHERE id = ?', id);
  const token = await signToken({ id: user.id, role: user.role }, env.JWT_SECRET, env.JWT_EXPIRES_IN);
  return json({ success: true, token, user: publicUser(user) }, 201);
}

async function handleLogin(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (rateLimit(`login:${ip}`, { limit: 20 })) throw new HttpError(429, 'Too many attempts, please try again later');

  const body = await readJson(request);
  require(['email', 'password'], body);
  const emailVal = String(body.email).toLowerCase().trim();

  const user = await first(env.DB, 'SELECT * FROM users WHERE email = ?', emailVal);
  if (!user || !(await verifyPassword(String(body.password), user.password_hash))) {
    throw new HttpError(401, 'Invalid credentials');
  }
  const token = await signToken({ id: user.id, role: user.role }, env.JWT_SECRET, env.JWT_EXPIRES_IN);
  return json({ success: true, token, user: publicUser(user) });
}

async function handleForgotPassword(request, env) {
  const body = await readJson(request);
  require(['email'], body);
  const emailVal = String(body.email).toLowerCase().trim();
  const user = await first(env.DB, 'SELECT * FROM users WHERE email = ?', emailVal);
  // Always respond the same way to avoid leaking account existence.
  if (user) {
    const resetToken = await signToken({ id: user.id, type: 'reset' }, env.JWT_SECRET, '1h');
    await email.sendPasswordReset(env, publicUser(user), resetToken);
  }
  return json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
}

async function handleResetPassword(request, env) {
  const body = await readJson(request);
  require(['token', 'password'], body);
  if (String(body.password).length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  let payload;
  try {
    payload = await verifyToken(String(body.token), env.JWT_SECRET);
  } catch (e) {
    throw new HttpError(400, 'Invalid or expired reset token');
  }
  if (payload.type !== 'reset') throw new HttpError(400, 'Invalid reset token');
  const passwordHash = await hashPassword(String(body.password));
  await run(env.DB, 'UPDATE users SET password_hash = ? WHERE id = ?', passwordHash, payload.id);
  return json({ success: true, message: 'Password updated. You can now log in.' });
}

// ------------------------------------------------------------- contribution handlers

async function handleCreateContribution(request, env, user) {
  const body = await readJson(request);
  require(['amount'], body);
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(400, 'Please add a valid contribution amount');

  const id = crypto.randomUUID();
  const due = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await run(
    env.DB,
    'INSERT INTO contributions (id, user_id, amount, status, payment_due_date, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    id, user.id, amount, 'pending', due, nowIso()
  );
  const contribution = await first(env.DB, 'SELECT * FROM contributions WHERE id = ?', id);
  return json({ success: true, data: publicContribution(contribution) }, 201);
}

async function handleListContributions(env, user) {
  const rows = await all(env.DB, 'SELECT * FROM contributions WHERE user_id = ? ORDER BY created_at DESC', user.id);
  return okList(rows.map(publicContribution), rows.length);
}

async function handleGetContribution(request, env, user, id) {
  const contribution = await first(env.DB, 'SELECT * FROM contributions WHERE id = ?', id);
  if (!contribution) throw new HttpError(404, 'Contribution not found');
  if (contribution.user_id !== user.id) throw new HttpError(401, 'Not authorized to access this contribution');
  return ok(publicContribution(contribution));
}

async function handleUpdateContribution(request, env, user, id) {
  const contribution = await first(env.DB, 'SELECT * FROM contributions WHERE id = ?', id);
  if (!contribution) throw new HttpError(404, 'Contribution not found');
  if (contribution.user_id !== user.id) throw new HttpError(401, 'Not authorized to update this contribution');
  const body = await readJson(request);
  const amount = body.amount !== undefined ? Number(body.amount) : contribution.amount;
  if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(400, 'Please add a valid contribution amount');
  await run(env.DB, 'UPDATE contributions SET amount = ? WHERE id = ?', amount, id);
  const updated = await first(env.DB, 'SELECT * FROM contributions WHERE id = ?', id);
  return ok(publicContribution(updated));
}

async function handleDeleteContribution(env, user, id) {
  const contribution = await first(env.DB, 'SELECT * FROM contributions WHERE id = ?', id);
  if (!contribution) throw new HttpError(404, 'Contribution not found');
  if (contribution.user_id !== user.id) throw new HttpError(401, 'Not authorized to delete this contribution');
  await run(env.DB, 'DELETE FROM contributions WHERE id = ?', id);
  return json({ success: true, data: {} });
}

// ------------------------------------------------------------- payment handlers

async function handleInitiatePayment(request, env, user) {
  const body = await readJson(request);
  require(['contributionId'], body);
  const contribution = await first(env.DB, 'SELECT * FROM contributions WHERE id = ?', body.contributionId);
  if (!contribution) throw new HttpError(404, 'Contribution not found');
  if (contribution.user_id !== user.id) throw new HttpError(401, 'Not authorized to make payment for this contribution');

  const amount = body.amount !== undefined ? Number(body.amount) : contribution.amount;
  if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(400, 'Invalid amount');

  const reference = `AKA-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const gatewayData = await paystack.initializeTransaction(env, {
    email: user.email,
    amount,
    reference,
    metadata: { contributionId: contribution.id, userId: user.id },
  });

  const id = crypto.randomUUID();
  await run(
    env.DB,
    'INSERT INTO payments (id, user_id, contribution_id, amount, reference, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id, user.id, contribution.id, amount, reference, 'pending', nowIso()
  );

  const payment = await first(env.DB, 'SELECT * FROM payments WHERE id = ?', id);
  return json({
    success: true,
    data: { payment: publicPayment(payment), authorizationUrl: gatewayData.authorization_url, accessCode: gatewayData.access_code },
  });
}

async function handleVerifyPayment(request, env, user, paymentId) {
  const payment = await first(env.DB, 'SELECT * FROM payments WHERE id = ?', paymentId);
  if (!payment) throw new HttpError(404, 'Payment not found');
  if (payment.user_id !== user.id) throw new HttpError(401, 'Not authorized');

  const result = await paystack.verifyTransaction(env, payment.reference);
  if (result.status === 'success') {
    await run(env.DB, "UPDATE payments SET status = 'completed' WHERE id = ?", payment.id);
    if (payment.contribution_id) {
      await run(env.DB, "UPDATE contributions SET status = 'paid' WHERE id = ?", payment.contribution_id);
    }
    const updated = await first(env.DB, 'SELECT * FROM payments WHERE id = ?', payment.id);
    return ok(publicPayment(updated));
  }
  throw new HttpError(400, 'Payment verification failed');
}

async function handleUploadProof(request, env, user) {
  const formData = await request.formData();
  const contributionId = formData.get('contributionId');
  const file = formData.get('proof');
  if (!file || typeof file === 'string') throw new HttpError(400, 'Please upload a file');
  if (!contributionId) throw new HttpError(400, 'Please provide contributionId');

  const contribution = await first(env.DB, 'SELECT * FROM contributions WHERE id = ?', contributionId);
  if (!contribution) throw new HttpError(404, 'Contribution not found');
  if (contribution.user_id !== user.id) throw new HttpError(401, 'Not authorized');

  const proofUrl = await uploadToR2(env, file, 'proofs');
  const existing = await first(env.DB, 'SELECT * FROM payments WHERE contribution_id = ?', contributionId);
  if (existing) {
    await run(env.DB, "UPDATE payments SET proof_url = ?, status = 'pending_verification' WHERE id = ?", proofUrl, existing.id);
    const updated = await first(env.DB, 'SELECT * FROM payments WHERE id = ?', existing.id);
    return ok(publicPayment(updated));
  }
  const id = crypto.randomUUID();
  await run(
    env.DB,
    "INSERT INTO payments (id, user_id, contribution_id, amount, proof_url, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending_verification', ?)",
    id, user.id, contributionId, contribution.amount, proofUrl, nowIso()
  );
  const created = await first(env.DB, 'SELECT * FROM payments WHERE id = ?', id);
  return ok(publicPayment(created));
}

async function handleListPayments(env, user) {
  const rows = await all(env.DB, 'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC', user.id);
  return okList(rows.map(publicPayment), rows.length);
}

async function handlePaystackWebhook(request, env) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-paystack-signature') || '';
  if (env.PAYSTACK_SECRET_KEY && !(await paystack.verifyWebhookSignature(env, rawBody, signature))) {
    throw new HttpError(401, 'Invalid webhook signature');
  }
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    throw new HttpError(400, 'Invalid webhook body');
  }
  if (event.event === 'charge.success') {
    const reference = event.data && event.data.reference;
    if (reference) {
      const payment = await first(env.DB, 'SELECT * FROM payments WHERE reference = ?', reference);
      if (payment && payment.status !== 'completed') {
        await run(env.DB, "UPDATE payments SET status = 'completed' WHERE id = ?", payment.id);
        if (payment.contribution_id) {
          await run(env.DB, "UPDATE contributions SET status = 'paid' WHERE id = ?", payment.contribution_id);
        }
      }
    }
  }
  return json({ success: true });
}

// ------------------------------------------------------------- verification handlers

async function handleSubmitVerification(request, env, user) {
  const formData = await request.formData();
  const facialImage = formData.get('facialImage');
  const livenessVideo = formData.get('livenessVideo');
  if (!facialImage || typeof facialImage === 'string') throw new HttpError(400, 'Please upload a facial image');
  if (!livenessVideo || typeof livenessVideo === 'string') throw new HttpError(400, 'Please upload a liveness video');

  const facialImageUrl = await uploadToR2(env, facialImage, 'kyc');
  const livenessVideoUrl = await uploadToR2(env, livenessVideo, 'kyc');

  const id = crypto.randomUUID();
  await run(
    env.DB,
    "INSERT INTO verifications (id, user_id, facial_image, liveness_video, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
    id, user.id, facialImageUrl, livenessVideoUrl, nowIso()
  );
  const verification = await first(env.DB, 'SELECT * FROM verifications WHERE id = ?', id);
  return json({ success: true, data: publicVerification(verification) }, 201);
}

async function handleCheckVerification(env, user) {
  const verification = await first(env.DB, 'SELECT * FROM verifications WHERE user_id = ? ORDER BY created_at DESC', user.id);
  if (!verification) throw new HttpError(404, 'No verification submission found');
  return ok(publicVerification(verification));
}

// ------------------------------------------------------------- admin handlers

async function handleAdminStats(env) {
  const totalUsers = await first(env.DB, 'SELECT COUNT(*) AS c FROM users');
  const totalContributions = await first(env.DB, 'SELECT COUNT(*) AS c FROM contributions');
  const totalAmount = await first(env.DB, "SELECT COALESCE(SUM(amount),0) AS s FROM contributions WHERE status = 'paid'");
  const pendingVerifications = await first(env.DB, "SELECT COUNT(*) AS c FROM verifications WHERE status = 'pending'");
  const totalPayments = await first(env.DB, 'SELECT COUNT(*) AS c FROM payments');
  const completedPayments = await first(env.DB, "SELECT COUNT(*) AS c FROM payments WHERE status = 'completed'");
  return ok({
    totalUsers: totalUsers.c,
    totalContributions: totalContributions.c,
    totalAmountContributed: totalAmount.s,
    pendingVerifications: pendingVerifications.c,
    totalPayments: totalPayments.c,
    completedPayments: completedPayments.c,
  });
}

async function handleAdminUsers(env) {
  const rows = await all(env.DB, 'SELECT * FROM users ORDER BY created_at DESC');
  return okList(rows.map(publicUser), rows.length);
}

async function handleAdminUserDetail(env, userId) {
  const user = await first(env.DB, 'SELECT * FROM users WHERE id = ?', userId);
  if (!user) throw new HttpError(404, 'User not found');
  const contributions = await all(env.DB, 'SELECT * FROM contributions WHERE user_id = ?', userId);
  const payments = await all(env.DB, 'SELECT * FROM payments WHERE user_id = ?', userId);
  return ok({ user: publicUser(user), contributions: contributions.map(publicContribution), payments: payments.map(publicPayment) });
}

async function handleAdminUpdateUserStatus(request, env, userId) {
  const body = await readJson(request);
  const isVerified = body.isVerified ? 1 : 0;
  const user = await first(env.DB, 'SELECT * FROM users WHERE id = ?', userId);
  if (!user) throw new HttpError(404, 'User not found');
  await run(env.DB, 'UPDATE users SET is_verified = ? WHERE id = ?', isVerified, userId);
  const updated = await first(env.DB, 'SELECT * FROM users WHERE id = ?', userId);
  return ok(publicUser(updated));
}

async function handleAdminContributions(env) {
  const rows = await all(env.DB, `SELECT c.*, u.name AS user_name, u.email AS user_email FROM contributions c JOIN users u ON u.id = c.user_id ORDER BY c.created_at DESC`);
  return okList(rows.map((r) => ({ ...publicContribution(r), userName: r.user_name, userEmail: r.user_email })), rows.length);
}

async function handleAdminPayments(env) {
  const rows = await all(env.DB, `SELECT p.*, u.name AS user_name, u.email AS user_email FROM payments p JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC`);
  return okList(rows.map((r) => ({ ...publicPayment(r), userName: r.user_name, userEmail: r.user_email })), rows.length);
}

async function handleAdminVerifications(env) {
  const rows = await all(env.DB, `SELECT v.*, u.name AS user_name, u.email AS user_email FROM verifications v JOIN users u ON u.id = v.user_id ORDER BY v.created_at DESC`);
  return okList(rows.map((r) => ({ ...publicVerification(r), userName: r.user_name, userEmail: r.user_email })), rows.length);
}

async function handleAdminResolveVerification(request, env, id) {
  const body = await readJson(request);
  const status = String(body.status || '');
  if (!['approved', 'rejected'].includes(status)) throw new HttpError(400, 'status must be approved or rejected');

  const verification = await first(env.DB, 'SELECT * FROM verifications WHERE id = ?', id);
  if (!verification) throw new HttpError(404, 'Verification not found');
  const user = await first(env.DB, 'SELECT * FROM users WHERE id = ?', verification.user_id);

  await run(env.DB, 'UPDATE verifications SET status = ? WHERE id = ?', status, id);
  if (user) {
    if (status === 'approved') {
      await run(env.DB, 'UPDATE users SET is_verified = 1 WHERE id = ?', user.id);
      await email.sendVerificationApproval(env, publicUser(user));
    } else {
      await email.sendVerificationRejection(env, publicUser(user));
    }
  }
  const updated = await first(env.DB, 'SELECT * FROM verifications WHERE id = ?', id);
  return ok(publicVerification(updated));
}

// ------------------------------------------------------------- bootstrap admin

let adminBootstrapped = false;
async function bootstrapAdmin(env) {
  if (adminBootstrapped) return;
  adminBootstrapped = true;
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return;
  const emailVal = String(env.ADMIN_EMAIL).toLowerCase().trim();
  const existing = await first(env.DB, 'SELECT id FROM users WHERE email = ?', emailVal);
  if (existing) return;
  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(String(env.ADMIN_PASSWORD));
  await run(
    env.DB,
    "INSERT INTO users (id, name, email, password_hash, bvn, role, is_verified, created_at) VALUES (?, ?, ?, ?, ?, 'admin', 1, ?)",
    id, 'Administrator', emailVal, passwordHash, `0000000000${Math.floor(100000000 + Math.random() * 900000000)}`, nowIso()
  );
  console.log(`[admin:bootstrap] created admin ${emailVal}`);
}

// ------------------------------------------------------------- router

const ROUTES = [
  { method: 'GET', path: /^\/api\/health$/, handler: () => json({ success: true, status: 'ok', service: 'akawo-backend' }) },

  { method: 'POST', path: /^\/api\/auth\/register$/, handler: handleRegister },
  { method: 'POST', path: /^\/api\/auth\/login$/, handler: handleLogin },
  { method: 'POST', path: /^\/api\/auth\/logout$/, handler: () => json({ success: true, data: {} }) },
  { method: 'POST', path: /^\/api\/auth\/forgot-password$/, handler: handleForgotPassword },
  { method: 'POST', path: /^\/api\/auth\/reset-password$/, handler: handleResetPassword },
  {
    method: 'GET', path: /^\/api\/auth\/me$/, handler: async (request, env) => {
      const user = await authenticate(request, env);
      return ok(publicUser(user));
    }
  },

  {
    method: 'GET', path: /^\/api\/users\/me$/, handler: async (request, env) => {
      const user = await authenticate(request, env);
      return ok(publicUser(user));
    }
  },
  {
    method: 'GET', path: /^\/api\/users\/profile$/, handler: async (request, env) => {
      const user = await authenticate(request, env);
      return ok(publicUser(user));
    }
  },
  {
    method: 'GET', path: /^\/api\/users\/dashboard$/, handler: async (request, env) => {
      const user = await authenticate(request, env);
      const paid = await first(env.DB, "SELECT COALESCE(SUM(amount),0) AS s FROM contributions WHERE user_id = ? AND status = 'paid'", user.id);
      const pending = await first(env.DB, "SELECT COALESCE(SUM(amount),0) AS s FROM contributions WHERE user_id = ? AND status = 'pending'", user.id);
      const count = await first(env.DB, 'SELECT COUNT(*) AS c FROM contributions WHERE user_id = ?', user.id);
      const recentContributions = await all(env.DB, 'SELECT * FROM contributions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', user.id);
      const recentPayments = await all(env.DB, 'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', user.id);
      return ok({
        totalContributions: paid.s,
        currentBalance: paid.s,
        pendingAmount: pending.s,
        contributionCount: count.c,
        recentContributions: recentContributions.map(publicContribution),
        recentPayments: recentPayments.map(publicPayment),
      });
    }
  },

  {
    method: 'POST', path: /^\/api\/contributions$/, handler: async (request, env) => {
      const user = await authenticate(request, env);
      return handleCreateContribution(request, env, user);
    }
  },
  {
    method: 'GET', path: /^\/api\/contributions$/, handler: async (request, env) => {
      const user = await authenticate(request, env);
      return handleListContributions(env, user);
    }
  },
  {
    method: 'GET', path: /^\/api\/contributions\/([^/]+)$/, handler: async (request, env, m) => {
      const user = await authenticate(request, env);
      return handleGetContribution(request, env, user, m[1]);
    }
  },
  {
    method: 'PUT', path: /^\/api\/contributions\/([^/]+)$/, handler: async (request, env, m) => {
      const user = await authenticate(request, env);
      return handleUpdateContribution(request, env, user, m[1]);
    }
  },
  {
    method: 'DELETE', path: /^\/api\/contributions\/([^/]+)$/, handler: async (request, env, m) => {
      const user = await authenticate(request, env);
      return handleDeleteContribution(env, user, m[1]);
    }
  },

  {
    method: 'POST', path: /^\/api\/payments\/initiate$/, handler: async (request, env) => {
      const user = await authenticate(request, env);
      return handleInitiatePayment(request, env, user);
    }
  },
  {
    method: 'POST', path: /^\/api\/payments\/verify\/([^/]+)$/, handler: async (request, env, m) => {
      const user = await authenticate(request, env);
      return handleVerifyPayment(request, env, user, m[1]);
    }
  },
  {
    method: 'POST', path: /^\/api\/payments\/upload-proof$/, handler: async (request, env) => {
      const user = await authenticate(request, env);
      return handleUploadProof(request, env, user);
    }
  },
  {
    method: 'GET', path: /^\/api\/payments$/, handler: async (request, env) => {
      const user = await authenticate(request, env);
      return handleListPayments(env, user);
    }
  },
  { method: 'POST', path: /^\/api\/payments\/webhook$/, handler: handlePaystackWebhook },

  {
    method: 'POST', path: /^\/api\/verification\/submit$/, handler: async (request, env) => {
      const user = await authenticate(request, env);
      return handleSubmitVerification(request, env, user);
    }
  },
  {
    method: 'GET', path: /^\/api\/verification\/status(?:\/([^/]+))?$/, handler: async (request, env) => {
      // The route uses the authenticated user; any userId param is ignored for safety.
      const user = await authenticate(request, env);
      return handleCheckVerification(env, user);
    }
  },

  { method: 'GET', path: /^\/api\/admin\/stats$/, handler: async (request, env) => { await requireAdmin(request, env); return handleAdminStats(env); } },
  { method: 'GET', path: /^\/api\/admin\/users$/, handler: async (request, env) => { await requireAdmin(request, env); return handleAdminUsers(env); } },
  { method: 'GET', path: /^\/api\/admin\/users\/([^/]+)$/, handler: async (request, env, m) => { await requireAdmin(request, env); return handleAdminUserDetail(env, m[1]); } },
  { method: 'PUT', path: /^\/api\/admin\/users\/([^/]+)\/status$/, handler: async (request, env, m) => { await requireAdmin(request, env); return handleAdminUpdateUserStatus(request, env, m[1]); } },
  { method: 'GET', path: /^\/api\/admin\/contributions$/, handler: async (request, env) => { await requireAdmin(request, env); return handleAdminContributions(env); } },
  { method: 'GET', path: /^\/api\/admin\/payments$/, handler: async (request, env) => { await requireAdmin(request, env); return handleAdminPayments(env); } },
  { method: 'GET', path: /^\/api\/admin\/verifications$/, handler: async (request, env) => { await requireAdmin(request, env); return handleAdminVerifications(env); } },
  { method: 'PUT', path: /^\/api\/admin\/verifications\/([^/]+)$/, handler: async (request, env, m) => { await requireAdmin(request, env); return handleAdminResolveVerification(request, env, m[1]); } },

  {
    method: 'GET', path: /^\/api\/files\/(.+)$/, handler: async (request, env, m) => streamFromR2(env, m[1])
  },
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      await initSchema(env.DB);
      await bootstrapAdmin(env);

      for (const route of ROUTES) {
        if (route.method !== request.method) continue;
        const match = url.pathname.match(route.path);
        if (!match) continue;
        const response = await route.handler(request, env, match);
        for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
        return response;
      }

      return json({ success: false, error: 'Not found' }, 404, cors);
    } catch (err) {
      if (err instanceof HttpError) {
        return json({ success: false, error: err.message }, err.status, cors);
      }
      console.error('Unhandled error:', err);
      return json({ success: false, error: 'Internal server error' }, 500, cors);
    }
  },
};
