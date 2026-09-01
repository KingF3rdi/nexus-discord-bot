import { ChannelType, PermissionFlagsBits, SlashCommandBuilder, } from "discord.js";
export const commands = [
    new SlashCommandBuilder()
        .setName("setup")
        .setDescription("Server für Tickets, Shop und Giveaways einrichten")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((s) => s.setName("anzeigen").setDescription("Aktuelle Einstellungen anzeigen"))
        .addSubcommand((s) => s
        .setName("setzen")
        .setDescription("Einstellungen speichern")
        .addStringOption((o) => o.setName("name").setDescription("Community-Name (Footer & Begrüßung)"))
        .addChannelOption((o) => o.setName("ticket_kategorie").setDescription("Kategorie für Ticket-Kanäle").addChannelTypes(ChannelType.GuildCategory))
        .addRoleOption((o) => o.setName("team_rolle").setDescription("Team-/Support-Rolle"))
        .addChannelOption((o) => o.setName("log_kanal").setDescription("Log-Kanal").addChannelTypes(ChannelType.GuildText))
        .addStringOption((o) => o.setName("pay_empfaenger").setDescription("Standard-Minecraft-Name für /pay"))
        .addStringOption((o) => o.setName("footer").setDescription("Footer-Text der Embeds"))),
    new SlashCommandBuilder()
        .setName("sagen")
        .setDescription("Der Bot sendet deinen Text (optional als Embed)")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption((o) => o.setName("text").setDescription("Nachricht").setRequired(true))
        .addChannelOption((o) => o.setName("kanal").setDescription("Zielkanal").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        .addBooleanOption((o) => o.setName("embed").setDescription("Als Embed senden"))
        .addStringOption((o) => o.setName("farbe").setDescription("Embed-Farbe (gruen, gelb, rot, gold oder #hex)"))
        .addStringOption((o) => o.setName("titel").setDescription("Embed-Titel")),
    new SlashCommandBuilder()
        .setName("embed")
        .setDescription("Eine formatierte Embed-Nachricht senden")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption((o) => o.setName("beschreibung").setDescription("Inhalt (Markdown erlaubt)").setRequired(true))
        .addStringOption((o) => o.setName("titel").setDescription("Titel"))
        .addStringOption((o) => o.setName("farbe").setDescription("gruen, gelb, rot, gold oder #hex"))
        .addStringOption((o) => o.setName("bild").setDescription("Bild-URL"))
        .addStringOption((o) => o.setName("footer").setDescription("Footer"))
        .addChannelOption((o) => o.setName("kanal").setDescription("Zielkanal").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)),
    new SlashCommandBuilder()
        .setName("ticket-kategorie")
        .setDescription("Kategorien für Ticket-Panels verwalten")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((s) => s
        .setName("hinzufuegen")
        .setDescription("Neue Kategorie anlegen")
        .addStringOption((o) => o.setName("name").setDescription("z. B. Website-Support").setRequired(true))
        .addStringOption((o) => o.setName("emoji").setDescription("Emoji").setRequired(true))
        .addStringOption((o) => o.setName("beschreibung").setDescription("Kurztext").setRequired(true)))
        .addSubcommand((s) => s.setName("liste").setDescription("Alle Kategorien anzeigen"))
        .addSubcommand((s) => s
        .setName("entfernen")
        .setDescription("Kategorie löschen")
        .addIntegerOption((o) => o.setName("id").setDescription("Kategorie-ID").setRequired(true))),
    new SlashCommandBuilder()
        .setName("ticket-panel")
        .setDescription("Ticket-Panel mit Dropdown in diesen Kanal senden")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addChannelOption((o) => o.setName("kanal").setDescription("Zielkanal").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)),
    new SlashCommandBuilder()
        .setName("produkt")
        .setDescription("Shop-Produkte anlegen")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((s) => s
        .setName("erstellen")
        .setDescription("Neues Produkt für Buy-Panels")
        .addStringOption((o) => o.setName("name").setDescription("Produktname").setRequired(true))
        .addIntegerOption((o) => o.setName("preis").setDescription("Preis in $ (ohne Punkte)").setRequired(true).setMinValue(1))
        .addUserOption((o) => o.setName("verkaeufer").setDescription("Discord-Verkäufer").setRequired(true))
        .addStringOption((o) => o.setName("empfaenger").setDescription("Minecraft-Name für /pay").setRequired(true))
        .addStringOption((o) => o.setName("beschreibung").setDescription("Beschreibungstext"))
        .addStringOption((o) => o.setName("begruessung").setDescription("Begrüßung im Listing"))
        .addStringOption((o) => o.setName("warnung").setDescription("Wichtiger Hinweis"))
        .addStringOption((o) => o.setName("bild").setDescription("Bild-URL"))
        .addStringOption((o) => o.setName("sku").setDescription("Anzeige-ID, z. B. #7"))
        .addStringOption((o) => o.setName("button").setDescription("Button-Text, z. B. Map-Art kaufen"))
        .addBooleanOption((o) => o.setName("unlimitiert").setDescription("Unbegrenzt kaufbar (Standard: ja)")))
        .addSubcommand((s) => s.setName("liste").setDescription("Alle Produkte anzeigen"))
        .addSubcommand((s) => s
        .setName("entfernen")
        .setDescription("Produkt löschen")
        .addIntegerOption((o) => o.setName("id").setDescription("Produkt-ID").setRequired(true))),
    new SlashCommandBuilder()
        .setName("buy-panel")
        .setDescription("Buy-Panel für ein Produkt senden (mehrfach möglich)")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addIntegerOption((o) => o.setName("produkt_id").setDescription("ID aus /produkt liste").setRequired(true))
        .addBooleanOption((o) => o.setName("listing").setDescription("Zusätzlich das lange Listing-Embed senden"))
        .addChannelOption((o) => o.setName("kanal").setDescription("Zielkanal").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)),
    new SlashCommandBuilder()
        .setName("service")
        .setDescription("Bau-/Service-Angebote verwalten")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((s) => s
        .setName("hinzufuegen")
        .setDescription("Service anlegen")
        .addStringOption((o) => o.setName("name").setDescription("z. B. Schematic Bau Service").setRequired(true))
        .addStringOption((o) => o.setName("emoji").setDescription("Emoji").setRequired(true))
        .addStringOption((o) => o.setName("beschreibung").setDescription("Beschreibung").setRequired(true))
        .addStringOption((o) => o.setName("wichtig").setDescription("Wichtiger Hinweis"))
        .addIntegerOption((o) => o.setName("limit").setDescription("Max. offene Tickets").setMinValue(1)))
        .addSubcommand((s) => s.setName("liste").setDescription("Services anzeigen"))
        .addSubcommand((s) => s
        .setName("status")
        .setDescription("Service aktiv/inaktiv schalten")
        .addIntegerOption((o) => o.setName("id").setDescription("Service-ID").setRequired(true))
        .addBooleanOption((o) => o.setName("aktiv").setDescription("Verfügbar?").setRequired(true))),
    new SlashCommandBuilder()
        .setName("service-panel")
        .setDescription("Service-Panel mit Dropdown senden")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addChannelOption((o) => o.setName("kanal").setDescription("Zielkanal").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)),
    new SlashCommandBuilder()
        .setName("giveaway")
        .setDescription("Gewinnspiele starten und auswerten")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((s) => s
        .setName("starten")
        .setDescription("Neues Giveaway posten")
        .addStringOption((o) => o.setName("titel").setDescription("z. B. Public Giveaway").setRequired(true))
        .addStringOption((o) => o.setName("gewinne").setDescription("z. B. • **2x** $2.5M").setRequired(true))
        .addStringOption((o) => o.setName("dauer").setDescription("z. B. 7h, 30m, 1d").setRequired(true))
        .addIntegerOption((o) => o.setName("gewinner").setDescription("Anzahl Gewinner").setRequired(true).setMinValue(1).setMaxValue(20))
        .addStringOption((o) => o.setName("beschreibung").setDescription("Untertitel, z. B. Daily GW"))
        .addChannelOption((o) => o.setName("kanal").setDescription("Zielkanal").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
        .addSubcommand((s) => s
        .setName("beenden")
        .setDescription("Giveaway sofort auslosen")
        .addStringOption((o) => o.setName("id").setDescription("Gewinnspiel-ID").setRequired(true)))
        .addSubcommand((s) => s
        .setName("reroll")
        .setDescription("Neue Gewinner ziehen")
        .addStringOption((o) => o.setName("id").setDescription("Gewinnspiel-ID").setRequired(true))),
    new SlashCommandBuilder()
        .setName("vouch")
        .setDescription("Vouch / Bewertung erstellen")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((s) => s
        .setName("erstellen")
        .setDescription("Neuen Vouch posten")
        .addStringOption((o) => o.setName("produkt").setDescription("Produktname").setRequired(true))
        .addIntegerOption((o) => o.setName("menge").setDescription("Menge").setRequired(true).setMinValue(1))
        .addIntegerOption((o) => o.setName("preis").setDescription("Preis in $").setRequired(true).setMinValue(0))
        .addUserOption((o) => o.setName("kaeufer").setDescription("Käufer").setRequired(true))
        .addUserOption((o) => o.setName("verkaeufer").setDescription("Verkäufer").setRequired(true))
        .addIntegerOption((o) => o.setName("bewertung").setDescription("Sterne 1–5").setRequired(true).setMinValue(1).setMaxValue(5))
        .addStringOption((o) => o.setName("notiz").setDescription("Kurze Notiz"))
        .addStringOption((o) => o.setName("kategorie").setDescription("z. B. Spawner, Map-Art"))
        .addChannelOption((o) => o.setName("kanal").setDescription("Zielkanal").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))),
    new SlashCommandBuilder()
        .setName("vouch-panel")
        .setDescription("Vouch-Auswertung mit User-Auswahl senden")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addChannelOption((o) => o.setName("kanal").setDescription("Zielkanal").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)),
    new SlashCommandBuilder()
        .setName("pay")
        .setDescription("Zahlungsanfrage mit berechnetem /pay-Befehl posten")
        .addStringOption((o) => o.setName("empfaenger").setDescription("Minecraft-Name des Empfängers").setRequired(true))
        .addIntegerOption((o) => o.setName("betrag").setDescription("Betrag in $").setRequired(true).setMinValue(1))
        .addIntegerOption((o) => o.setName("menge").setDescription("Menge (Gesamt = betrag × menge)").setMinValue(1))
        .addStringOption((o) => o.setName("produkt").setDescription("Produktname")),
    new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Offenes Ticket verwalten")
        .addSubcommand((s) => s.setName("schliessen").setDescription("Dieses Ticket schließen"))
        .addSubcommand((s) => s
        .setName("hinzufuegen")
        .setDescription("User zum Ticket hinzufügen")
        .addUserOption((o) => o.setName("user").setDescription("Mitglied").setRequired(true))),
    new SlashCommandBuilder()
        .setName("help")
        .setDescription("Alle Befehle des Bots anzeigen"),
].map((c) => c.toJSON());
export function helpText() {
    return [
        "**Nexus · Ticket, Shop, Giveaway & Vouch**",
        "",
        "**Einrichtung**",
        "`/setup setzen` — Kategorie, Team-Rolle, Pay-Empfänger",
        "`/setup anzeigen` — aktuelle Werte",
        "",
        "**Nachrichten**",
        "`/sagen` — Bot schreibt deinen Text",
        "`/embed` — farbiges Embed senden",
        "",
        "**Tickets**",
        "`/ticket-kategorie hinzufuegen` — Anliegen anlegen",
        "`/ticket-panel` — Dropdown-Panel posten (beliebig oft)",
        "`/service` + `/service-panel` — Service-Tickets mit Limit",
        "",
        "**Shop / Buy-Panels**",
        "`/produkt erstellen` — Preis, Verkäufer, /pay-Empfänger",
        "`/buy-panel` — Kauf-Button posten (mehrere Panels möglich)",
        "Im Ticket: Gesamtpreis × Menge und kopierbarer `/pay`-Befehl",
        "`/pay` — Zahlungsanfrage manuell posten",
        "",
        "**Giveaways & Vouches**",
        "`/giveaway starten` · `/giveaway beenden` · `/giveaway reroll`",
        "`/vouch erstellen` · `/vouch-panel`",
    ].join("\n");
}
