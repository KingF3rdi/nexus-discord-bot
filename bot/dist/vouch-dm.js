import { EmbedBuilder, } from "discord.js";
import { db, getGuild } from "./db.js";
import { vouchDmEmbed, vouchEmbed, vouchStarButtons } from "./embeds.js";
import { COLORS } from "./util.js";
import { keepVouchPanelAtBottom } from "./vouch-panel.js";
function productLabel(ticket) {
    if (ticket.product_name)
        return ticket.product_name;
    if (ticket.product_id) {
        const row = db.prepare("SELECT name FROM products WHERE id = ?").get(ticket.product_id);
        if (row?.name)
            return row.name;
    }
    if (ticket.type.startsWith("spawner"))
        return "Spawner";
    return "Kauf";
}
export function shouldAskVouch(ticket) {
    if (!ticket.total || ticket.total <= 0)
        return false;
    if (ticket.type === "clan" || ticket.type === "spawner-sell")
        return false;
    return true;
}
export async function sendVouchDm(client, ticket) {
    if (!shouldAskVouch(ticket))
        return "skipped";
    const existing = db
        .prepare("SELECT id FROM vouch_requests WHERE ticket_id = ?")
        .get(ticket.id);
    if (existing)
        return "skipped";
    const result = db
        .prepare(`INSERT INTO vouch_requests (guild_id, ticket_id, user_id, product, quantity, price, seller_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`)
        .run(ticket.guild_id, ticket.id, ticket.user_id, productLabel(ticket), ticket.quantity || 1, ticket.total, ticket.seller_id, Date.now());
    const requestId = Number(result.lastInsertRowid);
    const config = getGuild(ticket.guild_id);
    try {
        const user = await client.users.fetch(ticket.user_id);
        await user.send({
            embeds: [
                vouchDmEmbed({
                    community: config.community_name,
                    product: productLabel(ticket),
                    quantity: ticket.quantity || 1,
                    price: ticket.total,
                }),
            ],
            components: [vouchStarButtons(requestId)],
        });
        return "sent";
    }
    catch {
        db.prepare("UPDATE vouch_requests SET status = 'failed' WHERE id = ?").run(requestId);
        return "failed";
    }
}
export async function handleVouchDmButton(interaction) {
    const parts = interaction.customId.split(":");
    const requestId = Number(parts[1]);
    const rating = Number(parts[2]);
    if (!Number.isInteger(requestId) || rating < 1 || rating > 5) {
        throw new Error("Ungültige Bewertung.");
    }
    const req = db.prepare("SELECT * FROM vouch_requests WHERE id = ?").get(requestId);
    if (!req)
        throw new Error("Diese Bewertungsanfrage gibt es nicht mehr.");
    if (req.user_id !== interaction.user.id)
        throw new Error("Das ist nicht deine Bewertung.");
    if (req.status !== "pending") {
        await interaction.reply({ content: "Du hast diesen Kauf bereits bewertet.", flags: 64 });
        return;
    }
    const sellerId = req.seller_id || interaction.client.user.id;
    const insert = db
        .prepare(`INSERT INTO vouches (guild_id, category, product, quantity, price, buyer_id, seller_id, rating, note, created_at)
       VALUES (?, 'Shop', ?, ?, ?, ?, ?, ?, NULL, ?)`)
        .run(req.guild_id, req.product, req.quantity, req.price, req.user_id, sellerId, rating, Date.now());
    const vouchId = Number(insert.lastInsertRowid);
    db.prepare("UPDATE vouch_requests SET status = 'done' WHERE id = ?").run(req.id);
    const config = getGuild(req.guild_id);
    const total = db.prepare("SELECT COUNT(*) AS c FROM vouches WHERE guild_id = ?").get(req.guild_id).c;
    const categoryCount = db.prepare("SELECT COUNT(*) AS c FROM vouches WHERE guild_id = ? AND category = ?").get(req.guild_id, "Shop").c;
    const payload = vouchEmbed(config, {
        id: vouchId,
        category: "Shop",
        product: req.product,
        quantity: req.quantity,
        price: req.price,
        buyer_id: req.user_id,
        seller_id: sellerId,
        rating,
        note: "Bewertung per DM nach dem Kauf",
    }, { categoryCount, total });
    const panelCh = db
        .prepare("SELECT channel_id FROM panels WHERE guild_id = ? AND type = 'vouch' ORDER BY id DESC LIMIT 1")
        .get(req.guild_id)?.channel_id;
    const channelId = panelCh || config.vouch_channel_id || config.log_channel_id;
    if (channelId) {
        const ch = await interaction.client.channels.fetch(channelId).catch(() => null);
        if (ch && ch.isTextBased() && "send" in ch) {
            await ch.send({ embeds: [payload] }).catch(() => undefined);
        }
    }
    await keepVouchPanelAtBottom(interaction.client, req.guild_id);
    await interaction.update({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.green)
                .setTitle("Danke für deine Bewertung")
                .setDescription(`Du hast **${rating}/5 Sternen** vergeben. Der Vouch wurde auf dem Server veröffentlicht.`),
        ],
        components: [],
    });
}
