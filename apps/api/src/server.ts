import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { adminRoutes } from "./routes/admin";
import { logRoutes } from "./routes/logs";
import { systemRoutes } from "./routes/system";
import { ticketRoutes } from "./routes/ticketing";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/user";
import { supportRoutes } from "./routes/support";
import { resumeAutomatons } from "./runtime/automatonManager";
import { extractSessionToken, getUserBySession, sessionCookieName } from "./lib/auth";
import { syncGearsFromDisk } from "./lib/gears";
import { webhookRoutes } from "./routes/webhooks";

const server = Fastify({
  logger: true,
});

await server.register(cookie, {
  secret: process.env.SESSION_SECRET,
});
await server.register(cors, {
  origin: (origin, cb) => {
    if (!origin) {
      cb(null, true);
      return;
    }
    if (process.env.NODE_ENV !== "production") {
      cb(null, true);
      return;
    }
    const allowed = new Set([process.env.PANEL_ORIGIN].filter(Boolean));
    cb(null, allowed.has(origin));
  },
  credentials: true,
});

server.decorateRequest("user", null);
server.decorate("requireAdmin", async (request, reply) => {
  const token = extractSessionToken(
    request.cookies[sessionCookieName()],
    request.unsignCookie
  );
  const user = await getUserBySession(token);
  if (!user || user.role !== "admin") {
    return reply.code(401).send({ error: "Unauthorized." });
  }
  request.user = user;
});

server.decorate("requireUser", async (request, reply) => {
  const token = extractSessionToken(
    request.cookies[sessionCookieName()],
    request.unsignCookie
  );
  const user = await getUserBySession(token);
  if (!user || user.role !== "user") {
    return reply.code(401).send({ error: "Unauthorized." });
  }
  request.user = user;
});

server.get("/health", async () => {
  return { status: "ok" };
});

await server.register(adminRoutes);
await server.register(logRoutes);
await server.register(systemRoutes);
await server.register(ticketRoutes);
await server.register(authRoutes);
await server.register(userRoutes);
await server.register(supportRoutes);
await server.register(webhookRoutes);

await syncGearsFromDisk();
await resumeAutomatons();

const port = Number(process.env.PORT ?? 3011);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await server.listen({ port, host });
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
