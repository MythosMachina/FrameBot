import { parentPort, workerData } from "node:worker_threads";
import { Client, GatewayIntentBits, Partials } from "discord.js";

const { automatonId, token, guildId, gears } = workerData;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const loadedGears = [];
let shuttingDown = false;
let shutdownPromise = null;

const shutdown = async () => {
  if (shuttingDown) return shutdownPromise;
  shuttingDown = true;
  shutdownPromise = (async () => {
    for (const gearModule of loadedGears) {
      if (gearModule?.shutdown) {
        try {
          await gearModule.shutdown();
        } catch (err) {
          parentPort?.postMessage({ type: "gear_error", automatonId, error: String(err) });
        }
      }
    }
    try {
      await client.destroy();
    } catch (err) {
      parentPort?.postMessage({ type: "error", automatonId, error: String(err) });
    }
  })();
  return shutdownPromise;
};

parentPort?.on("message", (message) => {
  if (message?.type === "shutdown") {
    shutdown().then(() => {
      parentPort?.postMessage({ type: "shutdown_complete", automatonId });
      process.exit(0);
    });
  }
});

const ensureCommand = async (command) => {
  if (guildId) {
    const guild = await client.guilds.fetch(guildId);
    const existing = await guild.commands.fetch();
    const found = existing.find((cmd) => cmd.name === command.name);
    if (found) {
      await found.edit(command);
    } else {
      await guild.commands.create(command);
    }
    return;
  }
  const appCommands = await client.application?.commands.fetch();
  const found = appCommands?.find((cmd) => cmd.name === command.name);
  if (found) {
    await found.edit(command);
  } else {
    await client.application?.commands.create(command);
  }
};

client.once("ready", async () => {
  parentPort?.postMessage({ type: "ready", automatonId });
  try {
    await ensureCommand({
      name: "frameforgetest",
      description: "Check if the automaton is ready.",
    });
  } catch (err) {
    parentPort?.postMessage({ type: "error", automatonId, error: String(err) });
  }
  if (guildId) {
    try {
      const guild = await client.guilds.fetch(guildId);
      await guild.members.fetch();
      parentPort?.postMessage({ type: "members_synced", automatonId, count: guild.memberCount });
    } catch (err) {
      parentPort?.postMessage({ type: "error", automatonId, error: String(err) });
    }
  }
});

client.on("error", (err) => {
  parentPort?.postMessage({ type: "error", automatonId, error: String(err) });
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "frameforgetest") return;
  await interaction.reply({ content: "FrameBot automaton ready.", ephemeral: false });
});

(async () => {
  if (Array.isArray(gears)) {
    for (const entry of gears) {
      try {
        const mod = await import(entry);
        const gearModule = mod?.default ?? mod;
        if (gearModule?.init) {
          await gearModule.init({ automatonId, guildId, client });
        }
        loadedGears.push(gearModule);
        parentPort?.postMessage({
          type: "gear_loaded",
          automatonId,
          entry,
          key: gearModule?.manifest?.key,
        });
      } catch (err) {
        parentPort?.postMessage({ type: "gear_error", automatonId, entry, error: String(err) });
      }
    }
  }
})();

(async () => {
  try {
    await client.login(token);
  } catch (err) {
    parentPort?.postMessage({ type: "error", automatonId, error: String(err) });
  }
})();

const onSignal = () => {
  shutdown().then(() => process.exit(0));
};

process.on("SIGTERM", onSignal);
process.on("SIGINT", onSignal);
