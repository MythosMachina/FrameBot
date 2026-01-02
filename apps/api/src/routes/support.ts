import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { logEvent } from "../lib/logs";

export async function supportRoutes(app: FastifyInstance) {
  app.get("/user/tickets", { preHandler: [app.requireUser] }, async (request) => {
    const tickets = await prisma.ticket.findMany({
      where: { createdById: request.user.id },
      orderBy: { createdAt: "desc" },
    });
    return { tickets };
  });

  app.post("/user/tickets", { preHandler: [app.requireUser] }, async (request, reply) => {
    const body = request.body as { title?: string; description?: string; priority?: string };
    const title = body.title?.trim() ?? "";
    const description = body.description?.trim() ?? "";

    if (!title || !description) {
      return reply.code(400).send({ error: "Title and description are required." });
    }

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        priority: (body.priority as any) ?? "normal",
        createdById: request.user.id,
      },
    });

    await logEvent("info", "Support ticket created", {
      userId: request.user.id,
      ticketId: ticket.id,
    });

    return { ticket };
  });

  app.put("/user/tickets/:id", { preHandler: [app.requireUser] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      title?: string;
      description?: string;
      priority?: "low" | "normal" | "high" | "urgent";
    };
    const ticket = await prisma.ticket.findFirst({
      where: { id, createdById: request.user.id },
    });
    if (!ticket) {
      return reply.code(404).send({ error: "Not found." });
    }
    if (ticket.status === "closed" || ticket.status === "resolved") {
      return reply.code(403).send({ error: "Ticket can no longer be edited." });
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        title: body.title?.trim() || ticket.title,
        description: body.description?.trim() || ticket.description,
        priority: body.priority ?? ticket.priority,
      },
    });

    await logEvent("info", "Support ticket updated", {
      userId: request.user.id,
      ticketId: updated.id,
    });

    return { ticket: updated };
  });

  app.post(
    "/user/tickets/:id/resolve",
    { preHandler: [app.requireUser] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const ticket = await prisma.ticket.findFirst({
        where: { id, createdById: request.user.id },
      });
      if (!ticket) {
        return reply.code(404).send({ error: "Not found." });
      }
      if (ticket.status === "closed" || ticket.status === "resolved") {
        return reply.code(403).send({ error: "Ticket already resolved or closed." });
      }
      const updated = await prisma.ticket.update({
        where: { id },
        data: { status: "resolved" },
      });
      await logEvent("info", "Support ticket marked resolved by user", {
        userId: request.user.id,
        ticketId: updated.id,
      });
      return { ticket: updated };
    }
  );
}
