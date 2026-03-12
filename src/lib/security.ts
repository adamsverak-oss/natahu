import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const keyLength = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, keyLength).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, original] = storedHash.split(":");

  if (!salt || !original) {
    return false;
  }

  const candidate = scryptSync(password, salt, keyLength);
  const source = Buffer.from(original, "hex");

  if (candidate.length !== source.length) {
    return false;
  }

  return timingSafeEqual(candidate, source);
}

export function createSessionToken() {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
