import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { logEvent } from "../lib/logs";

const CATEGORIES = ["branding", "limits", "policies"] as const;

type Category = (typeof CATEGORIES)[number];

function keyFor(category: Category, name: string) {
  return `${category}.${name}`;
}

export async function systemRoutes(app: FastifyInstance) {
  app.get("/admin/system/:category", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { category } = request.params as { category: Category };
    if (!CATEGORIES.includes(category)) {
      return reply.code(404).send({ error: "Category not found." });
    }

    const settings = await prisma.systemSetting.findMany({
      where: { key: { startsWith: `${category}.` } },
    });

    const values: Record<string, string> = {};
    for (const setting of settings) {
      const name = setting.key.replace(`${category}.`, "");
      values[name] = setting.value;
    }

    return { category, values };
  });

  app.put("/admin/system/:category", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { category } = request.params as { category: Category };
    if (!CATEGORIES.includes(category)) {
      return reply.code(404).send({ error: "Category not found." });
    }

    const body = request.body as { values?: Record<string, string> };
    const values = body.values ?? {};

    const updates = Object.entries(values);
    for (const [name, value] of updates) {
      await prisma.systemSetting.upsert({
        where: { key: keyFor(category, name) },
        create: { key: keyFor(category, name), value },
        update: { value },
      });
    }

    await logEvent("info", "System settings updated", {
      adminId: request.user.id,
      category,
      keys: updates.map(([name]) => name),
    });

    return { ok: true };
  });
}
