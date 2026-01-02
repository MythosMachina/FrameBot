import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { logEvent } from "../lib/logs";

export async function ticketRoutes(app: FastifyInstance) {
  app.get("/admin/tickets", { preHandler: [app.requireAdmin] }, async () => {
    const tickets = await prisma.ticket.findMany({
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { id: true, username: true } } },
    });
    return { tickets };
  });

  app.post("/admin/tickets", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const body = request.body as {
      title?: string;
      description?: string;
      priority?: "low" | "normal" | "high" | "urgent";
    };
    const title = body.title?.trim() ?? "";
    const description = body.description?.trim() ?? "";

    if (!title || !description) {
      return reply.code(400).send({ error: "Title and description are required." });
    }

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        priority: body.priority ?? "normal",
        createdById: request.user.id,
      },
      include: { createdBy: { select: { id: true, username: true } } },
    });

    await logEvent("info", "Ticket created", { adminId: request.user.id, ticketId: ticket.id });
    return { ticket };
  });

  app.put("/admin/tickets/:id", { preHandler: [app.requireAdmin] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      status?: "open" | "in_progress" | "resolved" | "closed";
      priority?: "low" | "normal" | "high" | "urgent";
      category?: string;
      adminReply?: string;
    };

    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        status: body.status,
        priority: body.priority,
        category: body.category?.trim() || null,
        adminReply: body.adminReply?.trim() || null,
      },
      include: { createdBy: { select: { id: true, username: true } } },
    });

    await logEvent("info", "Ticket updated", { adminId: request.user.id, ticketId: ticket.id });
    return { ticket };
  });
}
