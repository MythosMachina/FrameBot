import { FastifyInstance } from "fastify";
import {
  createSession,
  deleteSession,
  extractSessionToken,
  getUserBySession,
  sessionCookieName,
  verifyPassword,
} from "../lib/auth";
import { prisma } from "../lib/prisma";
import { logEvent } from "../lib/logs";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  signed: true,
};

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (request, reply) => {
    const body = request.body as { username?: string; password?: string };
    const username = body.username?.trim() ?? "";
    const password = body.password ?? "";

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return reply.code(401).send({ error: "Invalid credentials." });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return reply.code(401).send({ error: "Invalid credentials." });
    }

    const session = await createSession(user.id);
    reply.setCookie(sessionCookieName(), session.token, {
      ...COOKIE_OPTS,
      expires: session.expiresAt,
    });

    await logEvent("info", "User login", { userId: user.id, role: user.role });
    return { id: user.id, username: user.username, role: user.role };
  });

  app.post("/auth/logout", async (request, reply) => {
    const token = extractSessionToken(
      request.cookies[sessionCookieName()],
      request.unsignCookie
    );
    await deleteSession(token ?? undefined);
    reply.clearCookie(sessionCookieName(), { path: "/", signed: true });
    return { ok: true };
  });

  app.get("/auth/me", async (request) => {
    const token = extractSessionToken(
      request.cookies[sessionCookieName()],
      request.unsignCookie
    );
    const user = await getUserBySession(token ?? undefined);
    return user ? { user: { id: user.id, username: user.username, role: user.role } } : { user: null };
  });
}
