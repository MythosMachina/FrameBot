import { ApplicationCommandOptionType, EmbedBuilder, PermissionsBitField } from "discord.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const manifest = {
  key: "economy.economy",
  name: "Economy",
  version: "0.1.0",
};

const DEFAULTS = {
  currencyName: "Credits",
  startingBalance: 100,
  dailyReward: 25,
  messageRewardAmount: 5,
  messageRewardEvery: 20,
  messageRewardCooldownMinutes: 60,
  chatBonusAmount: 3,
  chatBonusCooldownHours: 24,
  taskRewardAmount: 10,
  taskIntervalMinutes: 120,
  taskWindowMinutes: 5,
  taskChannelId: "",
  reminderChannelId: "",
  reminderIntervalMinutes: 180,
};

const commandDef = [
  {
    name: "balance",
    description: "Check your balance.",
  },
  {
    name: "daily",
    description: "Claim your daily reward.",
  },
  {
    name: "leaderboard",
    description: "Show the top balances.",
  },
  {
    name: "give",
    description: "Send currency to a member.",
    options: [
      {
        name: "user",
        description: "Target user",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "amount",
        description: "Amount to send",
        type: ApplicationCommandOptionType.Integer,
        required: true,
        min_value: 1,
      },
    ],
  },
  {
    name: "agive",
    description: "Admin grant currency to a member.",
    default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
    options: [
      {
        name: "user",
        description: "Target user",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "amount",
        description: "Amount to grant",
        type: ApplicationCommandOptionType.Integer,
        required: true,
        min_value: 1,
      },
    ],
  },
  {
    name: "shop",
    description: "View available shop items.",
  },
  {
    name: "buy",
    description: "Buy a shop item.",
    options: [
      {
        name: "item",
        description: "Item key",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  {
    name: "flaghelpful",
    description: "Flag a user for helpful behavior.",
    default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
    options: [
      {
        name: "user",
        description: "Target user",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "note",
        description: "Optional note",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },
  {
    name: "flagreport",
    description: "Flag a user for validated report.",
    default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
    options: [
      {
        name: "user",
        description: "Target user",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "note",
        description: "Optional note",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },
  {
    name: "flagevent",
    description: "Flag a user for event participation.",
    default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
    options: [
      {
        name: "user",
        description: "Target user",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "note",
        description: "Optional note",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },
  {
    name: "flagsupport",
    description: "Flag a user for support help.",
    default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
    options: [
      {
        name: "user",
        description: "Target user",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "note",
        description: "Optional note",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },
];

async function getGearId() {
  const gear = await prisma.gear.findUnique({
    where: { key: manifest.key },
    select: { id: true },
  });
  return gear?.id ?? null;
}

async function getAdminConfig() {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: `gear.${manifest.key}` },
    select: { value: true },
  });
  if (!setting?.value) return { ...DEFAULTS };
  try {
    return { ...DEFAULTS, ...JSON.parse(setting.value) };
  } catch {
    return { ...DEFAULTS };
  }
}

async function getAutomatonConfig(automatonId, gearId) {
  const assignment = await prisma.automatonGearAssignment.findUnique({
    where: { automatonId_gearId: { automatonId, gearId } },
    select: { configJson: true },
  });
  return assignment?.configJson ?? {};
}

function resolveConfig(adminConfig, automatonConfig) {
  const config = { ...DEFAULTS, ...adminConfig, ...automatonConfig };
  return {
    currencyName: String(config.currencyName || DEFAULTS.currencyName),
    startingBalance: Number(config.startingBalance || DEFAULTS.startingBalance),
    dailyReward: Number(config.dailyReward || DEFAULTS.dailyReward),
    messageRewardAmount: Number(config.messageRewardAmount || DEFAULTS.messageRewardAmount),
    messageRewardEvery: Math.max(1, Number(config.messageRewardEvery || DEFAULTS.messageRewardEvery)),
    messageRewardCooldownMinutes: Number(
      config.messageRewardCooldownMinutes || DEFAULTS.messageRewardCooldownMinutes
    ),
    chatBonusAmount: Number(config.chatBonusAmount || DEFAULTS.chatBonusAmount),
    chatBonusCooldownHours: Number(
      config.chatBonusCooldownHours || DEFAULTS.chatBonusCooldownHours
    ),
    taskRewardAmount: Number(config.taskRewardAmount || DEFAULTS.taskRewardAmount),
    taskIntervalMinutes: Number(config.taskIntervalMinutes || DEFAULTS.taskIntervalMinutes),
    taskWindowMinutes: Number(config.taskWindowMinutes || DEFAULTS.taskWindowMinutes),
    taskChannelId: String(config.taskChannelId || ""),
    reminderChannelId: String(config.reminderChannelId || ""),
    reminderIntervalMinutes: Number(
      config.reminderIntervalMinutes || DEFAULTS.reminderIntervalMinutes
    ),
    shopItems: String(config.shopItems || ""),
    showLeaderboard: config.showLeaderboard !== undefined ? Boolean(config.showLeaderboard) : true,
  };
}

async function getAccount({ automatonId, guildId, userId, startingBalance }) {
  const existing = await prisma.economyAccount.findUnique({
    where: {
      automatonId_guildId_discordUserId: {
        automatonId,
        guildId,
        discordUserId: userId,
      },
    },
  });
  if (existing) return existing;
  return prisma.economyAccount.create({
    data: {
      automatonId,
      guildId,
      discordUserId: userId,
      balance: startingBalance,
    },
  });
}

function hoursUntilNextDaily(lastDailyAt) {
  if (!lastDailyAt) return 0;
  const next = new Date(lastDailyAt.getTime() + 24 * 60 * 60 * 1000);
  const diff = next.getTime() - Date.now();
  return diff > 0 ? Math.ceil(diff / (60 * 60 * 1000)) : 0;
}

function hoursUntilNextBonus(lastBonusAt, cooldownHours) {
  if (!lastBonusAt) return 0;
  const next = new Date(lastBonusAt.getTime() + cooldownHours * 60 * 60 * 1000);
  const diff = next.getTime() - Date.now();
  return diff > 0 ? Math.ceil(diff / (60 * 60 * 1000)) : 0;
}

function minutesSince(date) {
  if (!date) return Infinity;
  return (Date.now() - date.getTime()) / (60 * 1000);
}

function parseShopItems(raw) {
  const lines = String(raw || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const items = [];
  for (const line of lines) {
    const [key, name, priceRaw, roleId, description] = line.split("|").map((part) => part?.trim());
    if (!key || !name) continue;
    const price = Number(priceRaw);
    if (!Number.isFinite(price) || price <= 0) continue;
    items.push({ key, name, price, roleId: roleId || null, description: description || "" });
  }
  return items;
}

export async function init(context) {
  const { client, automatonId, guildId } = context;
  const registerCommands = async () => {
    if (!guildId) return;
    const guild = await client.guilds.fetch(guildId);
    const existing = await guild.commands.fetch();
    for (const cmd of commandDef) {
      const found = existing.find((c) => c.name === cmd.name);
      if (found) {
        await found.edit(cmd);
      } else {
        await guild.commands.create(cmd);
      }
    }
  };

  if (client.isReady()) {
    await registerCommands();
  } else {
    client.once("ready", async () => {
      try {
        await registerCommands();
      } catch {
        // ignore registration errors; they will surface in logs
      }
    });
  }

  const activeTasks = new Map();
  const rewardedUsers = new Map();
  let taskTimer = null;
  let reminderTimer = null;

  const scheduleTasks = async () => {
    if (taskTimer) clearInterval(taskTimer);
    const adminConfig = await getAdminConfig();
    const gearId = await getGearId();
    if (!gearId) return;
    const automatonConfig = await getAutomatonConfig(automatonId, gearId);
    const config = resolveConfig(adminConfig, automatonConfig);
    if (!config.taskChannelId || config.taskIntervalMinutes <= 0) return;
    taskTimer = setInterval(async () => {
      try {
        const channel = await client.channels.fetch(config.taskChannelId);
        if (!channel?.isTextBased()) return;
        const message = await channel.send(
          `Reaction task: react with ⚙️ within ${config.taskWindowMinutes} minutes to earn ${config.taskRewardAmount} ${config.currencyName}.`
        );
        const deadline = Date.now() + config.taskWindowMinutes * 60 * 1000;
        activeTasks.set(message.id, { deadline, reward: config.taskRewardAmount });
        rewardedUsers.set(message.id, new Set());
        setTimeout(() => {
          activeTasks.delete(message.id);
          rewardedUsers.delete(message.id);
        }, config.taskWindowMinutes * 60 * 1000 + 5000);
      } catch {
        // ignore task errors
      }
    }, config.taskIntervalMinutes * 60 * 1000);
  };

  const scheduleReminders = async () => {
    if (reminderTimer) clearInterval(reminderTimer);
    const adminConfig = await getAdminConfig();
    const gearId = await getGearId();
    if (!gearId) return;
    const automatonConfig = await getAutomatonConfig(automatonId, gearId);
    const config = resolveConfig(adminConfig, automatonConfig);
    if (!config.reminderChannelId || config.reminderIntervalMinutes <= 0) return;
    reminderTimer = setInterval(async () => {
      try {
        const pending = await prisma.economyReminder.findMany({
          where: { automatonId, guildId, resolved: false },
          orderBy: { createdAt: "asc" },
          take: 10,
        });
        if (pending.length === 0) return;
        const channel = await client.channels.fetch(config.reminderChannelId);
        if (!channel?.isTextBased()) return;
        const lines = pending.map((item) => {
          const note = item.note ? ` (${item.note})` : "";
          return `• <@${item.discordUserId}> — ${item.kind}${note}`;
        });
        await channel.send(
          `Reward reminders:\n${lines.join("\n")}\nUse /agive to reward and close the loop.`
        );
      } catch {
        // ignore reminder errors
      }
    }, config.reminderIntervalMinutes * 60 * 1000);
  };

  const ensureSchedulers = async () => {
    await scheduleTasks();
    await scheduleReminders();
  };

  if (client.isReady()) {
    await ensureSchedulers();
  } else {
    client.once("ready", async () => {
      await ensureSchedulers();
    });
  }

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.guildId) {
      await interaction.reply({ content: "Use this command in a server.", ephemeral: true });
      return;
    }

    if (
      ![
        "balance",
        "daily",
        "leaderboard",
        "give",
        "agive",
        "shop",
        "buy",
        "flaghelpful",
        "flagreport",
        "flagevent",
        "flagsupport",
      ].includes(interaction.commandName)
    ) {
      return;
    }

    const gearId = await getGearId();
    if (!gearId) {
      await interaction.reply({ content: "Gear not initialized.", ephemeral: true });
      return;
    }

    const adminConfig = await getAdminConfig();
    const automatonConfig = await getAutomatonConfig(automatonId, gearId);
    const config = resolveConfig(adminConfig, automatonConfig);
    const currencyName = config.currencyName;
    const startingBalance = config.startingBalance;
    const dailyReward = config.dailyReward;

    if (interaction.commandName === "balance") {
      const account = await getAccount({
        automatonId,
        guildId: interaction.guildId,
        userId: interaction.user.id,
        startingBalance,
      });
      await interaction.reply({
        content: `Balance: ${account.balance} ${currencyName}`,
        ephemeral: false,
      });
      return;
    }

    if (interaction.commandName === "daily") {
      const account = await getAccount({
        automatonId,
        guildId: interaction.guildId,
        userId: interaction.user.id,
        startingBalance,
      });
      const waitHours = hoursUntilNextDaily(account.lastDailyAt);
      if (waitHours > 0) {
        await interaction.reply({
          content: `Daily already claimed. Try again in ${waitHours}h.`,
          ephemeral: true,
        });
        return;
      }
      const updated = await prisma.economyAccount.update({
        where: { id: account.id },
        data: { balance: account.balance + dailyReward, lastDailyAt: new Date() },
      });
      await interaction.reply({
        content: `Claimed ${dailyReward} ${currencyName}. New balance: ${updated.balance} ${currencyName}.`,
        ephemeral: false,
      });
      return;
    }

    if (interaction.commandName === "leaderboard") {
      if (!config.showLeaderboard && config.showLeaderboard !== undefined) {
        await interaction.reply({ content: "Leaderboard is disabled.", ephemeral: true });
        return;
      }
      const top = await prisma.economyAccount.findMany({
        where: { automatonId, guildId: interaction.guildId },
        orderBy: { balance: "desc" },
        take: 10,
      });
      if (top.length === 0) {
        await interaction.reply({ content: "No balances yet.", ephemeral: true });
        return;
      }
      const lines = top.map(
        (item, idx) => `#${idx + 1} <@${item.discordUserId}> — ${item.balance} ${currencyName}`
      );
      const embed = new EmbedBuilder()
        .setTitle(`${currencyName} Leaderboard`)
        .setDescription(lines.join("\n"))
        .setColor(0xb08a4b);
      await interaction.reply({ embeds: [embed], ephemeral: false });
      return;
    }

    if (interaction.commandName === "give") {
      const target = interaction.options.getUser("user", true);
      const amount = interaction.options.getInteger("amount", true);
      if (amount <= 0) {
        await interaction.reply({ content: "Amount must be greater than zero.", ephemeral: true });
        return;
      }
      const sender = await getAccount({
        automatonId,
        guildId: interaction.guildId,
        userId: interaction.user.id,
        startingBalance,
      });
      if (sender.balance < amount) {
        await interaction.reply({ content: "Insufficient funds.", ephemeral: true });
        return;
      }
      const recipient = await getAccount({
        automatonId,
        guildId: interaction.guildId,
        userId: target.id,
        startingBalance,
      });
      await prisma.$transaction([
        prisma.economyAccount.update({
          where: { id: sender.id },
          data: { balance: sender.balance - amount },
        }),
        prisma.economyAccount.update({
          where: { id: recipient.id },
          data: { balance: recipient.balance + amount },
        }),
      ]);
      await interaction.reply({
        content: `Sent ${amount} ${currencyName} to ${target.username}.`,
        ephemeral: false,
      });
      return;
    }

    if (interaction.commandName === "agive") {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
        await interaction.reply({ content: "Admin only.", ephemeral: true });
        return;
      }
      const target = interaction.options.getUser("user", true);
      const amount = interaction.options.getInteger("amount", true);
      if (amount <= 0) {
        await interaction.reply({ content: "Amount must be greater than zero.", ephemeral: true });
        return;
      }
      const account = await getAccount({
        automatonId,
        guildId: interaction.guildId,
        userId: target.id,
        startingBalance,
      });
      const updated = await prisma.economyAccount.update({
        where: { id: account.id },
        data: { balance: account.balance + amount },
      });
      await prisma.economyReminder.updateMany({
        where: { automatonId, guildId: interaction.guildId, discordUserId: target.id, resolved: false },
        data: { resolved: true, resolvedAt: new Date() },
      });
      await interaction.reply({
        content: `Granted ${amount} ${currencyName} to ${target.username}. New balance: ${updated.balance}.`,
        ephemeral: false,
      });
    }

    if (interaction.commandName === "shop") {
      const items = parseShopItems(config.shopItems);
      if (items.length === 0) {
        await interaction.reply({ content: "Shop is empty.", ephemeral: true });
        return;
      }
      const lines = items.map(
        (item) =>
          `• ${item.key} — ${item.name} (${item.price} ${currencyName})${item.description ? `: ${item.description}` : ""}`
      );
      await interaction.reply({ content: `Shop items:\n${lines.join("\n")}`, ephemeral: true });
      return;
    }

    if (interaction.commandName === "buy") {
      const itemKey = interaction.options.getString("item", true);
      const items = parseShopItems(config.shopItems);
      const item = items.find((entry) => entry.key === itemKey);
      if (!item) {
        await interaction.reply({ content: "Item not found.", ephemeral: true });
        return;
      }
      const account = await getAccount({
        automatonId,
        guildId: interaction.guildId,
        userId: interaction.user.id,
        startingBalance,
      });
      if (account.balance < item.price) {
        await interaction.reply({ content: "Insufficient funds.", ephemeral: true });
        return;
      }
      if (item.roleId) {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        if (member.roles.cache.has(item.roleId)) {
          await interaction.reply({ content: "You already own this role.", ephemeral: true });
          return;
        }
      }
      await prisma.economyAccount.update({
        where: { id: account.id },
        data: { balance: account.balance - item.price },
      });
      if (item.roleId) {
        try {
          const member = await interaction.guild.members.fetch(interaction.user.id);
          await member.roles.add(item.roleId);
        } catch {
          await interaction.followUp({
            content: "Purchase done, but role assignment failed. Check bot permissions.",
            ephemeral: true,
          });
          return;
        }
      }
      await interaction.reply({
        content: `Purchased ${item.name} for ${item.price} ${currencyName}.`,
        ephemeral: true,
      });
      return;
    }

    if (
      ["flaghelpful", "flagreport", "flagevent", "flagsupport"].includes(interaction.commandName)
    ) {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
        await interaction.reply({ content: "Admin only.", ephemeral: true });
        return;
      }
      const target = interaction.options.getUser("user", true);
      const note = interaction.options.getString("note") ?? null;
      const kind = interaction.commandName.replace("flag", "");
      await prisma.economyReminder.create({
        data: {
          automatonId,
          guildId: interaction.guildId,
          discordUserId: target.id,
          kind,
          note,
        },
      });
      await interaction.reply({
        content: `Noted ${target.username} for ${kind}. The admin reminder will surface it.`,
        ephemeral: true,
      });
    }
  });

  client.on("messageCreate", async (message) => {
    if (!message.guildId || message.author?.bot) return;
    const gearId = await getGearId();
    if (!gearId) return;
    const adminConfig = await getAdminConfig();
    const automatonConfig = await getAutomatonConfig(automatonId, gearId);
    const config = resolveConfig(adminConfig, automatonConfig);
    const account = await getAccount({
      automatonId,
      guildId: message.guildId,
      userId: message.author.id,
      startingBalance: config.startingBalance,
    });

    const messageCount = account.messageCount + 1;
    let balanceDelta = 0;
    let updateData = { messageCount };

    if (messageCount % config.messageRewardEvery === 0) {
      const cooldownOk = minutesSince(account.lastMessageRewardAt) >= config.messageRewardCooldownMinutes;
      if (cooldownOk) {
        balanceDelta += config.messageRewardAmount;
        updateData.lastMessageRewardAt = new Date();
      }
    }

    const bonusCooldownOk =
      hoursUntilNextBonus(account.lastChatBonusAt, config.chatBonusCooldownHours) === 0;
    if (bonusCooldownOk) {
      balanceDelta += config.chatBonusAmount;
      updateData.lastChatBonusAt = new Date();
    }

    if (balanceDelta > 0) {
      updateData.balance = account.balance + balanceDelta;
    }

    await prisma.economyAccount.update({
      where: { id: account.id },
      data: updateData,
    });
  });

  client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch {
        return;
      }
    }
    const messageId = reaction.message?.id;
    if (!messageId || !activeTasks.has(messageId)) return;
    const task = activeTasks.get(messageId);
    if (Date.now() > task.deadline) return;
    if (reaction.emoji?.name !== "⚙️") return;
    const rewarded = rewardedUsers.get(messageId);
    if (rewarded?.has(user.id)) return;
    const gearId = await getGearId();
    if (!gearId) return;
    const adminConfig = await getAdminConfig();
    const automatonConfig = await getAutomatonConfig(automatonId, gearId);
    const config = resolveConfig(adminConfig, automatonConfig);
    const account = await getAccount({
      automatonId,
      guildId,
      userId: user.id,
      startingBalance: config.startingBalance,
    });
    await prisma.economyAccount.update({
      where: { id: account.id },
      data: { balance: account.balance + task.reward },
    });
    rewarded?.add(user.id);
  });
}
