import { Client } from "discord.js";

/** Guilds only (1 << 0). No privileged intents: Members, Presence, Message Content. */
export const client = new Client({
  intents: 1,
});
