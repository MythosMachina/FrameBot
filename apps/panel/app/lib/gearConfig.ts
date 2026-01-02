export type FieldType = "text" | "number" | "select" | "checkbox" | "textarea";

export type FieldOption = {
  label: string;
  value: string;
};

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  help?: string;
  placeholder?: string;
  options?: FieldOption[];
};

export type GearConfigDef = {
  admin: FieldDef[];
  user: FieldDef[];
};

export const gearConfigMap: Record<string, GearConfigDef> = {
  "moderation.mod": {
    admin: [
      {
        key: "defaultAction",
        label: "Default action",
        type: "select",
        options: [
          { label: "None", value: "none" },
          { label: "Warn", value: "warn" },
          { label: "Mute", value: "mute" },
          { label: "Kick", value: "kick" },
          { label: "Ban", value: "ban" },
        ],
        help: "Base action used by moderation workflows.",
      },
      {
        key: "tempDurationMinutes",
        label: "Default temp duration (minutes)",
        type: "number",
      },
      {
        key: "escalationThreshold",
        label: "Escalation threshold",
        type: "number",
        help: "Number of incidents before escalating.",
      },
      {
        key: "escalationAction",
        label: "Escalation action",
        type: "select",
        options: [
          { label: "Warn", value: "warn" },
          { label: "Mute", value: "mute" },
          { label: "Kick", value: "kick" },
          { label: "Ban", value: "ban" },
        ],
      },
    ],
    user: [
      {
        key: "autoModerationEnabled",
        label: "Enable auto moderation",
        type: "checkbox",
      },
      {
        key: "notifyChannelId",
        label: "Notification channel ID",
        type: "text",
        placeholder: "Discord channel ID",
      },
      {
        key: "maxWarnings",
        label: "Max warnings before action",
        type: "number",
      },
    ],
  },
  "moderation.mutes": {
    admin: [
      { key: "defaultDurationMinutes", label: "Default mute duration (minutes)", type: "number" },
      { key: "requireRoleId", label: "Required role ID for mute", type: "text" },
    ],
    user: [
      { key: "muteRoleId", label: "Mute role ID", type: "text" },
      { key: "dmOnMute", label: "DM user on mute", type: "checkbox" },
    ],
  },
  "moderation.warnings": {
    admin: [
      { key: "decayDays", label: "Warning decay (days)", type: "number" },
      { key: "threshold", label: "Warning threshold", type: "number" },
      {
        key: "thresholdAction",
        label: "Threshold action",
        type: "select",
        options: [
          { label: "Mute", value: "mute" },
          { label: "Kick", value: "kick" },
          { label: "Ban", value: "ban" },
        ],
      },
    ],
    user: [{ key: "showStats", label: "Show warning stats in dashboard", type: "checkbox" }],
  },
  "moderation.reports": {
    admin: [
      { key: "reportChannelId", label: "Report channel ID", type: "text" },
      { key: "escalationRoleId", label: "Escalation role ID", type: "text" },
    ],
    user: [{ key: "allowAnonymous", label: "Allow anonymous reports", type: "checkbox" }],
  },
  "moderation.permissions": {
    admin: [
      {
        key: "allowedRoleIds",
        label: "Allowed role IDs",
        type: "textarea",
        placeholder: "One role ID per line",
      },
      {
        key: "deniedRoleIds",
        label: "Denied role IDs",
        type: "textarea",
        placeholder: "One role ID per line",
      },
    ],
    user: [
      {
        key: "commandAllowlist",
        label: "Command allowlist",
        type: "textarea",
        placeholder: "One command per line",
      },
    ],
  },
  "logging.modlog": {
    admin: [
      { key: "logChannelId", label: "Log channel ID", type: "text" },
      {
        key: "eventTypes",
        label: "Event types",
        type: "textarea",
        placeholder: "One event per line",
      },
    ],
    user: [{ key: "exposeLogs", label: "Expose logs in UI", type: "checkbox" }],
  },
  "administration.admin": {
    admin: [
      { key: "policyUrl", label: "Policy URL", type: "text" },
      { key: "selfRoleEnabled", label: "Enable self-role", type: "checkbox" },
      {
        key: "selfRoleIds",
        label: "Self-role IDs",
        type: "textarea",
        placeholder: "One role ID per line",
      },
    ],
    user: [
      {
        key: "selfRoleIds",
        label: "Self-role IDs",
        type: "textarea",
        placeholder: "One role ID per line",
      },
      {
        key: "badwordMatchMode",
        label: "Badword match mode",
        type: "select",
        options: [
          { label: "Contains", value: "contains" },
          { label: "Word boundary", value: "word" },
          { label: "Regex", value: "regex" },
        ],
        help: "Controls how keywords are matched against messages.",
      },
      {
        key: "badwordKeywords",
        label: "Badword keywords",
        type: "textarea",
        placeholder: "One keyword or phrase per line",
        help: "Messages containing these keywords will be removed.",
      },
      {
        key: "badwordExemptMods",
        label: "Exempt admins/mods",
        type: "checkbox",
        help: "Skip users with Manage Messages or Administrator.",
      },
      {
        key: "badwordIgnoreRoleIds",
        label: "Ignore role IDs",
        type: "textarea",
        placeholder: "One role ID per line",
      },
      {
        key: "badwordIgnoreUserIds",
        label: "Ignore user IDs",
        type: "textarea",
        placeholder: "One user ID per line",
      },
      {
        key: "policyAutoWarnCount",
        label: "Auto-warn after (badwords)",
        type: "number",
        help: "Number of badword hits before issuing a formal warn.",
      },
      {
        key: "policyAutoKickCount",
        label: "Auto-kick after (badwords)",
        type: "number",
        help: "Number of badword hits before kicking the user.",
      },
      {
        key: "policyAutoBanCount",
        label: "Auto-ban after (badwords)",
        type: "number",
        help: "Number of badword hits before banning the user.",
      },
    ],
  },
  "administration.cleanup": {
    admin: [
      { key: "maxDeleteCount", label: "Max delete count", type: "number" },
      {
        key: "allowedChannelIds",
        label: "Allowed channel IDs",
        type: "textarea",
        placeholder: "One channel ID per line",
      },
    ],
    user: [{ key: "defaultWindowMinutes", label: "Default window (minutes)", type: "number" }],
  },
  "news.news": {
    admin: [],
    user: [
      { key: "newsChannelId", label: "News channel ID", type: "text" },
      { key: "embedColor", label: "Embed color (hex)", type: "text", placeholder: "#b08a4b" },
      { key: "authorName", label: "Embed author name", type: "text" },
      { key: "footerText", label: "Embed footer text", type: "text" },
      { key: "webhookToken", label: "Webhook token (v2)", type: "text" },
    ],
  },
  "utility.alias": {
    admin: [
      {
        key: "globalAllowlist",
        label: "Global alias allowlist",
        type: "textarea",
        placeholder: "One alias per line",
      },
    ],
    user: [
      {
        key: "aliases",
        label: "Aliases",
        type: "textarea",
        placeholder: "alias=command (one per line)",
      },
    ],
  },
  "utility.customcom": {
    admin: [{ key: "reviewRequired", label: "Review required", type: "checkbox" }],
    user: [
      {
        key: "customCommands",
        label: "Custom commands",
        type: "textarea",
        placeholder: "command=reply (one per line)",
      },
    ],
  },
  "utility.general": {
    admin: [
      {
        key: "disabledCommands",
        label: "Disabled commands",
        type: "textarea",
        placeholder: "One command per line",
      },
    ],
    user: [
      {
        key: "enabledFeatures",
        label: "Enabled features",
        type: "textarea",
        placeholder: "One feature per line",
      },
    ],
  },
  "media.audio": {
    admin: [
      {
        key: "allowedSources",
        label: "Allowed sources",
        type: "textarea",
        placeholder: "e.g. youtube, soundcloud",
      },
      { key: "maxQueueSize", label: "Max queue size", type: "number" },
    ],
    user: [
      { key: "defaultVolume", label: "Default volume", type: "number" },
      {
        key: "playlistIds",
        label: "Playlist IDs",
        type: "textarea",
        placeholder: "One playlist ID per line",
      },
    ],
  },
  "media.image": {
    admin: [
      { key: "maxImageSizeMb", label: "Max image size (MB)", type: "number" },
      { key: "allowNsfw", label: "Allow NSFW", type: "checkbox" },
    ],
    user: [{ key: "enableFilters", label: "Enable filters", type: "checkbox" }],
  },
  "media.trivia": {
    admin: [
      {
        key: "allowedPacks",
        label: "Allowed packs",
        type: "textarea",
        placeholder: "One pack per line",
      },
      { key: "roundTimeSeconds", label: "Round time (seconds)", type: "number" },
    ],
    user: [{ key: "defaultPack", label: "Default pack", type: "text" }],
  },
  "alerts.streams": {
    admin: [
      {
        key: "providerKeys",
        label: "Provider keys",
        type: "textarea",
        placeholder: "provider=key (one per line)",
      },
    ],
    user: [
      { key: "alertChannelId", label: "Alert channel ID", type: "text" },
      {
        key: "streamList",
        label: "Streams",
        type: "textarea",
        placeholder: "One stream per line",
      },
    ],
  },
  "economy.economy": {
    admin: [
      { key: "currencyName", label: "Currency name", type: "text" },
      { key: "startingBalance", label: "Starting balance", type: "number" },
      { key: "dailyReward", label: "Daily reward", type: "number" },
      { key: "messageRewardAmount", label: "Message reward amount", type: "number" },
      { key: "messageRewardEvery", label: "Messages per reward", type: "number" },
      { key: "messageRewardCooldownMinutes", label: "Message reward cooldown (minutes)", type: "number" },
      { key: "chatBonusAmount", label: "Chat bonus amount", type: "number" },
      { key: "chatBonusCooldownHours", label: "Chat bonus cooldown (hours)", type: "number" },
      { key: "taskRewardAmount", label: "Reaction task reward", type: "number" },
      { key: "taskIntervalMinutes", label: "Task interval (minutes)", type: "number" },
      { key: "taskWindowMinutes", label: "Task window (minutes)", type: "number" },
      { key: "taskChannelId", label: "Task channel ID", type: "text" },
      { key: "reminderChannelId", label: "Reminder channel ID", type: "text" },
      { key: "reminderIntervalMinutes", label: "Reminder interval (minutes)", type: "number" },
    ],
    user: [
      { key: "showLeaderboard", label: "Show leaderboard", type: "checkbox" },
      { key: "messageRewardAmount", label: "Message reward amount", type: "number" },
      { key: "messageRewardEvery", label: "Messages per reward", type: "number" },
      { key: "messageRewardCooldownMinutes", label: "Message reward cooldown (minutes)", type: "number" },
      { key: "chatBonusAmount", label: "Chat bonus amount", type: "number" },
      { key: "chatBonusCooldownHours", label: "Chat bonus cooldown (hours)", type: "number" },
      { key: "taskRewardAmount", label: "Reaction task reward", type: "number" },
      { key: "taskIntervalMinutes", label: "Task interval (minutes)", type: "number" },
      { key: "taskWindowMinutes", label: "Task window (minutes)", type: "number" },
      { key: "taskChannelId", label: "Task channel ID", type: "text" },
      { key: "reminderChannelId", label: "Reminder channel ID", type: "text" },
      { key: "reminderIntervalMinutes", label: "Reminder interval (minutes)", type: "number" },
      {
        key: "shopItems",
        label: "Shop items",
        type: "textarea",
        placeholder: "key|name|price|roleId(optional)|description (one per line)",
      },
    ],
  },
};

export function getGearFields(key: string, scope: "admin" | "user") {
  return gearConfigMap[key]?.[scope] ?? [];
}

export function configToValues(fields: FieldDef[], config: Record<string, unknown>) {
  const values: Record<string, string | boolean> = {};
  for (const field of fields) {
    const raw = config?.[field.key];
    if (field.type === "checkbox") {
      values[field.key] = Boolean(raw);
      continue;
    }
    if (raw === null || raw === undefined) {
      values[field.key] = "";
      continue;
    }
    values[field.key] = String(raw);
  }
  return values;
}

export function valuesToConfig(fields: FieldDef[], values: Record<string, string | boolean>) {
  const config: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = values[field.key];
    if (field.type === "checkbox") {
      config[field.key] = Boolean(raw);
      continue;
    }
    if (raw === "" || raw === undefined) {
      continue;
    }
    if (field.type === "number") {
      const num = Number(raw);
      if (!Number.isNaN(num)) {
        config[field.key] = num;
      }
      continue;
    }
    config[field.key] = raw;
  }
  return config;
}
