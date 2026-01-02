import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { postChannelMessage } from "../lib/discord";

export async function webhookRoutes(app: FastifyInstance) {
  app.post("/webhooks/news/:automatonId/:token", async (request, reply) => {
    const { automatonId, token } = request.params as { automatonId: string; token: string };
    const body = request.body as { title?: string; body?: string; imageUrl?: string };
    const title = body.title?.trim() ?? "";
    const content = body.body?.trim() ?? "";
    if (!title || !content) {
      return reply.code(400).send({ error: "Title and body are required." });
    }

    const gear = await prisma.gear.findUnique({
      where: { key: "news.news" },
      select: { id: true, enabled: true },
    });
    if (!gear || !gear.enabled) {
      return reply.code(400).send({ error: "News gear not enabled." });
    }

    const assignment = await prisma.automatonGearAssignment.findUnique({
      where: { automatonId_gearId: { automatonId, gearId: gear.id } },
      select: { configJson: true },
    });
    if (!assignment) {
      return reply.code(404).send({ error: "Automaton not configured for news." });
    }

    const config = assignment.configJson as Record<string, unknown>;
    const configToken = String(config.webhookToken ?? "");
    if (!configToken || configToken !== token) {
      return reply.code(401).send({ error: "Invalid token." });
    }
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

    const sent = await postChannelMessage(automatonId, channelId, { embeds: [embed] });
    const messageId = (sent as { id?: string })?.id ?? null;

    const post = await prisma.newsPost.create({
      data: {
        automatonId,
        authorUserId: null,
        channelId,
        title,
        body: content,
        imageUrl: body.imageUrl ?? null,
        embedColor: `#${colorRaw}`,
        source: "webhook",
        discordMessageId: messageId,
      },
    });

    return { post };
  });
}
