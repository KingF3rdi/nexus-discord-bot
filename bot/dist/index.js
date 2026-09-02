import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Events } from "discord.js";
import { client } from "./client.js";
import { commands } from "./commands.js";
import { handleButton, handleChatCommand, handleModal, handleSelect, handleUserSelect, tickGiveaways } from "./handlers.js";
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ quiet: true });
dotenv.config({ path: path.resolve(here, "../../.env"), quiet: true });
dotenv.config({ path: path.resolve(here, "../.env"), quiet: true });
const token = process.env.DISCORD_TOKEN;
function isDisallowedIntents(err) {
    const message = err instanceof Error ? err.message : String(err);
    return message.includes("disallowed intents") || message.includes("Used disallowed intents");
}
function printIntentsHelp() {
    console.error(`
┌─────────────────────────────────────────────────────────────┐
│  Discord: Used disallowed intents (Code 4014)               │
│                                                             │
│  Developer Portal → https://discord.com/developers          │
│  Anwendung wählen → Bot → Privileged Gateway Intents:       │
│    Presence Intent          AUS                             │
│    Server Members Intent    AUS                             │
│    Message Content Intent   AUS                             │
│  Speichern, dann den Host neu starten.                      │
│  Dieser Build sendet nur den Intent Guilds.                 │
└─────────────────────────────────────────────────────────────┘
`);
}
process.on("uncaughtException", (err) => {
    if (isDisallowedIntents(err)) {
        printIntentsHelp();
        process.exit(1);
    }
    console.error(err);
    process.exit(1);
});
if (!token) {
    console.error(`
┌─────────────────────────────────────────────────────────────┐
│  DISCORD_TOKEN fehlt. Der Bot kann sich nicht verbinden.    │
│                                                             │
│  1. https://discord.com/developers/applications             │
│  2. Bot anlegen → Token kopieren                            │
│  3. DISCORD_TOKEN im Host als Umgebungsvariable setzen      │
│     oder lokal in .env speichern                            │
│  4. node index.js  (Bot-Host: Startup-Datei = index.js)     │
│                                                             │
│  Die Web-Vorschau läuft unabhängig davon: npm run dev       │
└─────────────────────────────────────────────────────────────┘
`);
    process.exit(1);
}
client.once(Events.ClientReady, async (ready) => {
    console.log(`[Nexus] Online als ${ready.user.tag} · Intents ${client.options.intents?.bitfield ?? 1}`);
    try {
        await ready.application.commands.set(commands);
        console.log(`${commands.length} Slash-Befehle registriert.`);
    }
    catch (err) {
        console.error("Befehle konnten nicht registriert werden:", err);
    }
    setInterval(() => tickGiveaways(client), 15_000);
});
client.on(Events.Error, (err) => {
    console.error("Discord-Fehler:", err.message);
});
client.on(Events.InteractionCreate, async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            await handleChatCommand(interaction);
            return;
        }
        if (interaction.isButton()) {
            await handleButton(interaction);
            return;
        }
        if (interaction.isStringSelectMenu()) {
            await handleSelect(interaction);
            return;
        }
        if (interaction.isUserSelectMenu()) {
            await handleUserSelect(interaction);
            return;
        }
        if (interaction.isModalSubmit()) {
            await handleModal(interaction);
        }
    }
    catch (err) {
        console.error(err);
        const payload = { content: "Da ist etwas schiefgelaufen.", flags: 64 };
        if (interaction.isRepliable()) {
            if (interaction.deferred || interaction.replied)
                await interaction.followUp(payload).catch(() => undefined);
            else
                await interaction.reply(payload).catch(() => undefined);
        }
    }
});
console.log("[Nexus] 1.0.4 start · Gateway-Intents: Guilds only");
client.login(token).catch((err) => {
    if (isDisallowedIntents(err))
        printIntentsHelp();
    else
        console.error(err);
    process.exit(1);
});
