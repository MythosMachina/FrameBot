import { prisma } from "./prisma";

export async function logEvent(
  level: "info" | "warn" | "error",
  message: string,
  context?: Record<string, unknown>
) {
  await prisma.logEntry.create({
    data: {
      level,
      message,
      context: context ? context : undefined,
    },
  });
}
