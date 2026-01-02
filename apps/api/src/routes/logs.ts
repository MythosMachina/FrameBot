import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";

export async function logRoutes(app: FastifyInstance) {
  app.get("/admin/logs", { preHandler: [app.requireAdmin] }, async (request) => {
    const query = request.query as { level?: string; q?: string };
    const level = query.level ?? undefined;
    const q = query.q?.trim();

    const logs = await prisma.logEntry.findMany({
      where: {
        level: level as any,
        message: q ? { contains: q, mode: "insensitive" } : undefined,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return { logs };
  });
}
