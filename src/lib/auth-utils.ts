import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Create a random session token for authentication cookies
 */
export function createSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Verify a plain text password against a bcrypt hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

/**
 * Hash a password using bcrypt
 */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}
