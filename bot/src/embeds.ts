import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  type ColorResolvable,
} from "discord.js";
import type { GuildConfig } from "./db.js";
import { COLORS, formatDateDe, formatMoney, payCommand, relativeTime, stars } from "./util.js";

export function footer(config: GuildConfig, extra?: string) {
  return extra ? `${config.community_name} · ${extra}` : `${config.community_name} · ${config.footer}`;
}

export function ticketPanelEmbed(
  config: GuildConfig,
  categories: { emoji: string; name: string; description: string }[],
) {
  const lines = categories.map((c) => `${c.emoji} **${c.name}**\n${c.description}`).join("\n\n");
  return new EmbedBuilder()
    .setColor(COLORS.green)
    .setDescription(
      `${lines}\n\n🔒 **Wichtiger Hinweis**\nPro Person ist **ein aktives Support-Ticket** erlaubt (außer Bewerbungen).`,
    )
    .setFooter({ text: footer(config, "Ticket-System") });
}

export function ticketSelect(panelId: string, categories: { id: number; emoji: string; name: string }[]) {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`ticket:select:${panelId}`)
      .setPlaceholder("Wähle dein Anliegen aus ...")
      .addOptions(
        categories.slice(0, 25).map((c) => ({
          label: c.name,
          value: String(c.id),
          emoji: c.emoji,
        })),
      ),
  );
}

export function productListingEmbed(
  config: GuildConfig,
  product: {
    name: string;
    greeting?: string | null;
    description: string;
    warning?: string | null;
    unlimited: number;
    seller_id: string;
    price: number;
  },
) {
  const greeting = product.greeting || `Hallo, liebe **${config.community_name}-Community!**`;
  const availability = product.unlimited
    ? "♾️ **Nicht limitiert**\nDie Map-Art ist **nicht limitiert** und kann von beliebig vielen Spielern erworben werden."
    : "📦 **Limitiert**\nDieses Angebot ist nur in begrenzter Stückzahl verfügbar.";
  const warning = product.warning
    ? `\n\n⚠️ **WICHTIG**\n**${product.warning}**`
    : "";
  return new EmbedBuilder()
    .setColor(COLORS.green)
    .setTitle(`🎨 ${product.name}`)
    .setDescription(
      `${greeting}\n\n${product.description}\n> **${product.name}**\n\n${availability}${warning}\n\n💸 **VERKÄUFER**\nDie Map-Art wird verkauft von:\n<@${product.seller_id}>\n\n💰 **Preis**\n**${formatMoney(product.price)}**`,
    )
    .setFooter({ text: footer(config, "Map-Art-Verkauf") });
}

export function productBuyEmbed(
  config: GuildConfig,
  product: {
    id: number;
    name: string;
    seller_id: string;
    price: number;
    status: string;
    sku?: string | null;
    image_url?: string | null;
  },
) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.green)
    .setDescription(`Die Map-Art wird verkauft von:\n<@${product.seller_id}>`)
    .addFields(
      { name: "💰 Preis", value: `**${formatMoney(product.price)}**`, inline: false },
      {
        name: "Status",
        value: product.status === "available" ? "✅ Verfügbar" : "❌ Nicht verfügbar",
        inline: true,
      },
      { name: "Map-Art-ID", value: product.sku || `#${product.id}`, inline: true },
    )
    .setFooter({ text: footer(config, "Map-Art-Verkauf") })
    .setTimestamp();
  if (product.image_url) embed.setImage(product.image_url);
  return embed;
}

export function buyButton(productId: number, label: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`buy:${productId}`)
      .setStyle(ButtonStyle.Success)
      .setEmoji("🛒")
      .setLabel(label),
  );
}

export function paymentEmbed(opts: {
  config: GuildConfig;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  sellerId: string;
  payRecipient: string;
  buyerId: string;
  sku?: string | null;
}) {
  const cmd = payCommand(opts.payRecipient, opts.total);
  return new EmbedBuilder()
    .setColor(COLORS.green)
    .setTitle("💳 Zahlungsanfrage")
    .setDescription(
      `Hallo <@${opts.buyerId}>, hier ist deine Bestellung.\n\nBitte überweise den Betrag **nur** mit dem Befehl aus dieser Nachricht.`,
    )
    .addFields(
      { name: "📦 Produkt", value: opts.productName, inline: true },
      { name: "⚖️ Menge", value: String(opts.quantity), inline: true },
      { name: "💵 Einzelpreis", value: formatMoney(opts.unitPrice), inline: true },
      { name: "💰 **Gesamt**", value: `**${formatMoney(opts.total)}**`, inline: false },
      { name: "🛡️ Verkäufer", value: `<@${opts.sellerId}>`, inline: true },
      { name: "👤 Zahlungsempfänger", value: `\`${opts.payRecipient}\``, inline: true },
      {
        name: "Zahlungsbefehl — bitte kopieren",
        value: `\`\`\`\n${cmd}\n\`\`\`\nDer sicherste Weg ist, den Befehl **direkt aus dieser Zahlungsanfrage** zu kopieren.`,
      },
    )
    .setFooter({ text: footer(opts.config, opts.sku ? `Bestellung ${opts.sku}` : "Shop") })
    .setTimestamp();
}

export function ticketControls(ticketId: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ticket:claim:${ticketId}`).setStyle(ButtonStyle.Primary).setLabel("Übernehmen"),
    new ButtonBuilder().setCustomId(`ticket:pay:${ticketId}`).setStyle(ButtonStyle.Success).setEmoji("💳").setLabel("Zahlungsbefehl"),
    new ButtonBuilder().setCustomId(`ticket:close:${ticketId}`).setStyle(ButtonStyle.Danger).setLabel("Schließen"),
  );
}

export function servicePanelEmbed(
  config: GuildConfig,
  services: { name: string; emoji: string; description: string; important?: string | null; enabled: number; open: number; max_open: number }[],
) {
  const body = services
    .map((s) => {
      const title = `${s.emoji} **${s.name}**`;
      const desc = s.important ? `${s.description}\n**Wichtig:** ${s.important}` : s.description;
      if (!s.enabled || s.open >= s.max_open) {
        return `~~${title}~~\n~~${desc}~~`;
      }
      return `${title}\n${desc}`;
    })
    .join("\n\n");

  const totalOpen = services.reduce((a, s) => a + s.open, 0);
  const max = Math.max(...services.map((s) => s.max_open), 0);
  const full = services.every((s) => !s.enabled || s.open >= s.max_open);
  const status = full
    ? `🟡 **${max}/${max} Tickets – Limit erreicht**`
    : `🟢 **${totalOpen} offene Service-Tickets**`;

  return new EmbedBuilder()
    .setColor(COLORS.green)
    .setDescription(
      `${body}\n\n${status}\n\nFür die Nutzung unserer Services ist ein verifizierter Minecraft-Account erforderlich.`,
    )
    .setFooter({ text: footer(config, "Service-System") })
    .setTimestamp();
}

export function serviceSelect(services: { id: number; name: string; emoji: string; enabled: number; open: number; max_open: number }[]) {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("service:select")
      .setPlaceholder("Service auswählen ...")
      .addOptions(
        services.slice(0, 25).map((s) => ({
          label: s.name,
          value: String(s.id),
          emoji: s.emoji,
          description: !s.enabled || s.open >= s.max_open ? "Derzeit nicht verfügbar" : "Ticket öffnen",
        })),
      ),
  );
}

export function vouchEmbed(
  config: GuildConfig,
  vouch: {
    id: number;
    category: string;
    product: string;
    quantity: number;
    price: number;
    buyer_id: string;
    seller_id: string;
    rating: number;
    note?: string | null;
  },
  stats: { categoryCount: number; total: number },
) {
  const note = vouch.note ? `> ${vouch.note}` : "> —";
  return new EmbedBuilder()
    .setColor(COLORS.green)
    .setAuthor({ name: `Verifiziertes Vouch-System · ${vouch.category}` })
    .setTitle(`Neue Bewertung · Vouch #${vouch.id}`)
    .setDescription(stars(vouch.rating))
    .addFields(
      { name: "📦 Produkt", value: vouch.product, inline: true },
      { name: "⚖️ Menge", value: String(vouch.quantity), inline: true },
      { name: "💵 Preis", value: `${formatMoney(vouch.price)}`, inline: true },
      { name: "👤 Käufer", value: `<@${vouch.buyer_id}>`, inline: true },
      { name: "🛡️ Verkäufer", value: `<@${vouch.seller_id}>`, inline: true },
      { name: "🗒️ Notiz", value: note, inline: false },
    )
    .setFooter({
      text: `${config.community_name} · ${vouch.category}-Vouches: ${stats.categoryCount} · Gesamte Vouches: ${stats.total}`,
    });
}

export function vouchLookupEmbed(config: GuildConfig, profileCount: number, page = 1, pages = 1) {
  return new EmbedBuilder()
    .setColor(COLORS.yellow)
    .setTitle("🔍 Vouch-Auswertung")
    .setDescription(
      "**Finde schnell die Bewertungen unserer Käufer und Verkäufer.**\nWähle unten eine Person aus, um die vollständige Vouch-Statistik anzusehen.",
    )
    .setFooter({ text: `${config.community_name} · ${profileCount} verifizierte Profile · Seite ${page} von ${pages}` });
}

export function vouchUserSelect() {
  return new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId("vouch:lookup")
      .setPlaceholder("Käufer oder Verkäufer auswählen ...")
      .setMinValues(1)
      .setMaxValues(1),
  );
}

export function giveawayEmbed(opts: {
  title: string;
  description?: string | null;
  prize: string;
  endsAt: Date;
  publicId: string;
}) {
  return new EmbedBuilder()
    .setColor(COLORS.green)
    .setTitle(`🎉 ${opts.title}`)
    .setDescription(opts.description || null)
    .addFields(
      { name: "Gewinne", value: opts.prize, inline: false },
      {
        name: "Auflösung",
        value: `${formatDateDe(opts.endsAt)} (${relativeTime(opts.endsAt)})`,
        inline: false,
      },
      { name: "Regeln", value: "Teilnahmebedingungen gemäß internem Gewinnspiel-System", inline: false },
      { name: "Gewinnspiel-ID", value: `\`${opts.publicId}\``, inline: false },
    )
    .setFooter({ text: "Klicke auf den Button, um teilzunehmen." })
    .setTimestamp();
}

export function giveawayJoinButton(id: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`gw:join:${id}`).setStyle(ButtonStyle.Success).setLabel("Teilnehmen"),
  );
}

export function winnersEmbed(publicId: string, lines: string[]) {
  return new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle("🏆 Gewinner")
    .setDescription(`${lines.join("\n")}\n\n**Gewinnspiel-ID**\n\`${publicId}\``)
    .setTimestamp();
}

export function warningEmbed(text: string, color: ColorResolvable = COLORS.red) {
  return new EmbedBuilder().setColor(color).setDescription(text);
}

export function customEmbed(opts: {
  title?: string | null;
  description: string;
  color: number;
  image?: string | null;
  footer?: string | null;
}) {
  const embed = new EmbedBuilder().setColor(opts.color).setDescription(opts.description);
  if (opts.title) embed.setTitle(opts.title);
  if (opts.image) embed.setImage(opts.image);
  if (opts.footer) embed.setFooter({ text: opts.footer });
  return embed;
}
