import { Worker } from "node:worker_threads";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { prisma } from "../lib/prisma";
import { decryptToken } from "../lib/crypto";
import { logEvent } from "../lib/logs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workers = new Map<string, Worker>();

export async function startAutomaton(automatonId: string) {
  if (workers.has(automatonId)) {
    await prisma.automaton.update({
      where: { id: automatonId },
      data: { desiredRunning: true },
    });
    return { alreadyRunning: true };
  }

  const automaton = await prisma.automaton.findUnique({
    where: { id: automatonId },
    include: {
      gears: {
        where: { enabled: true },
        select: { gear: { select: { modulePath: true } } },
      },
    },
  });
  if (!automaton) {
    throw new Error("Automaton not found.");
  }

  const token = decryptToken(automaton.tokenCipher, automaton.tokenIv, automaton.tokenTag);
  const gearEntries = automaton.gears.map((g) => toGearUrl(g.gear.modulePath));

  const workerPath = path.join(__dirname, "automatonWorker.mjs");
  const worker = new Worker(workerPath, {
    workerData: {
      automatonId,
      token,
      guildId: automaton.guildId,
      gears: gearEntries,
    },
  });

  worker.on("message", async (message) => {
    if (message?.type === "ready") {
      await prisma.automaton.update({
        where: { id: automatonId },
        data: { status: "running" },
      });
      await logEvent("info", "Automaton ready", { automatonId });
    }
    if (message?.type === "members_synced") {
      await logEvent("info", "Automaton members synced", {
        automatonId,
        count: message.count,
      });
    }
    if (message?.type === "gear_loaded") {
      await logEvent("info", "Gear loaded", {
        automatonId,
        entry: message.entry,
      });
    }
    if (message?.type === "gear_error") {
      await logEvent("warn", "Gear load failed", {
        automatonId,
        entry: message.entry,
        error: message.error,
      });
    }
    if (message?.type === "error") {
      await prisma.automaton.update({
        where: { id: automatonId },
        data: { status: "error" },
      });
      await logEvent("error", "Automaton error", {
        automatonId,
        error: message.error,
      });
    }
  });

  worker.on("exit", async () => {
    workers.delete(automatonId);
    await prisma.automaton.update({
      where: { id: automatonId },
      data: { status: "stopped" },
    });
    await logEvent("info", "Automaton stopped", { automatonId });
  });

  workers.set(automatonId, worker);
  await prisma.automaton.update({
    where: { id: automatonId },
    data: { status: "running", desiredRunning: true },
  });
  await logEvent("info", "Automaton start requested", { automatonId });

  return { started: true };
}

export async function restartAutomaton(automatonId: string) {
  if (!workers.has(automatonId)) {
    return { skipped: true };
  }
  await stopAutomaton(automatonId);
  return startAutomaton(automatonId);
}

function toGearUrl(modulePath: string) {
  if (modulePath.startsWith("file:")) {
    return modulePath;
  }
  const resolved = path.isAbsolute(modulePath)
    ? modulePath
    : path.join(process.cwd(), modulePath);
  return pathToFileURL(resolved).href;
}

export async function stopAutomaton(automatonId: string) {
  const worker = workers.get(automatonId);
  if (!worker) {
    await prisma.automaton.update({
      where: { id: automatonId },
      data: { status: "stopped", desiredRunning: false },
    });
    await logEvent("info", "Automaton marked stopped (no worker)", { automatonId });
    return { alreadyStopped: true };
  }
  try {
    worker.postMessage({ type: "shutdown" });
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        resolve();
      }, 5000);
      worker.once("message", (message) => {
        if (message?.type === "shutdown_complete") {
          clearTimeout(timer);
          resolve();
        }
      });
    });
  } finally {
    await worker.terminate();
    workers.delete(automatonId);
  }
  await prisma.automaton.update({
    where: { id: automatonId },
    data: { status: "stopped", desiredRunning: false },
  });
  await logEvent("info", "Automaton stopped by request", { automatonId });
  return { stopped: true };
}

export function isAutomatonRunning(automatonId: string) {
  return workers.has(automatonId);
}

export async function resumeAutomatons() {
  const pending = await prisma.automaton.findMany({
    where: { desiredRunning: true },
    select: { id: true },
  });
  for (const automaton of pending) {
    try {
      await startAutomaton(automaton.id);
    } catch (err) {
      await prisma.automaton.update({
        where: { id: automaton.id },
        data: { status: "error" },
      });
      await logEvent("error", "Failed to resume automaton", {
        automatonId: automaton.id,
        error: String(err),
      });
    }
  }
}
