import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Events } from "discord.js";
import { client } from "./client.js";
import { commands } from "./commands.js";
import { handleButton, handleChatCommand, handleModal, handleSelect, handleUserSelect, tickGiveaways } from "./handlers.js";
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(here, "../../.env") });
dotenv.config({ path: path.resolve(here, "../.env") });
const token = process.env.DISCORD_TOKEN;
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
    console.log(`Eingeloggt als ${ready.user.tag}`);
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
client.login(token).catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("disallowed intents") || message.includes("Used disallowed intents")) {
        console.error(`
┌─────────────────────────────────────────────────────────────┐
│  Discord hat den Start blockiert: disallowed intents        │
│                                                             │
│  Im Developer Portal → Bot → Privileged Gateway Intents     │
│  entweder ALLES AUS lassen (empfohlen, aktueller Code)      │
│  oder nur einschalten, was wirklich nötig ist.              │
│  Danach den Bot im Host neu starten.                        │
└─────────────────────────────────────────────────────────────┘
`);
    }
    else {
        console.error(err);
    }
    process.exit(1);
});
