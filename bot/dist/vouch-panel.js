import { ChannelType } from "discord.js";
import { db, getGuild, updateGuild } from "./db.js";
import { vouchLookupEmbed, vouchUserSelect } from "./embeds.js";
function profileCount(guildId) {
    const row = db
        .prepare("SELECT COUNT(DISTINCT buyer_id) + COUNT(DISTINCT seller_id) AS c FROM vouches WHERE guild_id = ?")
        .get(guildId);
    return row.c || 0;
}
function listVouchPanels(guildId) {
    return db
        .prepare("SELECT id, channel_id, message_id FROM panels WHERE guild_id = ? AND type = 'vouch'")
        .all(guildId);
}
async function deletePanelMessage(client, row) {
    const ch = await client.channels.fetch(row.channel_id).catch(() => null);
    if (!ch || !ch.isTextBased() || !("messages" in ch))
        return;
    const msg = await ch.messages.fetch(row.message_id).catch(() => null);
    await msg?.delete().catch(() => undefined);
}
function asGuildText(ch) {
    if (!ch || typeof ch !== "object")
        return null;
    const channel = ch;
    if (!channel.isTextBased?.() || channel.isDMBased?.())
        return null;
    if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)
        return null;
    if (typeof channel.send !== "function")
        return null;
    return ch;
}
/** Löscht jedes alte Vouch-Panel und postet genau eines ans Ende des Kanals. */
export async function placeVouchPanel(client, guildId, channel) {
    const old = listVouchPanels(guildId);
    const config = getGuild(guildId);
    const msg = await channel.send({
        embeds: [vouchLookupEmbed(config, profileCount(guildId))],
        components: [vouchUserSelect()],
    });
    for (const row of old) {
        if (row.message_id === msg.id)
            continue;
        await deletePanelMessage(client, row);
    }
    db.prepare("DELETE FROM panels WHERE guild_id = ? AND type = 'vouch'").run(guildId);
    db.prepare("INSERT INTO panels (guild_id, type, channel_id, message_id) VALUES (?, 'vouch', ?, ?)").run(guildId, channel.id, msg.id);
    updateGuild(guildId, { vouch_channel_id: channel.id });
    return msg;
}
/** Nach einem neuen Vouch: das eine Panel wieder unter die letzte Nachricht schieben. */
export async function keepVouchPanelAtBottom(client, guildId) {
    const row = db
        .prepare("SELECT channel_id FROM panels WHERE guild_id = ? AND type = 'vouch' ORDER BY id DESC LIMIT 1")
        .get(guildId);
    if (!row)
        return;
    const ch = await client.channels.fetch(row.channel_id).catch(() => null);
    const channel = asGuildText(ch);
    if (!channel)
        return;
    await placeVouchPanel(client, guildId, channel);
}
