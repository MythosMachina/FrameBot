import { FastifyInstance } from "fastify";
import {
  createSession,
  deleteSession,
  extractSessionToken,
  hashPassword,
  sessionCookieName,
  verifyPassword,
} from "../lib/auth";
import { prisma } from "../lib/prisma";
import os from "node:os";
import { encryptToken } from "../lib/crypto";
import { logEvent } from "../lib/logs";
import { restartAutomaton, startAutomaton, stopAutomaton } from "../runtime/automatonManager";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  signed: true,
};

type CreateUserPayload = {
  username: string;
  password: string;
  botLimit: number;
};

function validateCredentials(username: string, password: string) {
  if (!username || username.trim().length < 3) {
    return "Username must be at least 3 characters.";
  }
  if (!password || password.trim().length < 8) {
    return "Password must be at least 8 characters.";
  }
  return null;
}

export async function adminRoutes(app: FastifyInstance) {
  app.get("/admin/bootstrap/status", async () => {
    const adminExists = (await prisma.user.count({ where: { role: "admin" } })) > 0;
    return { adminExists };
  });

  app.post("/admin/bootstrap", async (request, reply) => {
    const body = request.body as { username?: string; password?: string };
    const adminExists = (await prisma.user.count({ where: { role: "admin" } })) > 0;
    if (adminExists) {
      return reply.code(409).send({ error: "Admin already exists." });
    }

    const username = body.username?.trim() ?? "";
    const password = body.password ?? "";
    const validationError = validateCredentials(username, password);
    if (validationError) {
      return reply.code(400).send({ error: validationError });
    }

    const passwordHash = await hashPassword(password);
    const admin = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role: "admin",
        botLimit: 0,
      },
    });

    await logEvent("info", "Admin bootstrap created", { adminId: admin.id });
    const session = await createSession(admin.id);
    reply.setCookie(sessionCookieName(), session.token, {
      ...COOKIE_OPTS,
      expires: session.expiresAt,
    });

    return { id: admin.id, username: admin.username, role: admin.role };
  });

  app.post("/admin/login", async (request, reply) => {
    const body = request.body as { username?: string; password?: string };
    const username = body.username?.trim() ?? "";
    const password = body.password ?? "";

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.role !== "admin") {
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

    await logEvent("info", "Admin login", { adminId: user.id });
    return { id: user.id, username: user.username, role: user.role };
  });

  app.post("/admin/logout", async (request, reply) => {
    const token = extractSessionToken(
      request.cookies[sessionCookieName()],
      request.unsignCookie
    );
    await deleteSession(token);
    reply.clearCookie(sessionCookieName(), { path: "/", signed: true });
    if (request.user) {
      await logEvent("info", "Admin logout", { adminId: request.user.id });
    }
    return { ok: true };
  });

  app.get("/admin/me", { preHandler: [app.requireAdmin] }, async (request) => {
    const user = request.user;
    return { id: user.id, username: user.username, role: user.role };
  });

  app.get("/admin/users", { preHandler: [app.requireAdmin] }, async () => {
    const users = await prisma.user.findMany({
      where: { role: "user" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        botLimit: true,
        createdAt: true,
        automatons: { select: { id: true } },
      },
    });
    return {
      users: users.map((user) => ({
        ...user,
        automatonCount: user.automatons.length,
      })),
    };
  });

  app.get("/admin/automatons", { preHandler: [app.requireAdmin] }, async () => {
    const automatons = await prisma.automaton.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        owner: { select: { id: true, username: true } },
      },
    });
    return { automatons };
  });

  app.get(
    "/admin/automatons/:id/gears/:gearKey/config",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const { id, gearKey } = request.params as { id: string; gearKey: string };
      const automaton = await prisma.automaton.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!automaton) {
        return reply.code(404).send({ error: "Automaton not found." });
      }
      const gear = await prisma.gear.findUnique({
        where: { key: gearKey },
        select: { id: true, name: true, enabled: true },
      });
      if (!gear) {
        return reply.code(404).send({ error: "Gear not found." });
      }
      const assignment = await prisma.automatonGearAssignment.findUnique({
        where: { automatonId_gearId: { automatonId: id, gearId: gear.id } },
        select: { configJson: true, enabled: true },
      });
      if (!assignment) {
        return reply.code(404).send({ error: "Gear not assigned to automaton." });
      }
      return { config: assignment.configJson, enabled: assignment.enabled, gear };
    }
  );

  app.put(
    "/admin/automatons/:id/gears/:gearKey/config",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const { id, gearKey } = request.params as { id: string; gearKey: string };
      const body = request.body as { config?: Record<string, unknown> };
      if (!body || typeof body.config !== "object" || Array.isArray(body.config)) {
        return reply.code(400).send({ error: "config must be an object." });
      }

      const automaton = await prisma.automaton.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!automaton) {
        return reply.code(404).send({ error: "Automaton not found." });
      }
      const gear = await prisma.gear.findUnique({
        where: { key: gearKey },
        select: { id: true },
      });
      if (!gear) {
        return reply.code(404).send({ error: "Gear not found." });
      }
      const assignment = await prisma.automatonGearAssignment.findUnique({
        where: { automatonId_gearId: { automatonId: id, gearId: gear.id } },
        select: { id: true },
      });
      if (!assignment) {
        return reply.code(404).send({ error: "Gear not assigned to automaton." });
      }

      await prisma.automatonGearAssignment.update({
        where: { id: assignment.id },
        data: { configJson: body.config },
      });
      const restartResult = await restartAutomaton(id);
      if (!restartResult?.skipped) {
        await logEvent("info", "Automaton restarted after gear config update", {
          adminId: request.user.id,
          automatonId: id,
          gearKey,
        });
      }
      await logEvent("info", "Gear config updated by admin", {
        adminId: request.user.id,
        automatonId: id,
        gearKey,
      });
      return { ok: true };
    }
  );

  app.get("/admin/stats", { preHandler: [app.requireAdmin] }, async () => {
    const [userCount, automatonCount, gearCount] = await Promise.all([
      prisma.user.count({ where: { role: "user" } }),
      prisma.automaton.count(),
      prisma.gear.count(),
    ]);

    return {
      users: userCount,
      automatons: automatonCount,
      gears: gearCount,
      uptimeSeconds: process.uptime(),
      loadAvg: os.loadavg(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
      },
      cpuCount: os.cpus().length,
    };
  });

  app.get("/admin/gears", { preHandler: [app.requireAdmin] }, async () => {
    const gears = await prisma.gear.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: {
        id: true,
        key: true,
        name: true,
        category: true,
        description: true,
        version: true,
        enabled: true,
      },
    });
    return { gears };
  });

  app.get("/admin/gears/:key", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const gear = await prisma.gear.findUnique({
      where: { key },
      select: {
        id: true,
        key: true,
        name: true,
        category: true,
        description: true,
        version: true,
        enabled: true,
      },
    });
    if (!gear) {
      return reply.code(404).send({ error: "Gear not found." });
    }
    return { gear };
  });

  app.patch("/admin/gears/:key", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const body = request.body as { enabled?: boolean };
    if (typeof body.enabled !== "boolean") {
      return reply.code(400).send({ error: "enabled must be boolean." });
    }
    const gear = await prisma.gear.update({
      where: { key },
      data: { enabled: body.enabled },
      select: {
        id: true,
        key: true,
        name: true,
        category: true,
        description: true,
        version: true,
        enabled: true,
      },
    });
    await logEvent("info", "Gear toggled", {
      adminId: request.user.id,
      gearKey: gear.key,
      enabled: gear.enabled,
    });
    return { gear };
  });

  app.get(
    "/admin/gears/:key/config",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const { key } = request.params as { key: string };
      const gear = await prisma.gear.findUnique({
        where: { key },
        select: { key: true, name: true, enabled: true },
      });
      if (!gear) {
        return reply.code(404).send({ error: "Gear not found." });
      }
      const settingKey = `gear.${key}`;
      const setting = await prisma.systemSetting.findUnique({
        where: { key: settingKey },
      });
      let config: Record<string, unknown> = {};
      if (setting?.value) {
        try {
          config = JSON.parse(setting.value);
        } catch {
          config = {};
        }
      }
      return { gear, config };
    }
  );

  app.put(
    "/admin/gears/:key/config",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const { key } = request.params as { key: string };
      const body = request.body as { config?: Record<string, unknown> };
      if (!body || typeof body.config !== "object" || Array.isArray(body.config)) {
        return reply.code(400).send({ error: "config must be an object." });
      }
      const gear = await prisma.gear.findUnique({
        where: { key },
        select: { key: true, name: true, enabled: true },
      });
      if (!gear) {
        return reply.code(404).send({ error: "Gear not found." });
      }
      const settingKey = `gear.${key}`;
      await prisma.systemSetting.upsert({
        where: { key: settingKey },
        create: { key: settingKey, value: JSON.stringify(body.config) },
        update: { value: JSON.stringify(body.config) },
      });
      await logEvent("info", "Gear config updated by admin", {
        adminId: request.user.id,
        gearKey: key,
      });
      return { ok: true };
    }
  );

  app.get(
    "/admin/economy/stats",
    { preHandler: [app.requireAdmin] },
    async () => {
      const totals = await prisma.economyAccount.aggregate({
        _count: { id: true },
        _sum: { balance: true },
        _avg: { balance: true },
      });
      const top = await prisma.economyAccount.findMany({
        orderBy: { balance: "desc" },
        take: 5,
        select: { discordUserId: true, balance: true, guildId: true },
      });
      const recent = await prisma.$queryRawUnsafe(
        `select date_trunc('day', "createdAt") as day, count(*)::int as count
         from "EconomyAccount"
         where "createdAt" > now() - interval '7 days'
         group by day
         order by day asc`
      );

      return {
        totals: {
          accounts: totals._count.id ?? 0,
          totalBalance: totals._sum.balance ?? 0,
          avgBalance: Math.round(totals._avg.balance ?? 0),
        },
        top,
        recent,
      };
    }
  );

  app.post("/admin/users", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const body = request.body as Partial<CreateUserPayload>;
    const username = body.username?.trim() ?? "";
    const password = body.password ?? "";
    const botLimit = Number.isFinite(body.botLimit) ? Number(body.botLimit) : 0;

    const validationError = validateCredentials(username, password);
    if (validationError) {
      return reply.code(400).send({ error: validationError });
    }

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) {
      return reply.code(409).send({ error: "Username already exists." });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role: "user",
        botLimit,
      },
      select: {
        id: true,
        username: true,
        botLimit: true,
        createdAt: true,
      },
    });

    await logEvent("info", "User created", { adminId: request.user.id, userId: user.id });
    return { user };
  });

  app.put("/admin/users/:id", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<CreateUserPayload> & {
      password?: string;
      username?: string;
      botLimit?: number;
    };
    const data: { username?: string; passwordHash?: string; botLimit?: number } = {};

    if (body.username) {
      if (body.username.trim().length < 3) {
        return reply.code(400).send({ error: "Username must be at least 3 characters." });
      }
      data.username = body.username.trim();
    }

    if (typeof body.botLimit === "number") {
      data.botLimit = Number(body.botLimit);
    }

    if (body.password) {
      if (body.password.trim().length < 8) {
        return reply.code(400).send({ error: "Password must be at least 8 characters." });
      }
      data.passwordHash = await hashPassword(body.password);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, botLimit: true, createdAt: true },
    });

    await logEvent("info", "User updated", { adminId: request.user.id, userId: id });
    return { user: updated };
  });

  app.delete("/admin/users/:id", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== "user") {
      return reply.code(404).send({ error: "User not found." });
    }
    await prisma.user.delete({ where: { id } });
    await logEvent("warn", "User deleted", { adminId: request.user.id, userId: id });
    return { ok: true };
  });

  app.post("/admin/automatons", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const body = request.body as {
      ownerId?: string;
      name?: string;
      discordToken?: string;
      guildId?: string;
      channelId?: string;
    };
    const ownerId = body.ownerId ?? "";
    const name = body.name?.trim() ?? "";
    const token = body.discordToken ?? "";

    if (!ownerId || !name || !token) {
      return reply.code(400).send({ error: "Owner, name, and token are required." });
    }

    const owner = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner || owner.role !== "user") {
      return reply.code(404).send({ error: "Owner not found." });
    }

    const tokenEncrypted = encryptToken(token);
    const automaton = await prisma.automaton.create({
      data: {
        ownerId,
        name,
        tokenCipher: tokenEncrypted.cipher,
        tokenIv: tokenEncrypted.iv,
        tokenTag: tokenEncrypted.tag,
        guildId: body.guildId ?? null,
        channelId: body.channelId ?? null,
      },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        owner: { select: { id: true, username: true } },
      },
    });

    await logEvent("info", "Automaton created", { adminId: request.user.id, automatonId: automaton.id });
    return { automaton };
  });

  app.post("/admin/automatons/:id/start", { preHandler: [app.requireAdmin] }, async (request) => {
    const { id } = request.params as { id: string };
    const result = await startAutomaton(id);
    await logEvent("info", "Automaton start issued", { adminId: request.user.id, automatonId: id });
    return result;
  });

  app.post("/admin/automatons/:id/stop", { preHandler: [app.requireAdmin] }, async (request) => {
    const { id } = request.params as { id: string };
    const result = await stopAutomaton(id);
    await logEvent("info", "Automaton stop issued", { adminId: request.user.id, automatonId: id });
    return result;
  });

  app.delete("/admin/automatons/:id", { preHandler: [app.requireAdmin] }, async (request) => {
    const { id } = request.params as { id: string };
    await stopAutomaton(id);
    await prisma.automaton.delete({ where: { id } });
    await logEvent("warn", "Automaton deleted", { adminId: request.user.id, automatonId: id });
    return { ok: true };
  });
}
