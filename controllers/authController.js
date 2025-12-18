const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const { OAuth2Client } = require('google-auth-library');
const { generateId } = require('../utils/idGenerator');
const { findByEmail, createUser } = require('../models/userModel');
const { findByEmail: findAdminByEmail, createAdmin, deleteByEmail: deleteAdminByEmail, updatePasswordByEmail, listAdmins } = require('../models/adminAuthModel');
const { ensureDefaultRow: ensureUserDetails } = require('../models/userDetailsModel');

// Firebase admin initialization with ENV credentials first, fallback to ADC
let firebaseInitialized = false;
function ensureFirebase() {
  if (firebaseInitialized) return;
  try {
    if (!admin.apps.length) {
      const {
        FIREBASE_PROJECT_ID,
        FIREBASE_CLIENT_EMAIL,
        FIREBASE_PRIVATE_KEY
      } = process.env;

      if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
        // Handle escaped newlines in env private key
        const pk = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: FIREBASE_PROJECT_ID,
            clientEmail: FIREBASE_CLIENT_EMAIL,
            privateKey: pk
          })
        });
      } else {
        // Fallback to GOOGLE_APPLICATION_CREDENTIALS / default creds
        admin.initializeApp({
          credential: admin.credential.applicationDefault()
        });
      }
    }
    firebaseInitialized = true;
  } catch (e) {
    console.warn('Firebase admin init failed (Google auth will not work):', e.message);
  }
}

// Lazy-initialized Google OAuth client for verifying ID tokens when Firebase fails
let googleClient = null;
function ensureGoogleClient() {
  if (googleClient) return;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.warn('GOOGLE_CLIENT_ID not set; Google OAuth verification will be skipped');
    return;
  }
  googleClient = new OAuth2Client(clientId);
}

async function verifyGoogleIdTokenWithGoogleLibrary(idToken) {
  ensureGoogleClient();
  if (!googleClient) return null;
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) return null;
  return {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not set');
  return jwt.sign({ sub: user.user_id, email: user.email, name: user.full_name }, secret, { expiresIn: '7d' });
}

async function signup(req, res) {
  try {
  const body = req.body || {};
  const signinwithgoogle = toBool(body.signinwithgoogle);
  const name = str(body.name || body.fullName);
  const email = str(body.email);
  const password = body.password != null ? String(body.password) : undefined;
  const phoneNumber = str(body.phonenumber || body.phoneNumber);
  const googleIdToken = str(body.googleIdToken);

    if (signinwithgoogle) {
      if (!googleIdToken) return res.status(400).json({ error: 'googleIdToken is required when signinwithgoogle=true' });
      ensureFirebase();
      if (!firebaseInitialized) return res.status(500).json({ error: 'Google auth not configured' });
      const decoded = await admin.auth().verifyIdToken(googleIdToken);
      const googleEmail = decoded.email;
      if (!googleEmail) return res.status(400).json({ error: 'No email in Google token' });
      let user = await findByEmail(googleEmail);
      if (!user) {
        user = await createUser({
          userId: generateId(),
          email: googleEmail,
          fullName: decoded.name || name || 'Unnamed User',
          passwordHash: null,
          phoneNumber: phoneNumber || null
        });
      }
  await ensureUserDetails(user.user_id);
  const token = signToken(user);
      return res.status(201).json({ token, user: sanitize(user) });
    }

    if (!email || !name || !password) {
      return res.status(400).json({ error: 'name, email, password are required' });
    }

    const existing = await findByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
  const user = await createUser({ userId: generateId(), email, fullName: name, passwordHash, phoneNumber });
  await ensureUserDetails(user.user_id);
    const token = signToken(user);
    res.status(201).json({ token, user: sanitize(user) });
  } catch (err) {
    console.error('Signup error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function login(req, res) {
  try {
  const body = req.body || {};
  const signinwithgoogle = toBool(body.signinwithgoogle);
  const email = str(body.email);
  const password = body.password != null ? String(body.password) : undefined;
  const googleIdToken = str(body.googleIdToken);

    if (signinwithgoogle) {
      if (!googleIdToken) return res.status(400).json({ error: 'googleIdToken is required when signinwithgoogle=true' });
      // 1) Try Firebase Admin verification first
      ensureFirebase();
      let decoded = null;
      if (firebaseInitialized) {
        try {
          decoded = await admin.auth().verifyIdToken(googleIdToken);
        } catch (e) {
          console.warn('Firebase verifyIdToken failed, falling back to Google OAuth:', e.message);
        }
      } else {
        console.warn('Firebase not initialized; skipping Firebase token verification');
      }

      // 2) If Firebase failed or returned no email, try Google OAuth library
      if (!decoded || !decoded.email) {
        try {
          const payload = await verifyGoogleIdTokenWithGoogleLibrary(googleIdToken);
          if (payload) {
            decoded = payload;
          }
        } catch (e) {
          console.warn('Google OAuth verifyIdToken failed:', e.message);
        }
      }

      if (!decoded || !decoded.email) {
        return res.status(401).json({ error: 'Google token could not be verified' });
      }

      const googleEmail = decoded.email;
      const user = await findByEmail(googleEmail);
      if (!user) return res.status(404).json({ error: 'Account not found, please signup first' });
      const token = signToken(user);
      return res.json({ token, user: sanitize(user) });
    }

    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const user = await findByEmail(email);
    if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(user);
    res.json({ token, user: sanitize(user) });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function sanitize(user) {
  return {
    userId: user.user_id,
    email: user.email,
    fullName: user.full_name,
    phoneNumber: user.phone_number,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

async function cmsAuth(req, res) {
  try {
    const body = req.body || {};
    const email = str(body.email || body.emailId || body.username);
    const password = body.password != null ? String(body.password) : undefined;

    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const adminRow = await findAdminByEmail(email);
    if (!adminRow) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, adminRow.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server misconfigured' });

    const token = jwt.sign(
      {
        sub: `admin:${adminRow.id}`,
        email: adminRow.email,
        role: adminRow.role || 'admin',
        source: 'cms',
      },
      secret,
      { expiresIn: '7d' }
    );

    return res.json({ token, user: { email: adminRow.email, role: adminRow.role || 'admin' } });
  } catch (e) {
    console.error('cmsAuth error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /cms-auth/add-admin
// Body: { email, password, role? }
async function cmsAddAdmin(req, res) {
  try {
    const body = req.body || {};
    const email = str(body.email);
    const password = body.password != null ? String(body.password) : undefined;
    const role = str(body.role) || 'admin';

    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const existing = await findAdminByEmail(email);
    if (existing) return res.status(409).json({ error: 'Admin with this email already exists' });

    const passwordHash = await bcrypt.hash(password, 12);
    const row = await createAdmin({ email, passwordHash, role });

    return res.status(201).json({
      success: true,
      admin: {
        id: row.id,
        email: row.email,
        role: row.role,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (e) {
    console.error('cmsAddAdmin error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// DELETE /cms-auth/admin-delete/:emailid
async function cmsDeleteAdmin(req, res) {
  try {
    const emailid = str(req.params.emailid);
    if (!emailid) return res.status(400).json({ error: 'emailid is required' });

    const ok = await deleteAdminByEmail(emailid);
    if (!ok) return res.status(404).json({ error: 'Admin not found' });

    return res.json({ success: true });
  } catch (e) {
    console.error('cmsDeleteAdmin error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /cms-auth/reset-password
// Body: { email, old_password, new_password }
async function cmsResetAdminPassword(req, res) {
  try {
    const body = req.body || {};
    const email = str(body.email);
    const oldPassword = body.old_password != null ? String(body.old_password) : undefined;
    const newPassword = body.new_password != null ? String(body.new_password) : undefined;

    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'email, old_password, new_password are required' });
    }

    const adminRow = await findAdminByEmail(email);
    if (!adminRow) return res.status(404).json({ error: 'Admin not found' });

    const match = await bcrypt.compare(oldPassword, adminRow.password_hash);
    if (!match) return res.status(401).json({ error: 'Old password is incorrect' });

    const newHash = await bcrypt.hash(newPassword, 12);
    const updated = await updatePasswordByEmail(email, newHash);

    return res.json({
      success: true,
      admin: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        updatedAt: updated.updated_at,
      },
    });
  } catch (e) {
    console.error('cmsResetAdminPassword error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /cms-auth/alladmin
async function cmsListAdmins(req, res) {
  try {
    const rows = await listAdmins();
    return res.json({
      items: rows.map((r) => ({
        id: r.id,
        email: r.email,
        role: r.role,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    });
  } catch (e) {
    console.error('cmsListAdmins error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function verifyToken(req, res) {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server misconfigured' });

    // Prefer Authorization header; fallback to body.token or query.token
    const header = req.headers['authorization'] || req.headers['Authorization'];
    const headerToken = header && header.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
    const token = headerToken || (req.body && req.body.token) || (req.query && req.query.token);
    if (!token) return res.status(400).json({ error: 'token missing: provide in Authorization header or token field' });

    try {
      const payload = jwt.verify(token, secret);
      // Compute remaining seconds
      const nowSec = Math.floor(Date.now() / 1000);
      const remaining = (payload.exp ? payload.exp - nowSec : null);
      return res.json({
        valid: true,
        expired: false,
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        iat: payload.iat,
        exp: payload.exp,
        expiresInSeconds: remaining
      });
    } catch (e) {
      if (e.name === 'TokenExpiredError') {
        return res.status(401).json({ valid: false, expired: true, reason: 'expired', exp: e.expiredAt });
      }
      return res.status(401).json({ valid: false, expired: false, reason: 'invalid' });
    }
  } catch (e) {
    console.error('verifyToken error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { signup, login, cmsAuth, cmsAddAdmin, cmsDeleteAdmin, cmsResetAdminPassword, cmsListAdmins, verifyToken };

function toBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1';
  if (typeof v === 'number') return v === 1;
  return false;
}

function str(v) {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

function timingSafeEqualStr(a, b) {
  // Hash both to same-length buffers to avoid early return differences
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  try {
    return crypto.timingSafeEqual(ha, hb);
  } catch (_) {
    return false;
  }
}
