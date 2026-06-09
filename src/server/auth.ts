import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { User } from '../types';

// A constant secret for local signing. In production, this can fall back to an env variable.
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'vehicle-tracker-super-secret-key-12345';

/**
 * Hash a password using standard crypto salt + pbkdf2
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

/**
 * Sign a user id into a secure, stateless token using HMAC-SHA256.
 * Mimics JSON Web Token structure without requiring external packages.
 */
export function generateToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString('base64');
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

/**
 * Verify token and return userId if valid
 */
export function verifyToken(token: string): string | null {
  try {
    const [payloadBase64, signature] = token.split('.');
    if (!payloadBase64 || !signature) return null;

    // Verify cryptographic signature
    const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(payloadBase64).digest('hex');
    if (signature !== expectedSignature) return null;

    // Parse payload
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
    if (Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload.userId;
  } catch (err) {
    return null;
  }
}

// Extend Express Request interface to hold auth data
export interface AuthenticatedRequest extends Request {
  user?: User;
}

/**
 * Express middleware to enforce authentication and populate req.user
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header with Bearer token is required' });
  }

  const token = authHeader.split(' ')[1];
  const userId = verifyToken(token);

  if (!userId) {
    return res.status(401).json({ error: 'Invalid or expired authorization token' });
  }

  const user = db.findUserById(userId);
  if (!user) {
    return res.status(401).json({ error: 'User associated with this token not found' });
  }

  req.user = user;
  next();
}
