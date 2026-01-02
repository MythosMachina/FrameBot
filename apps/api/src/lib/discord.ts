import { REST, Routes } from "discord.js";
import { decryptToken } from "./crypto";
import { prisma } from "./prisma";

export async function getDiscordClient(automatonId: string) {
  const automaton = await prisma.automaton.findUnique({
    where: { id: automatonId },
    select: { tokenCipher: true, tokenIv: true, tokenTag: true },
  });
  if (!automaton) {
    throw new Error("Automaton not found.");
  }
  const token = decryptToken(automaton.tokenCipher, automaton.tokenIv, automaton.tokenTag);
  const rest = new REST({ version: "10" }).setToken(token);
  return rest;
}

export async function listGuilds(automatonId: string) {
  const rest = await getDiscordClient(automatonId);
  return rest.get(Routes.userGuilds());
}

export async function listGuildChannels(automatonId: string, guildId: string) {
  const rest = await getDiscordClient(automatonId);
  return rest.get(Routes.guildChannels(guildId));
}

export async function getBotProfile(automatonId: string) {
  const rest = await getDiscordClient(automatonId);
  return rest.get(Routes.user());
}

export async function updateBotProfile(
  automatonId: string,
  data: { username?: string; avatar?: string | null }
) {
  const rest = await getDiscordClient(automatonId);
  return rest.patch(Routes.user(), { body: data });
}

export async function postChannelMessage(
  automatonId: string,
  channelId: string,
  body: Record<string, unknown>
) {
  const rest = await getDiscordClient(automatonId);
  return rest.post(Routes.channelMessages(channelId), { body });
}
