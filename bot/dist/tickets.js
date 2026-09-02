import { ChannelType, PermissionFlagsBits, } from "discord.js";
import { countOpenByService, countOpenTickets, db, getGuild } from "./db.js";
import { channelSlug } from "./util.js";
export async function resolveTextChannel(interaction, option = "kanal") {
    const ch = interaction.options.getChannel(option) ?? interaction.channel;
    const type = ch && "type" in ch ? ch.type : null;
    if (type !== ChannelType.GuildText && type !== ChannelType.GuildAnnouncement) {
        throw new Error("Bitte einen Textkanal wählen.");
    }
    return ch;
}
export async function staffOverwrites(guild, config, userId, extraRoleIds = []) {
    const overwrites = [
        {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
        },
        {
            id: userId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks,
            ],
        },
    ];
    const roleIds = [...new Set([config.staff_role_id, ...extraRoleIds].filter(Boolean))];
    for (const roleId of roleIds) {
        overwrites.push({
            id: roleId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks,
            ],
        });
    }
    const me = guild.members.me;
    if (me) {
        overwrites.push({
            id: me.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.AttachFiles,
            ],
        });
    }
    return overwrites;
}
export async function createTicketChannel(opts) {
    const parent = opts.config.ticket_category_id ?? undefined;
    return opts.guild.channels.create({
        name: `${opts.prefix}-${channelSlug(opts.member.displayName)}`,
        type: ChannelType.GuildText,
        parent,
        topic: opts.topic,
        permissionOverwrites: await staffOverwrites(opts.guild, opts.config, opts.member.id, opts.extraStaffRoleIds ?? []),
    });
}
export function assertCanOpenSupportTicket(guildId, userId, config) {
    if (!config.one_ticket_limit)
        return;
    const open = countOpenTickets(guildId, userId, "support");
    if (open >= 1) {
        throw new Error("Du hast bereits ein offenes Support-Ticket. Bitte warte, bis es geschlossen wird.");
    }
}
export function assertServiceCapacity(guildId, service) {
    if (!service.enabled)
        throw new Error(`**${service.name}** ist derzeit nicht verfügbar.`);
    const open = countOpenByService(guildId, service.id);
    if (open >= service.max_open) {
        throw new Error(`🟡 **${service.max_open}/${service.max_open} Tickets – Limit erreicht** für ${service.name}.`);
    }
}
export function insertTicket(row) {
    const result = db
        .prepare(`INSERT INTO tickets (
        guild_id, channel_id, user_id, type, category_id, service_id, product_id,
        quantity, unit_price, total, pay_recipient, seller_id, product_name, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`)
        .run(row.guild_id, row.channel_id, row.user_id, row.type, row.category_id ?? null, row.service_id ?? null, row.product_id ?? null, row.quantity ?? 1, row.unit_price ?? null, row.total ?? null, row.pay_recipient ?? null, row.seller_id ?? null, row.product_name ?? null, Date.now());
    return Number(result.lastInsertRowid);
}
export function getTicketByChannel(channelId) {
    return db.prepare("SELECT * FROM tickets WHERE channel_id = ?").get(channelId);
}
export function hasStaffRole(member, roleId) {
    if (!member || !roleId)
        return false;
    if ("cache" in member.roles)
        return member.roles.cache.has(roleId);
    return member.roles.includes(roleId);
}
export function isStaff(member, config, ticketType) {
    if (!member)
        return false;
    const perms = member.permissions;
    const canManage = typeof perms === "string"
        ? (BigInt(perms) & PermissionFlagsBits.ManageGuild) === PermissionFlagsBits.ManageGuild
        : perms.has(PermissionFlagsBits.ManageGuild);
    if (canManage)
        return true;
    if (hasStaffRole(member, config.staff_role_id))
        return true;
    if (ticketType?.startsWith("spawner") && hasStaffRole(member, config.spawner_staff_role_id))
        return true;
    return false;
}
export function staffMention(config, ticketType) {
    if (ticketType?.startsWith("spawner") && config.spawner_staff_role_id) {
        return ` · <@&${config.spawner_staff_role_id}>`;
    }
    return config.staff_role_id ? ` · <@&${config.staff_role_id}>` : "";
}
export { getGuild };
