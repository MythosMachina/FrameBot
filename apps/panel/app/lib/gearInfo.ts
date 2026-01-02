export type GearCommand = {
  name: string;
  syntax: string;
  description: string;
};

export type GearInfo = {
  summary: string;
  commands: GearCommand[];
};

export const gearInfoMap: Record<string, GearInfo> = {
  "administration.admin": {
    summary:
      "Keeps moderation tasks moving by filtering blocked keywords, warning users, and tracking repeat offenses.",
    commands: [
      {
        name: "badwordcount user",
        syntax: "/badwordcount user user:@Member",
        description: "Shows the badword count for a specific member.",
      },
      {
        name: "badwordcount top",
        syntax: "/badwordcount top limit:10",
        description: "Shows a leaderboard of members with the highest counts.",
      },
      {
        name: "badwords add",
        syntax: "/badwords add keyword:<text>",
        description: "Adds a keyword or phrase to the filter list.",
      },
      {
        name: "badwords remove",
        syntax: "/badwords remove keyword:<text>",
        description: "Removes a keyword or phrase from the filter list.",
      },
      {
        name: "badwords list",
        syntax: "/badwords list",
        description: "Lists the current badword keywords.",
      },
      {
        name: "badwords clear",
        syntax: "/badwords clear",
        description: "Clears the entire badword keyword list.",
      },
    ],
  },
  "administration.cleanup": {
    summary:
      "Bulk message cleanup tools and safety limits for removing content in channels.",
    commands: [],
  },
  "alerts.streams": {
    summary:
      "Stream alerts for configured creators with routing to your chosen channels.",
    commands: [],
  },
  "economy.economy": {
    summary:
      "Virtual currency system with balances, rewards, and shop items.",
    commands: [],
  },
  "logging.modlog": {
    summary:
      "Moderation event logging to track staff actions and incident history.",
    commands: [],
  },
  "media.audio": {
    summary:
      "Audio playback controls for music and playlists in voice channels.",
    commands: [],
  },
  "media.image": {
    summary:
      "Image tools and fun transformations for media content.",
    commands: [],
  },
  "media.trivia": {
    summary:
      "Trivia games with configurable packs and round timing.",
    commands: [],
  },
  "moderation.mod": {
    summary:
      "Core moderation actions and policy automation for staff.",
    commands: [],
  },
  "moderation.mutes": {
    summary:
      "Temporary and permanent mute workflows with role-based enforcement.",
    commands: [],
  },
  "moderation.permissions": {
    summary:
      "Command allow/deny rules for roles and members.",
    commands: [],
  },
  "moderation.reports": {
    summary:
      "User report intake and routing for staff review.",
    commands: [],
  },
  "moderation.warnings": {
    summary:
      "Warning tracking with thresholds and escalation rules.",
    commands: [],
  },
  "news.news": {
    summary:
      "Publish announcements and updates to a configured channel.",
    commands: [],
  },
  "utility.alias": {
    summary:
      "Create shorthand aliases that expand into longer commands.",
    commands: [],
  },
  "utility.customcom": {
    summary:
      "User-defined custom commands and responses.",
    commands: [],
  },
  "utility.general": {
    summary:
      "Miscellaneous utility commands and general chat helpers.",
    commands: [],
  },
};
