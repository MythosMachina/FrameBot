import { PrismaClient } from "@prisma/client";
import { PermissionsBitField } from "discord.js";

const prisma = new PrismaClient();
const DEFAULT_DM =
  "Your message was removed because it contained a blocked word. Please review the server rules.";
const DEFAULT_MATCH_MODE = "contains";

export const manifest = {
  key: "administration.admin",
  name: "Admin",
  version: "0.1.0",
};

let cleanup = null;

function parseLines(raw) {
  return String(raw ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function init(context) {
  const { automatonId, guildId, client } = context;
  let matchMode = DEFAULT_MATCH_MODE;
  let keywordEntries = [];
  let ignoreRoleIds = new Set();
  let ignoreUserIds = new Set();
  let exemptMods = true;
  let assignmentId = null;
  let gearEnabled = false;
  let refreshTimer = null;

  const loadConfig = async () => {
    const gear = await prisma.gear.findUnique({
      where: { key: "administration.admin" },
      select: { id: true, enabled: true },
    });
    if (!gear || !gear.enabled) {
      keywordEntries = [];
      assignmentId = null;
      gearEnabled = false;
      return;
    }
    const assignment = await prisma.automatonGearAssignment.findUnique({
      where: { automatonId_gearId: { automatonId, gearId: gear.id } },
      select: { id: true, enabled: true, configJson: true },
    });
    if (!assignment || !assignment.enabled) {
      keywordEntries = [];
      assignmentId = null;
      gearEnabled = false;
      return;
    }
    const config = assignment.configJson ?? {};
    matchMode = String(config.badwordMatchMode ?? DEFAULT_MATCH_MODE);
    keywordEntries = parseLines(config.badwordKeywords);
    ignoreRoleIds = new Set(parseLines(config.badwordIgnoreRoleIds));
    ignoreUserIds = new Set(parseLines(config.badwordIgnoreUserIds));
    exemptMods =
      typeof config.badwordExemptMods === "boolean" ? config.badwordExemptMods : true;
    assignmentId = assignment.id;
    gearEnabled = true;
  };

  await loadConfig();
  refreshTimer = setInterval(loadConfig, 60_000);

  const shouldSkipMember = (member) => {
    if (!member) return false;
    if (exemptMods) {
      const perms = member.permissions;
      if (
        perms?.has(PermissionsBitField.Flags.ManageMessages) ||
        perms?.has(PermissionsBitField.Flags.Administrator)
      ) {
        return true;
      }
    }
    if (ignoreRoleIds.size > 0) {
      const roles = member.roles?.cache;
      if (roles && roles.some((role) => ignoreRoleIds.has(role.id))) {
        return true;
      }
    }
    return false;
  };

  const matchKeyword = (content) => {
    if (!content || keywordEntries.length === 0) return null;
    const mode = matchMode || DEFAULT_MATCH_MODE;
    if (mode === "regex") {
      for (const raw of keywordEntries) {
        try {
          const re = new RegExp(raw, "i");
          if (re.test(content)) return raw;
        } catch {
          // Invalid regex; skip.
        }
      }
      return null;
    }
    if (mode === "word") {
      for (const raw of keywordEntries) {
        const re = new RegExp(`\\b${escapeRegExp(raw)}\\b`, "i");
        if (re.test(content)) return raw;
      }
      return null;
    }
    const lower = content.toLowerCase();
    for (const raw of keywordEntries) {
      if (lower.includes(raw.toLowerCase())) return raw;
    }
    return null;
  };

  const updateKeywordList = async (nextKeywords) => {
    if (!assignmentId) {
      return { ok: false, error: "Gear is not assigned." };
    }
    const assignment = await prisma.automatonGearAssignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, configJson: true },
    });
    if (!assignment) {
      return { ok: false, error: "Gear assignment not found." };
    }
    const config = assignment.configJson ?? {};
    await prisma.automatonGearAssignment.update({
      where: { id: assignment.id },
      data: { configJson: { ...config, badwordKeywords: nextKeywords.join("\n") } },
    });
    await loadConfig();
    return { ok: true };
  };

  const handleMessage = async (message) => {
    if (!message.guild) return;
    if (guildId && message.guild.id !== guildId) return;
    if (!message.content) return;
    if (message.author?.bot) return;
    if (!gearEnabled) return;
    if (ignoreUserIds.has(message.author.id)) return;
    if (shouldSkipMember(message.member)) return;

    const matched = matchKeyword(message.content);
    if (!matched) return;

    try {
      await message.delete();
    } catch {}

    const warnText = DEFAULT_DM;
    try {
      await message.author.send(warnText);
    } catch {}

    await prisma.badWordCount.upsert({
      where: {
        automatonId_discordUserId: { automatonId, discordUserId: message.author.id },
      },
      create: {
        automatonId,
        discordUserId: message.author.id,
        count: 1,
        lastMatchedAt: new Date(),
      },
      update: {
        count: { increment: 1 },
        lastMatchedAt: new Date(),
      },
    });

    await prisma.logEntry.create({
      data: {
        level: "warn",
        message: "Badword filtered",
        context: {
          automatonId,
          discordUserId: message.author.id,
          keyword: matched,
          channelId: message.channelId,
          messageId: message.id,
        },
      },
    });
  };

  const handleBadwordCount = async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "badwordcount") return;
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
      return;
    }

    const perms = interaction.memberPermissions;
    if (
      !perms?.has(PermissionsBitField.Flags.ManageMessages) &&
      !perms?.has(PermissionsBitField.Flags.Administrator)
    ) {
      await interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "user") {
      const user = interaction.options.getUser("user", true);
      const entry = await prisma.badWordCount.findUnique({
        where: {
          automatonId_discordUserId: { automatonId, discordUserId: user.id },
        },
      });
      const count = entry?.count ?? 0;
      await interaction.reply({
        content: `<@${user.id}> badword count: ${count}.`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "top") {
      const limitRaw = interaction.options.getInteger("limit") ?? 10;
      const limit = Math.min(Math.max(limitRaw, 1), 25);
      const rows = await prisma.badWordCount.findMany({
        where: { automatonId },
        orderBy: { count: "desc" },
        take: limit,
      });
      if (rows.length === 0) {
        await interaction.reply({
          content: "No badword entries yet.",
          ephemeral: true,
        });
        return;
      }
      const lines = rows.map(
        (row, index) => `${index + 1}. <@${row.discordUserId}> — ${row.count}`
      );
      await interaction.reply({
        content: `Badword leaderboard:\n${lines.join("\n")}`,
        ephemeral: true,
      });
    }
  };

  const handleBadwords = async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "badwords") return;
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
      return;
    }

    const perms = interaction.memberPermissions;
    if (
      !perms?.has(PermissionsBitField.Flags.ManageMessages) &&
      !perms?.has(PermissionsBitField.Flags.Administrator)
    ) {
      await interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true,
      });
      return;
    }

    if (!gearEnabled) {
      await interaction.reply({
        content: "Admin gear is not enabled for this automaton.",
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "list") {
      if (keywordEntries.length === 0) {
        await interaction.reply({
          content: "No badword keywords configured.",
          ephemeral: true,
        });
        return;
      }
      const preview = keywordEntries.slice(0, 30);
      const lines = preview.map((value, index) => `${index + 1}. ${value}`);
      const suffix =
        keywordEntries.length > preview.length
          ? `\n… and ${keywordEntries.length - preview.length} more.`
          : "";
      await interaction.reply({
        content: `Badword keywords:\n${lines.join("\n")}${suffix}`,
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "clear") {
      const result = await updateKeywordList([]);
      if (!result.ok) {
        await interaction.reply({ content: result.error, ephemeral: true });
        return;
      }
      await interaction.reply({
        content: "Badword list cleared.",
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "add" || subcommand === "remove") {
      const keyword = String(interaction.options.getString("keyword", true)).trim();
      if (!keyword) {
        await interaction.reply({
          content: "Keyword cannot be empty.",
          ephemeral: true,
        });
        return;
      }
      let next = [...keywordEntries];
      if (subcommand === "add") {
        if (!next.includes(keyword)) {
          next.push(keyword);
        }
      } else {
        next = next.filter((entry) => entry !== keyword);
      }
      const result = await updateKeywordList(next);
      if (!result.ok) {
        await interaction.reply({ content: result.error, ephemeral: true });
        return;
      }
      await interaction.reply({
        content:
          subcommand === "add"
            ? `Added keyword: ${keyword}`
            : `Removed keyword: ${keyword}`,
        ephemeral: true,
      });
    }
  };

  client.on("messageCreate", handleMessage);
  client.on("interactionCreate", handleBadwordCount);
  client.on("interactionCreate", handleBadwords);

  cleanup = async () => {
    if (refreshTimer) clearInterval(refreshTimer);
    client.off("messageCreate", handleMessage);
    client.off("interactionCreate", handleBadwordCount);
    client.off("interactionCreate", handleBadwords);
    await prisma.$disconnect();
  };
}

export async function shutdown() {
  if (!cleanup) return;
  await cleanup();
  cleanup = null;
}
