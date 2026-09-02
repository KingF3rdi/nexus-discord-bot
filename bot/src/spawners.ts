import {
  ActionRowBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ModalBuilder,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { db, ensureDefaultSpawners, getGuild, listSpawners, requireGuildId, type Spawner } from "./db.js";
import { paymentEmbed, spawnerButtons, spawnerPanelEmbed, ticketControls, warningEmbed } from "./embeds.js";
import { COLORS, formatMillions, formatMoney, parsePrice } from "./util.js";
import { createTicketChannel, insertTicket, resolveTextChannel } from "./tickets.js";

function priceLine(s: Spawner) {
  return `**${s.name}** · 📥 \`${formatMillions(s.buy_price)}\` · 📤 \`${formatMillions(s.sell_price)}\``;
}

export async function cmdSpawner(interaction: ChatInputCommandInteraction) {
  const guildId = requireGuildId(interaction.guildId);
  ensureDefaultSpawners(guildId);
  const sub = interaction.options.getSubcommand();
  if (sub === "liste") {
    const rows = listSpawners(guildId);
    const body = rows.map((s) => `\`${s.id}\` ${priceLine(s)}`).join("\n") || "_Keine Spawner._";
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(COLORS.green).setTitle("Spawner-Preise").setDescription(body)],
      flags: 64,
    });
    return;
  }
  if (sub === "entfernen") {
    const name = interaction.options.getString("name", true);
    db.prepare("DELETE FROM spawners WHERE guild_id = ? AND lower(name) = lower(?)").run(guildId, name);
    await interaction.reply({ content: `Spawner **${name}** entfernt. Panel mit \`/spawner-panel\` neu senden.`, flags: 64 });
    return;
  }
  const name = interaction.options.getString("name", true).trim();
  const buy = parsePrice(interaction.options.getString("ankauf", true));
  const sell = parsePrice(interaction.options.getString("verkauf", true));
  const existing = db
    .prepare("SELECT id FROM spawners WHERE guild_id = ? AND lower(name) = lower(?)")
    .get(guildId, name) as { id: number } | undefined;
  if (existing) {
    db.prepare("UPDATE spawners SET buy_price = ?, sell_price = ? WHERE id = ?").run(buy, sell, existing.id);
  } else {
    db.prepare("INSERT INTO spawners (guild_id, name, buy_price, sell_price, sort_order) VALUES (?, ?, ?, ?, 99)").run(
      guildId,
      name,
      buy,
      sell,
    );
  }
  await interaction.reply({
    content: `**${name}** gespeichert: Ankauf \`${formatMillions(buy)}\` · Verkauf \`${formatMillions(sell)}\`.\nPanel mit \`/spawner-panel\` neu senden.`,
    flags: 64,
  });
}

export async function cmdSpawnerPanel(interaction: ChatInputCommandInteraction) {
  const guildId = requireGuildId(interaction.guildId);
  ensureDefaultSpawners(guildId);
  const config = getGuild(guildId);
  const spawners = listSpawners(guildId);
  const channel = await resolveTextChannel(interaction);
  const notify = interaction.options.getChannel("benachrichtigung");
  const msg = await channel.send({
    embeds: [spawnerPanelEmbed(config, spawners, notify?.id)],
    components: [spawnerButtons()],
  });
  db.prepare("INSERT INTO panels (guild_id, type, channel_id, message_id, extra) VALUES (?, 'spawner', ?, ?, ?)").run(
    guildId,
    channel.id,
    msg.id,
    notify?.id ?? null,
  );
  await interaction.reply({ content: `Spawner-Panel in ${channel} gesendet.`, flags: 64 });
}

export async function openSpawnerPicker(interaction: ButtonInteraction, direction: "buy" | "sell") {
  const guildId = requireGuildId(interaction.guildId);
  ensureDefaultSpawners(guildId);
  const spawners = listSpawners(guildId).filter((s) => (direction === "buy" ? s.sell_price != null : s.buy_price != null));
  if (!spawners.length) {
    await interaction.reply({
      embeds: [
        warningEmbed(
          direction === "buy"
            ? "Aktuell sind keine Spawner im Verkauf (alles auf STOP)."
            : "Aktuell kaufen wir keine Spawner an.",
          COLORS.yellow,
        ),
      ],
      flags: 64,
    });
    return;
  }
  const label = direction === "buy" ? "kaufen" : "verkaufen";
  await interaction.reply({
    content: `Welchen Spawner möchtest du **${label}**?`,
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`spawner:pick:${direction}`)
          .setPlaceholder("Spawner auswählen ...")
          .addOptions(
            spawners.slice(0, 25).map((s) => ({
              label: s.name,
              value: String(s.id),
              description:
                direction === "buy"
                  ? `Verkauf ${formatMillions(s.sell_price)}`
                  : `Ankauf ${formatMillions(s.buy_price)}`,
            })),
          ),
      ),
    ],
    flags: 64,
  });
}

export async function openSpawnerQtyModal(interaction: StringSelectMenuInteraction) {
  const direction = interaction.customId.endsWith(":buy") ? "buy" : "sell";
  const id = Number(interaction.values[0]);
  const spawner = db.prepare("SELECT * FROM spawners WHERE id = ?").get(id) as Spawner | undefined;
  if (!spawner) throw new Error("Spawner nicht gefunden.");
  const price = direction === "buy" ? spawner.sell_price : spawner.buy_price;
  if (price == null) throw new Error(`**${spawner.name}** ist für diese Richtung auf STOP.`);
  const title = direction === "buy" ? `Kaufen · ${spawner.name}` : `Verkaufen · ${spawner.name}`;
  const modal = new ModalBuilder().setCustomId(`spawner:qty:${direction}:${id}`).setTitle(title.slice(0, 45));
  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("qty")
        .setLabel("Menge")
        .setStyle(TextInputStyle.Short)
        .setValue("1")
        .setRequired(true)
        .setMaxLength(3),
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("ign")
        .setLabel("Dein Minecraft-Name (für /pay)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(32),
    ),
  );
  await interaction.showModal(modal);
}

export async function openSpawnerTicket(interaction: ModalSubmitInteraction, direction: "buy" | "sell", spawnerId: number) {
  const guildId = requireGuildId(interaction.guildId);
  const spawner = db.prepare("SELECT * FROM spawners WHERE id = ? AND guild_id = ?").get(spawnerId, guildId) as
    | Spawner
    | undefined;
  if (!spawner) throw new Error("Spawner nicht gefunden.");
  const unit = direction === "buy" ? spawner.sell_price : spawner.buy_price;
  if (unit == null) throw new Error(`**${spawner.name}** ist auf STOP.`);
  const qty = Number(interaction.fields.getTextInputValue("qty"));
  if (!Number.isInteger(qty) || qty < 1 || qty > 999) throw new Error("Bitte eine Menge zwischen 1 und 999 eingeben.");
  const ign = interaction.fields.getTextInputValue("ign").trim();
  if (!ign) throw new Error("Minecraft-Name fehlt.");
  const total = unit * qty;
  const config = getGuild(guildId);
  const member = await interaction.guild!.members.fetch(interaction.user.id);
  const shopPay = config.default_pay_recipient || "FriendsWithMny";
  const payTo = direction === "buy" ? shopPay : ign;
  const channel = await createTicketChannel({
    guild: interaction.guild!,
    config,
    member,
    prefix: direction === "buy" ? "spawner-kauf" : "spawner-ankauf",
    topic: `${direction === "buy" ? "Kauf" : "Ankauf"} ${qty}× ${spawner.name} · ${interaction.user.tag}`,
  });
  const ticketId = insertTicket({
    guild_id: guildId,
    channel_id: channel.id,
    user_id: interaction.user.id,
    type: direction === "buy" ? "spawner-buy" : "spawner-sell",
    quantity: qty,
    unit_price: unit,
    total,
    pay_recipient: payTo,
    seller_id: direction === "buy" ? interaction.client.user.id : interaction.user.id,
  });
  const heading =
    direction === "buy"
      ? `Hallo ${member}, hier ist deine **Kauf**-Anfrage.`
      : `Hallo ${member}, hier ist deine **Ankauf**-Anfrage (du verkaufst an uns).`;
  const whoPays =
    direction === "buy"
      ? `Du zahlst an \`${shopPay}\`.`
      : `Das Team zahlt an \`${ign}\`.`;
  await channel.send({
    content: `${member}${config.staff_role_id ? ` · <@&${config.staff_role_id}>` : ""}`,
    embeds: [
      paymentEmbed({
        config,
        productName: `${spawner.name}-Spawner`,
        quantity: qty,
        unitPrice: unit,
        total,
        sellerId: direction === "buy" ? interaction.client.user.id : interaction.user.id,
        payRecipient: payTo,
        buyerId: interaction.user.id,
        sku: direction === "buy" ? "Spawner-Kauf" : "Spawner-Ankauf",
      }).setTitle(direction === "buy" ? "📤 Spawner-Kauf" : "📥 Spawner-Ankauf")
        .setDescription(`${heading}\n${whoPays}\nEinzelpreis: **${formatMillions(unit)}** · Gesamt **${formatMoney(total)}**`),
    ],
    components: [ticketControls(ticketId)],
  });
  await interaction.reply({
    content: `Ticket geöffnet: ${channel}\n**${qty}× ${spawner.name}** · Gesamt **${formatMoney(total)}**`,
    flags: 64,
  });
}
