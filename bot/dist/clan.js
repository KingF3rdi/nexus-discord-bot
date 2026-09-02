import { ActionRowBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, } from "discord.js";
import { countAcceptedClanMembers, db, getClan, getGuild, listClanPrices, requireGuildId, updateClan, } from "./db.js";
import { clanApplyButton, clanPanelEmbed, clanTicketControls, paymentEmbed, ticketControls } from "./embeds.js";
import { COLORS, formatMillions, parsePrice } from "./util.js";
import { createTicketChannel, insertTicket, isStaff, resolveTextChannel } from "./tickets.js";
function panelPayload(guildId) {
    const config = getGuild(guildId);
    const clan = getClan(guildId);
    const filled = countAcceptedClanMembers(guildId);
    const prices = listClanPrices(guildId);
    return {
        embeds: [clanPanelEmbed(config, clan, filled, prices)],
        components: [clanApplyButton(filled >= clan.max_slots)],
    };
}
export async function refreshClanPanels(client, guildId) {
    const rows = db
        .prepare("SELECT channel_id, message_id FROM panels WHERE guild_id = ? AND type = 'clan'")
        .all(guildId);
    const payload = panelPayload(guildId);
    for (const row of rows) {
        const ch = await client.channels.fetch(row.channel_id).catch(() => null);
        if (!ch || !ch.isTextBased() || !("messages" in ch))
            continue;
        const msg = await ch.messages.fetch(row.message_id).catch(() => null);
        await msg?.edit(payload).catch(() => undefined);
    }
}
export async function cmdClan(interaction) {
    const guildId = requireGuildId(interaction.guildId);
    const clan = getClan(guildId);
    const sub = interaction.options.getSubcommand();
    if (sub === "anzeigen") {
        const filled = countAcceptedClanMembers(guildId);
        const prices = listClanPrices(guildId)
            .map((p) => `• **${p.label}:** ${formatMillions(p.amount)}`)
            .join("\n") || "_keine_";
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLORS.green)
                    .setTitle(`Clan · ${clan.name}`)
                    .setDescription(`${clan.info}\n\n**Plätze:** ${filled}/${clan.max_slots}\n\n**Preise**\n${prices}`),
            ],
            flags: 64,
        });
        return;
    }
    if (sub === "name") {
        const name = interaction.options.getString("text", true);
        updateClan(guildId, { name });
        await refreshClanPanels(interaction.client, guildId);
        await interaction.reply({ content: `Clan-Name ist jetzt **${name}**.`, flags: 64 });
        return;
    }
    if (sub === "info") {
        const info = interaction.options.getString("text", true);
        updateClan(guildId, { info });
        await refreshClanPanels(interaction.client, guildId);
        await interaction.reply({ content: "Clan-Info gespeichert und Panels aktualisiert.", flags: 64 });
        return;
    }
    if (sub === "plaetze") {
        const max = interaction.options.getInteger("anzahl", true);
        updateClan(guildId, { max_slots: max });
        await refreshClanPanels(interaction.client, guildId);
        const filled = countAcceptedClanMembers(guildId);
        await interaction.reply({ content: `Maximale Plätze: **${filled}/${max}**.`, flags: 64 });
        return;
    }
    if (sub === "empfaenger") {
        const name = interaction.options.getString("name", true);
        updateClan(guildId, { pay_recipient: name });
        await interaction.reply({
            content: `Clan-Pay-Empfänger ist jetzt \`${name}\` (erscheint als /pay im Bewerbungs-Ticket).`,
            flags: 64,
        });
        return;
    }
    if (sub === "preis-setzen") {
        const label = interaction.options.getString("bezeichnung", true);
        const amount = parsePrice(interaction.options.getString("betrag", true));
        if (amount == null)
            throw new Error("Preis darf nicht STOP sein.");
        const existing = db
            .prepare("SELECT id FROM clan_prices WHERE guild_id = ? AND lower(label) = lower(?)")
            .get(guildId, label);
        if (existing)
            db.prepare("UPDATE clan_prices SET amount = ? WHERE id = ?").run(amount, existing.id);
        else
            db.prepare("INSERT INTO clan_prices (guild_id, label, amount, sort_order) VALUES (?, ?, ?, 99)").run(guildId, label, amount);
        await refreshClanPanels(interaction.client, guildId);
        await interaction.reply({
            content: `Preis **${label}** = \`${formatMillions(amount)}\` gespeichert.`,
            flags: 64,
        });
        return;
    }
    if (sub === "preis-liste") {
        const body = listClanPrices(guildId)
            .map((p) => `\`${p.id}\` **${p.label}** · ${formatMillions(p.amount)}`)
            .join("\n") || "_Keine Preise._";
        await interaction.reply({
            embeds: [new EmbedBuilder().setColor(COLORS.green).setTitle("Clan-Preise").setDescription(body)],
            flags: 64,
        });
        return;
    }
    if (sub === "preis-entfernen") {
        const id = interaction.options.getInteger("id", true);
        db.prepare("DELETE FROM clan_prices WHERE id = ? AND guild_id = ?").run(id, guildId);
        await refreshClanPanels(interaction.client, guildId);
        await interaction.reply({ content: `Preis ${id} entfernt.`, flags: 64 });
        return;
    }
    if (sub === "liste") {
        const rows = db
            .prepare("SELECT user_id, ign, status FROM clan_applications WHERE guild_id = ? ORDER BY status, id")
            .all(guildId);
        const line = (s) => rows
            .filter((r) => r.status === s)
            .map((r) => `• <@${r.user_id}>${r.ign ? ` (\`${r.ign}\`)` : ""}`)
            .join("\n") || "_—_";
        const filled = countAcceptedClanMembers(guildId);
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLORS.green)
                    .setTitle(`Bewerbungen · ${filled}/${clan.max_slots}`)
                    .addFields({ name: "✅ Angenommen (zählen)", value: line("accepted").slice(0, 1024) }, { name: "⏳ Offen", value: line("pending").slice(0, 1024) }, { name: "❌ Abgelehnt", value: line("rejected").slice(0, 1024) }),
            ],
            flags: 64,
        });
        return;
    }
    const target = interaction.options.getUser("user", true);
    if (sub === "annehmen") {
        await setApplicationStatus(interaction, guildId, target.id, "accepted");
        return;
    }
    if (sub === "ablehnen") {
        await setApplicationStatus(interaction, guildId, target.id, "rejected");
        return;
    }
    await setApplicationStatus(interaction, guildId, target.id, "removed");
}
async function setApplicationStatus(interaction, guildId, userId, status) {
    const config = getGuild(guildId);
    const member = interaction.member;
    if (!member || typeof member === "string" || !isStaff(member, config)) {
        throw new Error("Nur das Team kann Bewerbungen entscheiden.");
    }
    const clan = getClan(guildId);
    const existing = db
        .prepare("SELECT status FROM clan_applications WHERE guild_id = ? AND user_id = ?")
        .get(guildId, userId);
    if (status === "removed") {
        db.prepare("DELETE FROM clan_applications WHERE guild_id = ? AND user_id = ?").run(guildId, userId);
        await refreshClanPanels(interaction.client, guildId);
        const filled = countAcceptedClanMembers(guildId);
        await interaction.reply({
            content: `<@${userId}> ist raus. Plätze jetzt **${filled}/${clan.max_slots}**.`,
        });
        return;
    }
    if (status === "accepted") {
        const filled = countAcceptedClanMembers(guildId);
        const already = existing?.status === "accepted";
        if (!already && filled >= clan.max_slots)
            throw new Error(`Clan ist voll (${filled}/${clan.max_slots}).`);
        if (!existing) {
            db.prepare("INSERT INTO clan_applications (guild_id, user_id, status, decided_by, created_at, decided_at) VALUES (?, ?, 'accepted', ?, ?, ?)").run(guildId, userId, interaction.user.id, Date.now(), Date.now());
        }
        else if (existing.status !== "accepted") {
            db.prepare("UPDATE clan_applications SET status = 'accepted', decided_by = ?, decided_at = ? WHERE guild_id = ? AND user_id = ?").run(interaction.user.id, Date.now(), guildId, userId);
        }
        await refreshClanPanels(interaction.client, guildId);
        const now = countAcceptedClanMembers(guildId);
        const extra = already ? " War bereits angenommen — Platz wurde **nicht** doppelt gezählt." : "";
        await interaction.reply({ content: `<@${userId}> angenommen. Plätze **${now}/${clan.max_slots}**.${extra}` });
        return;
    }
    if (!existing)
        throw new Error("Keine Bewerbung für diese Person.");
    db.prepare("UPDATE clan_applications SET status = 'rejected', decided_by = ?, decided_at = ? WHERE guild_id = ? AND user_id = ?").run(interaction.user.id, Date.now(), guildId, userId);
    await refreshClanPanels(interaction.client, guildId);
    const filled = countAcceptedClanMembers(guildId);
    await interaction.reply({ content: `<@${userId}> abgelehnt. Plätze **${filled}/${clan.max_slots}**.` });
}
export async function cmdClanPanel(interaction) {
    const guildId = requireGuildId(interaction.guildId);
    getClan(guildId);
    const channel = await resolveTextChannel(interaction);
    const payload = panelPayload(guildId);
    const msg = await channel.send(payload);
    db.prepare("INSERT INTO panels (guild_id, type, channel_id, message_id) VALUES (?, 'clan', ?, ?)").run(guildId, channel.id, msg.id);
    const filled = countAcceptedClanMembers(guildId);
    const clan = getClan(guildId);
    await interaction.reply({ content: `Clan-Panel in ${channel} · **${filled}/${clan.max_slots}**.`, flags: 64 });
}
export async function openClanApplyModal(interaction) {
    const guildId = requireGuildId(interaction.guildId);
    const clan = getClan(guildId);
    const filled = countAcceptedClanMembers(guildId);
    if (filled >= clan.max_slots)
        throw new Error(`Clan ist voll (${filled}/${clan.max_slots}).`);
    const existing = db
        .prepare("SELECT status, ticket_channel_id FROM clan_applications WHERE guild_id = ? AND user_id = ?")
        .get(guildId, interaction.user.id);
    if (existing?.status === "accepted") {
        throw new Error("Du bist bereits im Clan. Dein Platz ist gezählt — eine zweite Bewerbung ändert die Zahl nicht.");
    }
    if (existing?.status === "pending") {
        throw new Error(existing.ticket_channel_id
            ? `Du hast schon eine offene Bewerbung: <#${existing.ticket_channel_id}>`
            : "Du hast schon eine offene Bewerbung.");
    }
    const modal = new ModalBuilder().setCustomId("clan:apply").setTitle(`Bewerbung · ${clan.name}`.slice(0, 45));
    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId("ign")
        .setLabel("Minecraft-Name")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(32)), new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId("note")
        .setLabel("Kurz über dich (PvP, Farm, …)")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(500)));
    await interaction.showModal(modal);
}
export async function submitClanApplication(interaction) {
    const guildId = requireGuildId(interaction.guildId);
    const clan = getClan(guildId);
    const config = getGuild(guildId);
    const filled = countAcceptedClanMembers(guildId);
    if (filled >= clan.max_slots)
        throw new Error(`Clan ist voll (${filled}/${clan.max_slots}).`);
    const ign = interaction.fields.getTextInputValue("ign").trim();
    const note = interaction.fields.getTextInputValue("note").trim() || "—";
    const existing = db
        .prepare("SELECT status FROM clan_applications WHERE guild_id = ? AND user_id = ?")
        .get(guildId, interaction.user.id);
    if (existing?.status === "accepted")
        throw new Error("Du bist bereits im Clan.");
    if (existing?.status === "pending")
        throw new Error("Du hast schon eine offene Bewerbung.");
    const prices = listClanPrices(guildId);
    const shopPay = clan.pay_recipient || config.default_pay_recipient || "FriendsWithMny";
    const entry = prices[0];
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const channel = await createTicketChannel({
        guild: interaction.guild,
        config,
        member,
        prefix: "clan",
        topic: `Clan-Bewerbung ${ign} · ${interaction.user.tag}`,
    });
    const ticketId = insertTicket({
        guild_id: guildId,
        channel_id: channel.id,
        user_id: interaction.user.id,
        type: "clan",
        quantity: 1,
        unit_price: entry?.amount ?? null,
        total: entry?.amount ?? null,
        pay_recipient: shopPay,
        seller_id: interaction.client.user.id,
    });
    const now = Date.now();
    if (existing) {
        db.prepare(`UPDATE clan_applications SET ign = ?, note = ?, status = 'pending', ticket_channel_id = ?, ticket_id = ?,
       decided_by = NULL, decided_at = NULL, created_at = ? WHERE guild_id = ? AND user_id = ?`).run(ign, note, channel.id, ticketId, now, guildId, interaction.user.id);
    }
    else {
        db.prepare(`INSERT INTO clan_applications (guild_id, user_id, ign, note, status, ticket_channel_id, ticket_id, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`).run(guildId, interaction.user.id, ign, note, channel.id, ticketId, now);
    }
    const embeds = [
        new EmbedBuilder()
            .setColor(COLORS.green)
            .setTitle(`🤝 Bewerbung · ${clan.name}`)
            .setDescription(`Hallo ${member}\n\n**Plätze aktuell:** ${filled}/${clan.max_slots} — nach Annahme zählt diese Person **einmal**.`)
            .addFields({ name: "Minecraft", value: `\`${ign}\``, inline: true }, { name: "Discord", value: `${member}`, inline: true }, { name: "Über dich", value: note.slice(0, 1024) })
            .setFooter({ text: `${config.community_name} · Clan-Bewerbung` }),
    ];
    if (entry) {
        embeds.push(paymentEmbed({
            config,
            productName: `Clan-Eintritt · ${clan.name}`,
            quantity: 1,
            unitPrice: entry.amount,
            total: entry.amount,
            sellerId: interaction.client.user.id,
            payRecipient: shopPay,
            buyerId: interaction.user.id,
            sku: "Clan",
        }));
    }
    await channel.send({
        content: `${member}${config.staff_role_id ? ` · <@&${config.staff_role_id}>` : ""}`,
        embeds,
        components: [clanTicketControls(interaction.user.id), ticketControls(ticketId)],
    });
    await interaction.reply({
        content: `Bewerbung offen: ${channel}\nPlätze unverändert **${filled}/${clan.max_slots}** bis zur Annahme.`,
        flags: 64,
    });
}
export async function handleClanDecision(interaction, action, userId) {
    const guildId = requireGuildId(interaction.guildId);
    const status = action === "accept" ? "accepted" : action === "kick" ? "removed" : "rejected";
    await setApplicationStatus(interaction, guildId, userId, status);
}
