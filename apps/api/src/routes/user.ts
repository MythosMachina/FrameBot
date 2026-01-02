import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { encryptToken } from "../lib/crypto";
import { logEvent } from "../lib/logs";
import { startAutomaton, stopAutomaton } from "../runtime/automatonManager";
import {
  getBotProfile,
  listGuildChannels,
  listGuilds,
  postChannelMessage,
  updateBotProfile,
} from "../lib/discord";

export async function userRoutes(app: FastifyInstance) {
  app.get("/user/automatons", { preHandler: [app.requireUser] }, async (request) => {
    const automatons = await prisma.automaton.findMany({
      where: { ownerId: request.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        guildId: true,
        channelId: true,
      },
    });
    return { automatons };
  });

  app.post("/user/automatons", { preHandler: [app.requireUser] }, async (request, reply) => {
    const body = request.body as {
      name?: string;
      discordToken?: string;
      guildId?: string;
      channelId?: string;
    };
    const name = body.name?.trim() ?? "";
    const token = body.discordToken ?? "";

    if (!name || !token) {
      return reply.code(400).send({ error: "Name and token are required." });
    }

    const count = await prisma.automaton.count({ where: { ownerId: request.user.id } });
    if (request.user.botLimit > 0 && count >= request.user.botLimit) {
      return reply.code(403).send({ error: "Bot limit reached." });
    }

    const encrypted = encryptToken(token);
    const automaton = await prisma.automaton.create({
      data: {
        ownerId: request.user.id,
        name,
        tokenCipher: encrypted.cipher,
        tokenIv: encrypted.iv,
        tokenTag: encrypted.tag,
        guildId: body.guildId ?? null,
        channelId: body.channelId ?? null,
      },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        guildId: true,
        channelId: true,
      },
    });

    await logEvent("info", "Automaton created by user", {
      userId: request.user.id,
      automatonId: automaton.id,
    });
    return { automaton };
  });

  app.post("/user/automatons/:id/start", { preHandler: [app.requireUser] }, async (request) => {
    const { id } = request.params as { id: string };
    const owned = await prisma.automaton.findFirst({
      where: { id, ownerId: request.user.id },
      select: { id: true },
    });
    if (!owned) {
      return { error: "Not found." };
    }
    const result = await startAutomaton(id);
    await logEvent("info", "Automaton started by user", { userId: request.user.id, automatonId: id });
    return result;
  });

  app.post("/user/automatons/:id/stop", { preHandler: [app.requireUser] }, async (request) => {
    const { id } = request.params as { id: string };
    const owned = await prisma.automaton.findFirst({
      where: { id, ownerId: request.user.id },
      select: { id: true },
    });
    if (!owned) {
      return { error: "Not found." };
    }
    const result = await stopAutomaton(id);
    await logEvent("info", "Automaton stopped by user", { userId: request.user.id, automatonId: id });
    return result;
  });

  app.delete("/user/automatons/:id", { preHandler: [app.requireUser] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const owned = await prisma.automaton.findFirst({
      where: { id, ownerId: request.user.id },
      select: { id: true },
    });
    if (!owned) {
      return reply.code(404).send({ error: "Not found." });
    }
    await stopAutomaton(id);
    await prisma.automaton.delete({ where: { id } });
    await logEvent("warn", "Automaton deleted by user", { userId: request.user.id, automatonId: id });
    return { ok: true };
  });

  app.get("/user/workshop", { preHandler: [app.requireUser] }, async () => {
    const gears = await prisma.gear.findMany({
      orderBy: { category: "asc" },
      select: { id: true, key: true, name: true, category: true, description: true, enabled: true },
    });
    return { gears };
  });

  app.get("/user/automatons/:id/gears", { preHandler: [app.requireUser] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const owned = await prisma.automaton.findFirst({
      where: { id, ownerId: request.user.id },
      select: { id: true },
    });
    if (!owned) {
      return reply.code(404).send({ error: "Not found." });
    }
    const assignments = await prisma.automatonGearAssignment.findMany({
      where: { automatonId: id },
      select: { gearId: true, enabled: true },
    });
    return { assignments };
  });

  app.get(
    "/user/automatons/:id/gears/:gearKey/config",
    { preHandler: [app.requireUser] },
    async (request, reply) => {
      const { id, gearKey } = request.params as { id: string; gearKey: string };
      const owned = await prisma.automaton.findFirst({
        where: { id, ownerId: request.user.id },
        select: { id: true },
      });
      if (!owned) {
        return reply.code(404).send({ error: "Not found." });
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
    "/user/automatons/:id/gears/:gearKey/config",
    { preHandler: [app.requireUser] },
    async (request, reply) => {
      const { id, gearKey } = request.params as { id: string; gearKey: string };
      const body = request.body as { config?: Record<string, unknown> };
      if (!body || typeof body.config !== "object" || Array.isArray(body.config)) {
        return reply.code(400).send({ error: "config must be an object." });
      }

      const owned = await prisma.automaton.findFirst({
        where: { id, ownerId: request.user.id },
        select: { id: true },
      });
      if (!owned) {
        return reply.code(404).send({ error: "Not found." });
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
      await logEvent("info", "Gear config updated by user", {
        userId: request.user.id,
        automatonId: id,
        gearKey,
      });
      return { ok: true };
    }
  );

  app.post("/user/automatons/:id/gears", { preHandler: [app.requireUser] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { gearIds?: string[] };
    const gearIds = Array.isArray(body.gearIds) ? body.gearIds : [];

    const owned = await prisma.automaton.findFirst({
      where: { id, ownerId: request.user.id },
      select: { id: true },
    });
    if (!owned) {
      return reply.code(404).send({ error: "Not found." });
    }

    await prisma.automatonGearAssignment.deleteMany({ where: { automatonId: id } });
    for (const gearId of gearIds) {
      await prisma.automatonGearAssignment.create({
        data: {
          automatonId: id,
          gearId,
          enabled: true,
          configJson: {},
        },
      });
    }

    await logEvent("info", "Gears updated by user", { userId: request.user.id, automatonId: id });
    return { ok: true };
  });

  app.get(
    "/user/automatons/:id/news/posts",
    { preHandler: [app.requireUser] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const owned = await prisma.automaton.findFirst({
        where: { id, ownerId: request.user.id },
        select: { id: true },
      });
      if (!owned) {
        return reply.code(404).send({ error: "Not found." });
      }
      const posts = await prisma.newsPost.findMany({
        where: { automatonId: id },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return { posts };
    }
  );

  app.post(
    "/user/automatons/:id/news/posts",
    { preHandler: [app.requireUser] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { title?: string; body?: string; imageUrl?: string };
      const title = body.title?.trim() ?? "";
      const content = body.body?.trim() ?? "";
      if (!title || !content) {
        return reply.code(400).send({ error: "Title and body are required." });
      }

      const owned = await prisma.automaton.findFirst({
        where: { id, ownerId: request.user.id },
        select: { id: true },
      });
      if (!owned) {
        return reply.code(404).send({ error: "Not found." });
      }

      const gear = await prisma.gear.findUnique({
        where: { key: "news.news" },
        select: { id: true, enabled: true },
      });
      if (!gear || !gear.enabled) {
        return reply.code(400).send({ error: "News gear not enabled." });
      }

      const assignment = await prisma.automatonGearAssignment.findUnique({
        where: { automatonId_gearId: { automatonId: id, gearId: gear.id } },
        select: { configJson: true },
      });
      if (!assignment) {
        return reply.code(400).send({ error: "News gear not assigned." });
      }
      const config = assignment.configJson as Record<string, unknown>;
      const channelId = String(config.newsChannelId ?? "");
      if (!channelId) {
        return reply.code(400).send({ error: "newsChannelId is required." });
      }
      const colorRaw = String(config.embedColor ?? "#b08a4b").replace("#", "");
      const parsedColor = parseInt(colorRaw, 16);
      const embedColor = Number.isFinite(parsedColor) ? parsedColor : 0xb08a4b;
      const authorName = String(config.authorName ?? "").trim();
      const footerText = String(config.footerText ?? "").trim();

      const embed: Record<string, unknown> = {
        title,
        description: content,
        color: embedColor,
      };
      if (body.imageUrl) {
        embed.image = { url: body.imageUrl };
      }
      if (authorName) {
        embed.author = { name: authorName };
      }
      if (footerText) {
        embed.footer = { text: footerText };
      }

      const sent = await postChannelMessage(id, channelId, { embeds: [embed] });
      const messageId = (sent as { id?: string })?.id ?? null;

      const post = await prisma.newsPost.create({
        data: {
          automatonId: id,
          authorUserId: request.user.id,
          channelId,
          title,
          body: content,
          imageUrl: body.imageUrl ?? null,
          embedColor: `#${colorRaw}`,
          source: "panel",
          discordMessageId: messageId,
        },
      });

      await logEvent("info", "News post published", {
        userId: request.user.id,
        automatonId: id,
        newsPostId: post.id,
      });

      return { post };
    }
  );

  app.get(
    "/user/automatons/:id/discord/guilds",
    { preHandler: [app.requireUser] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const owned = await prisma.automaton.findFirst({
        where: { id, ownerId: request.user.id },
        select: { id: true },
      });
      if (!owned) {
        return reply.code(404).send({ error: "Not found." });
      }
      try {
        const guilds = await listGuilds(id);
        return { guilds };
      } catch (err) {
        return reply.code(400).send({ error: String(err) });
      }
    }
  );

  app.get(
    "/user/automatons/:id/discord/channels",
    { preHandler: [app.requireUser] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const query = request.query as { guildId?: string };
      const guildId = query.guildId ?? "";
      if (!guildId) {
        return reply.code(400).send({ error: "guildId is required." });
      }
      const owned = await prisma.automaton.findFirst({
        where: { id, ownerId: request.user.id },
        select: { id: true },
      });
      if (!owned) {
        return reply.code(404).send({ error: "Not found." });
      }
      try {
        const channels = await listGuildChannels(id, guildId);
        return { channels };
      } catch (err) {
        return reply.code(400).send({ error: String(err) });
      }
    }
  );

  app.put(
    "/user/automatons/:id/config",
    { preHandler: [app.requireUser] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { guildId?: string; channelId?: string };
      const owned = await prisma.automaton.findFirst({
        where: { id, ownerId: request.user.id },
        select: { id: true },
      });
      if (!owned) {
        return reply.code(404).send({ error: "Not found." });
      }
      await prisma.automaton.update({
        where: { id },
        data: { guildId: body.guildId ?? null, channelId: body.channelId ?? null },
      });
      await logEvent("info", "Automaton config updated by user", {
        userId: request.user.id,
        automatonId: id,
        guildId: body.guildId ?? null,
        channelId: body.channelId ?? null,
      });
      return { ok: true };
    }
  );

  app.get(
    "/user/automatons/:id/discord/profile",
    { preHandler: [app.requireUser] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const owned = await prisma.automaton.findFirst({
        where: { id, ownerId: request.user.id },
        select: { id: true },
      });
      if (!owned) {
        return reply.code(404).send({ error: "Not found." });
      }
      const profile = await getBotProfile(id);
      return { profile };
    }
  );

  app.patch(
    "/user/automatons/:id/discord/profile",
    { preHandler: [app.requireUser], bodyLimit: 5 * 1024 * 1024 },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { username?: string; avatar?: string | null };
      const owned = await prisma.automaton.findFirst({
        where: { id, ownerId: request.user.id },
        select: { id: true },
      });
      if (!owned) {
        return reply.code(404).send({ error: "Not found." });
      }
      try {
        const updated = await updateBotProfile(id, {
          username: body.username,
          avatar: body.avatar,
        });
        await logEvent("info", "Bot profile updated by user", {
          userId: request.user.id,
          automatonId: id,
        });
        return { profile: updated };
      } catch (err) {
        return reply.code(400).send({ error: String(err) });
      }
    }
  );
}
