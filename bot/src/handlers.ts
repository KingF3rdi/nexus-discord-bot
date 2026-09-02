import {
  ActionRowBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Client,
  EmbedBuilder,
  ModalBuilder,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
  type UserSelectMenuInteraction,
} from "discord.js";
import {
  buyButton,
  customEmbed,
  footer,
  giveawayEmbed,
  giveawayJoinButton,
  paymentEmbed,
  productBuyEmbed,
  productListingEmbed,
  servicePanelEmbed,
  serviceSelect,
  ticketControls,
  ticketPanelEmbed,
  ticketSelect,
  vouchEmbed,
  vouchLookupEmbed,
  vouchUserSelect,
  warningEmbed,
  winnersEmbed,
} from "./embeds.js";
import {
  countOpenByService,
  db,
  ensureDefaultCategories,
  getGuild,
  requireGuildId,
  updateGuild,
} from "./db.js";
import {
  COLORS,
  formatMoney,
  parseColor,
  parseDuration,
  payCommand,
  shortId,
  stars,
} from "./util.js";
import {
  assertCanOpenSupportTicket,
  assertServiceCapacity,
  createTicketChannel,
  getTicketByChannel,
  insertTicket,
  isStaff,
  resolveTextChannel,
} from "./tickets.js";
import { helpText } from "./commands.js";
import { cmdSpawner, cmdSpawnerPanel, openSpawnerPicker, openSpawnerQtyModal, openSpawnerTicket } from "./spawners.js";
import { cmdClan, cmdClanPanel, handleClanDecision, openClanApplyModal, submitClanApplication } from "./clan.js";

type AnyInteraction =
  | ChatInputCommandInteraction
  | ButtonInteraction
  | StringSelectMenuInteraction
  | UserSelectMenuInteraction
  | ModalSubmitInteraction;

async function replyError(interaction: AnyInteraction, message: string) {
  const payload = { embeds: [warningEmbed(message, COLORS.red)], flags: 64 };
  if (interaction.deferred || interaction.replied) {
    await interaction.followUp(payload);
  } else {
    await interaction.reply(payload);
  }
}

export async function handleChatCommand(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: "Dieser Bot funktioniert nur auf Servern.", flags: 64 });
    return;
  }
  const name = interaction.commandName;
  try {
    switch (name) {
      case "setup":
        await cmdSetup(interaction);
        break;
      case "sagen":
        await cmdSay(interaction);
        break;
      case "embed":
        await cmdEmbed(interaction);
        break;
      case "ticket-kategorie":
        await cmdTicketCategory(interaction);
        break;
      case "ticket-panel":
        await cmdTicketPanel(interaction);
        break;
      case "produkt":
        await cmdProduct(interaction);
        break;
      case "buy-panel":
        await cmdBuyPanel(interaction);
        break;
      case "service":
        await cmdService(interaction);
        break;
      case "service-panel":
        await cmdServicePanel(interaction);
        break;
      case "giveaway":
        await cmdGiveaway(interaction);
        break;
      case "vouch":
        await cmdVouch(interaction);
        break;
      case "vouch-panel":
        await cmdVouchPanel(interaction);
        break;
      case "spawner":
        await cmdSpawner(interaction);
        break;
      case "spawner-panel":
        await cmdSpawnerPanel(interaction);
        break;
      case "clan":
        await cmdClan(interaction);
        break;
      case "clan-panel":
        await cmdClanPanel(interaction);
        break;
      case "pay":
        await cmdPay(interaction);
        break;
      case "ticket":
        await cmdTicket(interaction);
        break;
      case "help":
        await interaction.reply({
          embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(helpText())],
          flags: 64,
        });
        break;
      default:
        await interaction.reply({ content: "Unbekannter Befehl.", flags: 64 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
    await replyError(interaction, message);
  }
}

async function cmdSetup(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand();
  if (sub === "anzeigen") {
    const g = getGuild(interaction.guildId);
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.green)
          .setTitle("Server-Setup")
          .addFields(
            { name: "Community", value: g.community_name, inline: true },
            { name: "Footer", value: g.footer, inline: true },
            { name: "Ticket-Kategorie", value: g.ticket_category_id ? `<#${g.ticket_category_id}>` : "—", inline: true },
            { name: "Team-Rolle", value: g.staff_role_id ? `<@&${g.staff_role_id}>` : "—", inline: true },
            { name: "Log-Kanal", value: g.log_channel_id ? `<#${g.log_channel_id}>` : "—", inline: true },
            { name: "Pay-Empfänger", value: g.default_pay_recipient ? `\`${g.default_pay_recipient}\`` : "—", inline: true },
          ),
      ],
      flags: 64,
    });
    return;
  }
  const name = interaction.options.getString("name");
  const category = interaction.options.getChannel("ticket_kategorie");
  const role = interaction.options.getRole("team_rolle");
  const log = interaction.options.getChannel("log_kanal");
  const pay = interaction.options.getString("pay_empfaenger");
  const footerText = interaction.options.getString("footer");
  updateGuild(interaction.guildId, {
    ...(name ? { community_name: name } : {}),
    ...(category ? { ticket_category_id: category.id } : {}),
    ...(role ? { staff_role_id: role.id } : {}),
    ...(log ? { log_channel_id: log.id } : {}),
    ...(pay ? { default_pay_recipient: pay } : {}),
    ...(footerText ? { footer: footerText } : {}),
  });
  await interaction.reply({
    embeds: [warningEmbed("Setup gespeichert. Ticket-Panels und Buy-Panels nutzen ab jetzt diese Werte.", COLORS.green)],
    flags: 64,
  });
}

async function cmdSay(interaction: ChatInputCommandInteraction) {
  const text = interaction.options.getString("text", true);
  const asEmbed = interaction.options.getBoolean("embed") ?? false;
  const title = interaction.options.getString("titel");
  const color = parseColor(interaction.options.getString("farbe"));
  const channel = await resolveTextChannel(interaction);
  if (asEmbed) {
    await channel.send({ embeds: [customEmbed({ title, description: text, color })] });
  } else {
    await channel.send({ content: text });
  }
  await interaction.reply({ content: `Nachricht in ${channel} gesendet.`, flags: 64 });
}

async function cmdEmbed(interaction: ChatInputCommandInteraction) {
  const description = interaction.options.getString("beschreibung", true);
  const title = interaction.options.getString("titel");
  const color = parseColor(interaction.options.getString("farbe"));
  const image = interaction.options.getString("bild");
  const footerText = interaction.options.getString("footer");
  const channel = await resolveTextChannel(interaction);
  await channel.send({ embeds: [customEmbed({ title, description, color, image, footer: footerText })] });
  await interaction.reply({ content: `Embed in ${channel} gesendet.`, flags: 64 });
}

async function cmdTicketCategory(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand();
  ensureDefaultCategories(interaction.guildId);
  if (sub === "hinzufuegen") {
    const result = db
      .prepare(
        "INSERT INTO ticket_categories (guild_id, name, emoji, description, type, sort_order) VALUES (?, ?, ?, ?, 'support', 99)",
      )
      .run(
        interaction.guildId,
        interaction.options.getString("name", true),
        interaction.options.getString("emoji", true),
        interaction.options.getString("beschreibung", true),
      );
    await interaction.reply({
      content: `Kategorie **#${result.lastInsertRowid}** gespeichert. Sende das Panel neu mit \`/ticket-panel\`.`,
      flags: 64,
    });
    return;
  }
  if (sub === "entfernen") {
    const id = interaction.options.getInteger("id", true);
    db.prepare("DELETE FROM ticket_categories WHERE id = ? AND guild_id = ?").run(id, interaction.guildId);
    await interaction.reply({ content: `Kategorie ${id} entfernt.`, flags: 64 });
    return;
  }
  const rows = db
    .prepare("SELECT * FROM ticket_categories WHERE guild_id = ? ORDER BY sort_order, id")
    .all(interaction.guildId) as { id: number; emoji: string; name: string; description: string }[];
  const body = rows.map((r) => `\`${r.id}\` ${r.emoji} **${r.name}** — ${r.description}`).join("\n") || "_Keine Kategorien._";
  await interaction.reply({
    embeds: [new EmbedBuilder().setColor(COLORS.green).setTitle("Ticket-Kategorien").setDescription(body)],
    flags: 64,
  });
}

async function cmdTicketPanel(interaction: ChatInputCommandInteraction) {
  ensureDefaultCategories(interaction.guildId);
  const config = getGuild(interaction.guildId);
  const categories = db
    .prepare("SELECT * FROM ticket_categories WHERE guild_id = ? AND enabled = 1 AND type != 'verify' ORDER BY sort_order, id")
    .all(interaction.guildId) as { id: number; emoji: string; name: string; description: string }[];
  if (!categories.length) throw new Error("Lege zuerst Kategorien mit `/ticket-kategorie hinzufuegen` an.");
  const channel = await resolveTextChannel(interaction);
  const msg = await channel.send({
    embeds: [ticketPanelEmbed(config, categories)],
    components: [ticketSelect("main", categories)],
  });
  db.prepare("INSERT INTO panels (guild_id, type, channel_id, message_id) VALUES (?, 'ticket', ?, ?)").run(
    interaction.guildId,
    channel.id,
    msg.id,
  );
  await interaction.reply({ content: `Ticket-Panel in ${channel} gesendet.`, flags: 64 });
}

async function cmdProduct(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand();
  if (sub === "erstellen") {
    const seller = interaction.options.getUser("verkaeufer", true);
    const result = db
      .prepare(
        `INSERT INTO products (
          guild_id, name, description, greeting, warning, price, seller_id, pay_recipient,
          image_url, unlimited, status, sku, button_label
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', ?, ?)`,
      )
      .run(
        interaction.guildId,
        interaction.options.getString("name", true),
        interaction.options.getString("beschreibung") ?? "Zum Verkauf steht dieses Angebot:",
        interaction.options.getString("begruessung"),
        interaction.options.getString("warnung"),
        interaction.options.getInteger("preis", true),
        seller.id,
        interaction.options.getString("empfaenger", true),
        interaction.options.getString("bild"),
        interaction.options.getBoolean("unlimitiert") === false ? 0 : 1,
        interaction.options.getString("sku"),
        interaction.options.getString("button") ?? "Kaufen",
      );
    await interaction.reply({
      content: `Produkt **#${result.lastInsertRowid}** gespeichert. Sende es mit \`/buy-panel produkt_id:${result.lastInsertRowid}\`.`,
      flags: 64,
    });
    return;
  }
  if (sub === "entfernen") {
    const id = interaction.options.getInteger("id", true);
    db.prepare("DELETE FROM products WHERE id = ? AND guild_id = ?").run(id, interaction.guildId);
    await interaction.reply({ content: `Produkt ${id} entfernt.`, flags: 64 });
    return;
  }
  const rows = db.prepare("SELECT id, name, price, pay_recipient FROM products WHERE guild_id = ?").all(interaction.guildId) as {
    id: number;
    name: string;
    price: number;
    pay_recipient: string;
  }[];
  const body =
    rows.map((r) => `\`${r.id}\` **${r.name}** — ${formatMoney(r.price)} · /pay \`${r.pay_recipient}\``).join("\n") ||
    "_Keine Produkte. Nutze `/produkt erstellen`._";
  await interaction.reply({
    embeds: [new EmbedBuilder().setColor(COLORS.green).setTitle("Produkte").setDescription(body)],
    flags: 64,
  });
}

async function cmdBuyPanel(interaction: ChatInputCommandInteraction) {
  const id = interaction.options.getInteger("produkt_id", true);
  const product = db.prepare("SELECT * FROM products WHERE id = ? AND guild_id = ?").get(id, interaction.guildId) as
    | {
        id: number;
        name: string;
        description: string;
        greeting: string | null;
        warning: string | null;
        price: number;
        seller_id: string;
        pay_recipient: string;
        image_url: string | null;
        unlimited: number;
        status: string;
        sku: string | null;
        button_label: string;
      }
    | undefined;
  if (!product) throw new Error("Produkt nicht gefunden. `/produkt liste` zeigt alle IDs.");
  const config = getGuild(interaction.guildId);
  const channel = await resolveTextChannel(interaction);
  const listing = interaction.options.getBoolean("listing") ?? true;
  if (listing) {
    await channel.send({ embeds: [productListingEmbed(config, product)] });
  }
  const msg = await channel.send({
    embeds: [productBuyEmbed(config, product)],
    components: [buyButton(product.id, product.button_label)],
  });
  db.prepare("INSERT INTO panels (guild_id, type, channel_id, message_id, extra) VALUES (?, 'buy', ?, ?, ?)").run(
    interaction.guildId,
    channel.id,
    msg.id,
    String(product.id),
  );
  await interaction.reply({ content: `Buy-Panel für **${product.name}** in ${channel} gesendet.`, flags: 64 });
}

async function cmdService(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand();
  if (sub === "hinzufuegen") {
    const result = db
      .prepare(
        "INSERT INTO services (guild_id, name, emoji, description, important, enabled, max_open) VALUES (?, ?, ?, ?, ?, 1, ?)",
      )
      .run(
        interaction.guildId,
        interaction.options.getString("name", true),
        interaction.options.getString("emoji", true),
        interaction.options.getString("beschreibung", true),
        interaction.options.getString("wichtig"),
        interaction.options.getInteger("limit") ?? 10,
      );
    await interaction.reply({
      content: `Service **#${result.lastInsertRowid}** gespeichert. Panel mit \`/service-panel\` senden.`,
      flags: 64,
    });
    return;
  }
  if (sub === "status") {
    const id = interaction.options.getInteger("id", true);
    const aktiv = interaction.options.getBoolean("aktiv", true);
    db.prepare("UPDATE services SET enabled = ? WHERE id = ? AND guild_id = ?").run(aktiv ? 1 : 0, id, interaction.guildId);
    await interaction.reply({ content: `Service ${id} ist jetzt ${aktiv ? "aktiv" : "deaktiviert"}.`, flags: 64 });
    return;
  }
  const rows = db.prepare("SELECT * FROM services WHERE guild_id = ?").all(interaction.guildId) as {
    id: number;
    name: string;
    emoji: string;
    enabled: number;
    max_open: number;
  }[];
  const body =
    rows.map((s) => `\`${s.id}\` ${s.emoji} **${s.name}** — ${s.enabled ? "aktiv" : "aus"} · Limit ${s.max_open}`).join("\n") ||
    "_Keine Services._";
  await interaction.reply({
    embeds: [new EmbedBuilder().setColor(COLORS.green).setTitle("Services").setDescription(body)],
    flags: 64,
  });
}

function loadServices(guildId: string | null) {
  const id = requireGuildId(guildId);
  const rows = db.prepare("SELECT * FROM services WHERE guild_id = ?").all(id) as {
    id: number;
    name: string;
    emoji: string;
    description: string;
    important: string | null;
    enabled: number;
    max_open: number;
  }[];
  return rows.map((s) => ({ ...s, open: countOpenByService(id, s.id) }));
}

async function cmdServicePanel(interaction: ChatInputCommandInteraction) {
  const services = loadServices(interaction.guildId);
  if (!services.length) throw new Error("Lege zuerst Services mit `/service hinzufuegen` an.");
  const config = getGuild(interaction.guildId);
  const channel = await resolveTextChannel(interaction);
  const msg = await channel.send({
    embeds: [servicePanelEmbed(config, services)],
    components: [serviceSelect(services)],
  });
  db.prepare("INSERT INTO panels (guild_id, type, channel_id, message_id) VALUES (?, 'service', ?, ?)").run(
    interaction.guildId,
    channel.id,
    msg.id,
  );
  await interaction.reply({ content: `Service-Panel in ${channel} gesendet.`, flags: 64 });
}

async function cmdGiveaway(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand();
  if (sub === "starten") {
    const duration = parseDuration(interaction.options.getString("dauer", true));
    if (!duration) throw new Error("Ungültige Dauer. Beispiele: `30m`, `7h`, `1d`.");
    const publicId = shortId();
    const endsAt = new Date(Date.now() + duration);
    const channel = await resolveTextChannel(interaction);
    const payload = {
      title: interaction.options.getString("titel", true),
      description: interaction.options.getString("beschreibung"),
      prize: interaction.options.getString("gewinne", true),
      endsAt,
      publicId,
    };
    const msg = await channel.send({
      embeds: [giveawayEmbed(payload)],
      components: [giveawayJoinButton(0)],
    });
    const result = db
      .prepare(
        `INSERT INTO giveaways (public_id, guild_id, channel_id, message_id, title, description, prize, winners_count, ends_at, hosted_by, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'running')`,
      )
      .run(
        publicId,
        interaction.guildId,
        channel.id,
        msg.id,
        payload.title,
        payload.description,
        payload.prize,
        interaction.options.getInteger("gewinner", true),
        endsAt.getTime(),
        interaction.user.id,
      );
    const id = Number(result.lastInsertRowid);
    await msg.edit({ components: [giveawayJoinButton(id)] });
    await interaction.reply({ content: `Giveaway \`${publicId}\` in ${channel} gestartet.`, flags: 64 });
    return;
  }
  const publicId = interaction.options.getString("id", true);
  if (sub === "beenden") {
    const n = await finishGiveaway(interaction.client, publicId, true);
    await interaction.reply({ content: n ? `Giveaway \`${publicId}\` ausgelost.` : "Keine Teilnehmer.", flags: 64 });
    return;
  }
  await rerollGiveaway(interaction.client, publicId);
  await interaction.reply({ content: `Reroll für \`${publicId}\` ausgeführt.`, flags: 64 });
}

async function cmdVouch(interaction: ChatInputCommandInteraction) {
  const product = interaction.options.getString("produkt", true);
  const quantity = interaction.options.getInteger("menge", true);
  const price = interaction.options.getInteger("preis", true);
  const buyer = interaction.options.getUser("kaeufer", true);
  const seller = interaction.options.getUser("verkaeufer", true);
  const rating = interaction.options.getInteger("bewertung", true);
  const note = interaction.options.getString("notiz");
  const category = interaction.options.getString("kategorie") ?? "Shop";
  const result = db
    .prepare(
      `INSERT INTO vouches (guild_id, category, product, quantity, price, buyer_id, seller_id, rating, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(interaction.guildId, category, product, quantity, price, buyer.id, seller.id, rating, note, Date.now());
  const id = Number(result.lastInsertRowid);
  const total = (db.prepare("SELECT COUNT(*) AS c FROM vouches WHERE guild_id = ?").get(interaction.guildId) as { c: number }).c;
  const categoryCount = (
    db.prepare("SELECT COUNT(*) AS c FROM vouches WHERE guild_id = ? AND category = ?").get(interaction.guildId, category) as {
      c: number;
    }
  ).c;
  const config = getGuild(interaction.guildId);
  const channel = await resolveTextChannel(interaction);
  await channel.send({
    embeds: [
      vouchEmbed(
        config,
        {
          id,
          category,
          product,
          quantity,
          price,
          buyer_id: buyer.id,
          seller_id: seller.id,
          rating,
          note,
        },
        { categoryCount, total },
      ),
    ],
  });
  await interaction.reply({ content: `Vouch #${id} in ${channel} gepostet.`, flags: 64 });
}

async function cmdVouchPanel(interaction: ChatInputCommandInteraction) {
  const config = getGuild(interaction.guildId);
  const profiles = db
    .prepare("SELECT COUNT(DISTINCT buyer_id) + COUNT(DISTINCT seller_id) AS c FROM vouches WHERE guild_id = ?")
    .get(interaction.guildId) as { c: number };
  const channel = await resolveTextChannel(interaction);
  await channel.send({
    embeds: [vouchLookupEmbed(config, profiles.c || 0)],
    components: [vouchUserSelect()],
  });
  await interaction.reply({ content: `Vouch-Panel in ${channel} gesendet.`, flags: 64 });
}

async function cmdPay(interaction: ChatInputCommandInteraction) {
  const recipient = interaction.options.getString("empfaenger", true);
  const amount = interaction.options.getInteger("betrag", true);
  const qty = interaction.options.getInteger("menge") ?? 1;
  const product = interaction.options.getString("produkt") ?? "Zahlung";
  const total = amount * qty;
  const config = getGuild(interaction.guildId!);
  const sellerId = interaction.user.id;
  await interaction.reply({
    embeds: [
      paymentEmbed({
        config,
        productName: product,
        quantity: qty,
        unitPrice: amount,
        total,
        sellerId,
        payRecipient: recipient,
        buyerId: interaction.user.id,
      }),
    ],
  });
}

async function cmdTicket(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand();
  const ticket = getTicketByChannel(interaction.channelId);
  if (!ticket || ticket.status !== "open") throw new Error("Dieser Befehl geht nur in einem offenen Ticket.");
  const config = getGuild(interaction.guildId);
  const member = interaction.member;
  if (!member || typeof member === "string") throw new Error("Mitglied nicht gefunden.");
  if (sub === "schliessen") {
    if (ticket.user_id !== interaction.user.id && !isStaff(member, config)) {
      throw new Error("Nur das Team oder der Ticket-Ersteller kann schließen.");
    }
    await closeTicket(interaction, ticket.id);
    return;
  }
  if (!isStaff(member, config)) throw new Error("Nur das Team kann User hinzufügen.");
  const user = interaction.options.getUser("user", true);
  const channel = interaction.channel;
  if (!channel || !channel.isTextBased() || channel.isDMBased()) throw new Error("Kein Ticket-Kanal.");
  if ("permissionOverwrites" in channel) {
    await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
  }
  await interaction.reply({ content: `${user} wurde zum Ticket hinzugefügt.` });
}

export async function handleButton(interaction: ButtonInteraction) {
  if (!interaction.inCachedGuild()) return;
  const [kind, action, rawId] = interaction.customId.split(":");
  try {
    if (kind === "buy" && action) {
      await openBuyModal(interaction, Number(action));
      return;
    }
    if (kind === "spawner" && (action === "sell" || action === "buy")) {
      await openSpawnerPicker(interaction, action);
      return;
    }
    if (kind === "gw" && action === "join") {
      await joinGiveaway(interaction, Number(rawId));
      return;
    }
    if (kind === "ticket" && action === "close") {
      await closeTicket(interaction, Number(rawId));
      return;
    }
    if (kind === "ticket" && action === "claim") {
      await claimTicket(interaction, Number(rawId));
      return;
    }
    if (kind === "ticket" && action === "pay") {
      await repostPay(interaction, Number(rawId));
      return;
    }
    if (kind === "clan" && action === "apply") {
      await openClanApplyModal(interaction);
      return;
    }
    if (kind === "clan" && (action === "accept" || action === "reject" || action === "kick") && rawId) {
      await handleClanDecision(interaction, action, rawId);
      return;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fehler.";
    await replyError(interaction, message);
  }
}

export async function handleSelect(interaction: StringSelectMenuInteraction) {
  if (!interaction.inCachedGuild()) return;
  try {
    if (interaction.customId.startsWith("ticket:select")) {
      await openSupportTicket(interaction, Number(interaction.values[0]));
      return;
    }
    if (interaction.customId.startsWith("spawner:pick:")) {
      await openSpawnerQtyModal(interaction);
      return;
    }
    if (interaction.customId === "service:select") {
      await openServiceTicket(interaction, Number(interaction.values[0]));
      return;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fehler.";
    await replyError(interaction, message);
  }
}

export async function handleUserSelect(interaction: UserSelectMenuInteraction) {
  if (!interaction.inCachedGuild()) return;
  try {
    const user = interaction.users.first();
    if (!user) throw new Error("Keine Person ausgewählt.");
    const config = getGuild(interaction.guildId);
    const asBuyer = db
      .prepare("SELECT * FROM vouches WHERE guild_id = ? AND buyer_id = ? ORDER BY id DESC LIMIT 8")
      .all(interaction.guildId, user.id) as { id: number; product: string; rating: number; price: number }[];
    const asSeller = db
      .prepare("SELECT * FROM vouches WHERE guild_id = ? AND seller_id = ? ORDER BY id DESC LIMIT 8")
      .all(interaction.guildId, user.id) as { id: number; product: string; rating: number; price: number }[];
    const avg = (rows: { rating: number }[]) =>
      rows.length ? (rows.reduce((a, r) => a + r.rating, 0) / rows.length).toFixed(2) : "—";
    const list = (rows: typeof asBuyer) =>
      rows.map((r) => `#${r.id} ${stars(r.rating).slice(0, 5)} **${r.product}** · ${formatMoney(r.price)}`).join("\n") || "_Keine Einträge._";
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.yellow)
          .setTitle(`Vouch-Statistik · ${user.displayName}`)
          .setDescription(`${user}`)
          .addFields(
            { name: "Als Käufer", value: `${asBuyer.length} Vouches · Ø ${avg(asBuyer)}\n${list(asBuyer)}`.slice(0, 1024) },
            { name: "Als Verkäufer", value: `${asSeller.length} Vouches · Ø ${avg(asSeller)}\n${list(asSeller)}`.slice(0, 1024) },
          )
          .setFooter({ text: footer(config, "Vouch-Auswertung") }),
      ],
      flags: 64,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fehler.";
    await replyError(interaction, message);
  }
}

export async function handleModal(interaction: import("discord.js").ModalSubmitInteraction) {
  if (!interaction.inCachedGuild()) return;
  try {
    if (interaction.customId.startsWith("buy:qty:")) {
      const productId = Number(interaction.customId.split(":")[2]);
      const qty = Number(interaction.fields.getTextInputValue("qty"));
      if (!Number.isInteger(qty) || qty < 1 || qty > 99) throw new Error("Bitte eine Menge zwischen 1 und 99 eingeben.");
      await openBuyTicket(interaction, productId, qty);
      return;
    }
    if (interaction.customId.startsWith("spawner:qty:")) {
      const parts = interaction.customId.split(":");
      const direction = parts[2] === "buy" ? "buy" : "sell";
      const spawnerId = Number(parts[3]);
      await openSpawnerTicket(interaction, direction, spawnerId);
      return;
    }
    if (interaction.customId === "clan:apply") {
      await submitClanApplication(interaction);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fehler.";
    await replyError(interaction, message);
  }
}

async function openBuyModal(interaction: ButtonInteraction, productId: number) {
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(productId) as { name: string; status: string } | undefined;
  if (!product) throw new Error("Produkt nicht mehr verfügbar.");
  if (product.status !== "available") throw new Error("Dieses Angebot ist derzeit nicht verfügbar.");
  const modal = new ModalBuilder().setCustomId(`buy:qty:${productId}`).setTitle(`Kaufen · ${product.name.slice(0, 30)}`);
  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("qty")
        .setLabel("Menge")
        .setStyle(TextInputStyle.Short)
        .setValue("1")
        .setRequired(true)
        .setMaxLength(2),
    ),
  );
  await interaction.showModal(modal);
}

async function openBuyTicket(
  interaction: import("discord.js").ModalSubmitInteraction,
  productId: number,
  quantity: number,
) {
  const guildId = requireGuildId(interaction.guildId);
  const product = db.prepare("SELECT * FROM products WHERE id = ? AND guild_id = ?").get(productId, guildId) as
    | {
        id: number;
        name: string;
        price: number;
        seller_id: string;
        pay_recipient: string;
        sku: string | null;
        status: string;
      }
    | undefined;
  if (!product || product.status !== "available") throw new Error("Produkt nicht verfügbar.");
  const config = getGuild(guildId);
  const member = await interaction.guild!.members.fetch(interaction.user.id);
  const total = product.price * quantity;
  const channel = await createTicketChannel({
    guild: interaction.guild!,
    config,
    member,
    prefix: "kauf",
    topic: `Kauf ${product.name} × ${quantity} · ${interaction.user.tag}`,
  });
  const ticketId = insertTicket({
    guild_id: guildId,
    channel_id: channel.id,
    user_id: interaction.user.id,
    type: "buy",
    product_id: product.id,
    quantity,
    unit_price: product.price,
    total,
    pay_recipient: product.pay_recipient,
    seller_id: product.seller_id,
  });
  await channel.send({
    content: `${member} · <@${product.seller_id}>${config.staff_role_id ? ` · <@&${config.staff_role_id}>` : ""}`,
    embeds: [
      paymentEmbed({
        config,
        productName: product.name,
        quantity,
        unitPrice: product.price,
        total,
        sellerId: product.seller_id,
        payRecipient: product.pay_recipient,
        buyerId: interaction.user.id,
        sku: product.sku,
      }),
    ],
    components: [ticketControls(ticketId)],
  });
  await interaction.reply({
    content: `Dein Kauf-Ticket wurde geöffnet: ${channel}\nGesamt: **${formatMoney(total)}**`,
    flags: 64,
  });
}

async function openSupportTicket(interaction: StringSelectMenuInteraction, categoryId: number) {
  const guildId = requireGuildId(interaction.guildId);
  const category = db.prepare("SELECT * FROM ticket_categories WHERE id = ? AND guild_id = ?").get(categoryId, guildId) as
    | { id: number; name: string; emoji: string; description: string; type: string }
    | undefined;
  if (!category) throw new Error("Kategorie nicht gefunden.");
  const config = getGuild(guildId);
  assertCanOpenSupportTicket(guildId, interaction.user.id, config);
  const member = await interaction.guild!.members.fetch(interaction.user.id);
  const channel = await createTicketChannel({
    guild: interaction.guild!,
    config,
    member,
    prefix: "ticket",
    topic: `${category.name} · ${interaction.user.tag}`,
  });
  const ticketId = insertTicket({
    guild_id: guildId,
    channel_id: channel.id,
    user_id: interaction.user.id,
    type: "support",
    category_id: category.id,
  });
  await channel.send({
    content: `${member}${config.staff_role_id ? ` · <@&${config.staff_role_id}>` : ""}`,
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.green)
        .setTitle(`${category.emoji} ${category.name}`)
        .setDescription(
          `Hallo ${member}, beschreibe bitte dein Anliegen.\nDas Team wird sich so schnell wie möglich bei dir melden.\n\n${category.description}`,
        )
        .setFooter({ text: footer(config, "Ticket-System") }),
    ],
    components: [ticketControls(ticketId)],
  });
  await interaction.reply({ content: `Ticket geöffnet: ${channel}`, flags: 64 });
  await interaction.message.edit({ components: interaction.message.components }).catch(() => undefined);
}

async function openServiceTicket(interaction: StringSelectMenuInteraction, serviceId: number) {
  const guildId = requireGuildId(interaction.guildId);
  const service = db.prepare("SELECT * FROM services WHERE id = ? AND guild_id = ?").get(serviceId, guildId) as
    | { id: number; name: string; emoji: string; description: string; enabled: number; max_open: number }
    | undefined;
  if (!service) throw new Error("Service nicht gefunden.");
  assertServiceCapacity(guildId, service);
  const config = getGuild(guildId);
  const member = await interaction.guild!.members.fetch(interaction.user.id);
  const channel = await createTicketChannel({
    guild: interaction.guild!,
    config,
    member,
    prefix: "service",
    topic: `${service.name} · ${interaction.user.tag}`,
  });
  const ticketId = insertTicket({
    guild_id: guildId,
    channel_id: channel.id,
    user_id: interaction.user.id,
    type: "service",
    service_id: service.id,
  });
  await channel.send({
    content: `${member}${config.staff_role_id ? ` · <@&${config.staff_role_id}>` : ""}`,
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.green)
        .setTitle(`${service.emoji} ${service.name}`)
        .setDescription(`Hallo ${member},\n${service.description}\n\nBitte beschreibe, was gebaut oder erledigt werden soll.`)
        .setFooter({ text: footer(config, "Service-System") }),
    ],
    components: [ticketControls(ticketId)],
  });
  await interaction.reply({ content: `Service-Ticket geöffnet: ${channel}`, flags: 64 });
}

async function closeTicket(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  ticketId: number,
) {
  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(ticketId) as
    | { id: number; channel_id: string; status: string; user_id: string }
    | undefined;
  if (!ticket || ticket.status !== "open") throw new Error("Ticket ist bereits geschlossen.");
  db.prepare("UPDATE tickets SET status = 'closed' WHERE id = ?").run(ticketId);
  await interaction.reply({
    embeds: [warningEmbed("Ticket wird in 5 Sekunden geschlossen.", COLORS.yellow)],
  });
  setTimeout(() => {
    interaction.channel?.delete("Ticket geschlossen").catch(() => undefined);
  }, 5000);
}

async function claimTicket(interaction: ButtonInteraction, ticketId: number) {
  const config = getGuild(interaction.guildId);
  if (!isStaff(interaction.member, config)) throw new Error("Nur das Team kann Tickets übernehmen.");
  db.prepare("UPDATE tickets SET claimed_by = ? WHERE id = ?").run(interaction.user.id, ticketId);
  await interaction.reply({ content: `${interaction.user} hat das Ticket übernommen.` });
}

async function repostPay(interaction: ButtonInteraction, ticketId: number) {
  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(ticketId) as
    | {
        type: string;
        quantity: number;
        unit_price: number | null;
        total: number | null;
        pay_recipient: string | null;
        seller_id: string | null;
        product_id: number | null;
        user_id: string;
      }
    | undefined;
  if (!ticket || !ticket.total || !ticket.pay_recipient) {
    throw new Error("Für dieses Ticket gibt es keine Zahlung.");
  }
  const product = ticket.product_id
    ? (db.prepare("SELECT name, sku FROM products WHERE id = ?").get(ticket.product_id) as { name: string; sku: string | null })
    : { name: ticket.type.startsWith("spawner") ? "Spawner" : "Bestellung", sku: null };
  const config = getGuild(interaction.guildId);
  await interaction.reply({
    embeds: [
      paymentEmbed({
        config,
        productName: product.name,
        quantity: ticket.quantity,
        unitPrice: ticket.unit_price ?? ticket.total,
        total: ticket.total,
        sellerId: ticket.seller_id ?? interaction.user.id,
        payRecipient: ticket.pay_recipient,
        buyerId: ticket.user_id,
        sku: product.sku,
      }),
    ],
  });
}

async function joinGiveaway(interaction: ButtonInteraction, id: number) {
  const gw = db.prepare("SELECT * FROM giveaways WHERE id = ?").get(id) as { status: string } | undefined;
  if (!gw || gw.status !== "running") throw new Error("Dieses Gewinnspiel ist bereits beendet.");
  const info = db.prepare("INSERT OR IGNORE INTO giveaway_entries (giveaway_id, user_id) VALUES (?, ?)").run(id, interaction.user.id);
  if (!info.changes) {
    await interaction.reply({ content: "Du nimmst bereits teil.", flags: 64 });
    return;
  }
  const count = (db.prepare("SELECT COUNT(*) AS c FROM giveaway_entries WHERE giveaway_id = ?").get(id) as { c: number }).c;
  await interaction.reply({ content: `Du nimmst teil! Aktuell **${count}** Teilnehmer.`, flags: 64 });
}

function pickWinners(userIds: string[], n: number) {
  const pool = [...userIds];
  const winners: string[] = [];
  while (pool.length && winners.length < n) {
    const i = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(i, 1)[0]!);
  }
  return winners;
}

export async function finishGiveaway(client: Client, publicId: string, force = false) {
  const gw = db.prepare("SELECT * FROM giveaways WHERE public_id = ?").get(publicId) as
    | {
        id: number;
        public_id: string;
        guild_id: string;
        channel_id: string;
        message_id: string;
        prize: string;
        winners_count: number;
        status: string;
        ends_at: number;
      }
    | undefined;
  if (!gw) throw new Error("Giveaway nicht gefunden.");
  if (gw.status !== "running" && !force) return 0;
  const entries = db.prepare("SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?").all(gw.id) as { user_id: string }[];
  const winners = pickWinners(entries.map((e) => e.user_id), gw.winners_count);
  db.prepare("UPDATE giveaways SET status = 'ended' WHERE id = ?").run(gw.id);
  const channel = await client.channels.fetch(gw.channel_id).catch(() => null);
  if (channel && channel.isTextBased() && "send" in channel) {
    const lines = winners.length
      ? winners.map((id, i) => `${i + 1}. <@${id}> — **${gw.prize.replace(/^•\s*/, "")}**`)
      : ["Keine Teilnehmer."];
    await channel.send({ embeds: [winnersEmbed(gw.public_id, lines)] });
    if ("messages" in channel) {
      const msg = await channel.messages.fetch(gw.message_id).catch(() => null);
      await msg?.edit({ components: [] }).catch(() => undefined);
    }
  }
  return winners.length;
}

export async function rerollGiveaway(client: Client, publicId: string) {
  const gw = db.prepare("SELECT * FROM giveaways WHERE public_id = ?").get(publicId) as
    | { id: number; public_id: string; prize: string; winners_count: number; channel_id: string }
    | undefined;
  if (!gw) throw new Error("Giveaway nicht gefunden.");
  const entries = db.prepare("SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?").all(gw.id) as { user_id: string }[];
  const winners = pickWinners(entries.map((e) => e.user_id), gw.winners_count);
  const channel = await client.channels.fetch(gw.channel_id).catch(() => null);
  if (channel && channel.isTextBased() && "send" in channel) {
    const lines = winners.length
      ? winners.map((id, i) => `${i + 1}. <@${id}> — **${gw.prize.replace(/^•\s*/, "")}**`)
      : ["Keine Teilnehmer."];
    await channel.send({ content: "Neues Reroll:", embeds: [winnersEmbed(gw.public_id, lines)] });
  }
}

export async function tickGiveaways(client: Client) {
  const due = db
    .prepare("SELECT public_id FROM giveaways WHERE status = 'running' AND ends_at <= ?")
    .all(Date.now()) as { public_id: string }[];
  for (const row of due) {
    await finishGiveaway(client, row.public_id).catch((err) => console.error("Giveaway end failed", err));
  }
}

export { payCommand, formatMoney };
