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
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}
