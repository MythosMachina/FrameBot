import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { prisma } from "./prisma";

const SESSION_COOKIE = "fb_session";
const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS ?? 12);

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function deleteSession(token?: string) {
  if (!token) return;
  const tokenHash = hashToken(token);
  await prisma.session.deleteMany({
    where: { tokenHash },
  });
}

export async function getUserBySession(token?: string) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = await prisma.session.findFirst({
    where: { tokenHash, expiresAt: { gt: new Date() } },
    include: { user: true },
  });
  return session?.user ?? null;
}

export function extractSessionToken(
  raw: string | undefined,
  unsignCookie?: (value: string) => { valid: boolean; value: string | null }
) {
  if (!raw) return null;
  if (!unsignCookie) return raw;
  const result = unsignCookie(raw);
  return result.valid ? result.value : null;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function sessionCookieName() {
  return SESSION_COOKIE;
}
