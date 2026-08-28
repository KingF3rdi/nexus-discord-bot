# Nexus — Discord-Bot für Tickets, Shop, Giveaways & Vouches

Bot im Stil eines Community-Shops: **Ticket-Panels**, **Buy-Panels** mit Gesamtpreis und kopierbarem `/pay`-Befehl, **Giveaways**, **Vouches** und **Nachrichten, die der Bot für dich sendet**. Beliebig viele Panels in verschiedene Kanäle.

Die Web-Vorschau zeigt dasselbe Look & Feel wie in Discord (dunkle Embeds, grüne Kauf-Buttons, Dropdowns). Der eigentliche Bot läuft in deinem Server, sobald ein Token gesetzt ist.

## Was der Bot kann

- **Tickets** — Panel mit Dropdown (Support, Clan-Fight, Verify, …). Ein offenes Support-Ticket pro Person. Team kann übernehmen, User hinzufügen, schließen.
- **Buy-Panels** — Produkt mit Preis, Verkäufer, Bild und grünem Kauf-Button. Klick öffnet ein privates Ticket, rechnet `Menge × Preis` und postet:

  ```
  /pay FriendsWithMny 18000000
  ```

  Der Empfänger ist der Minecraft-Name, den du am Produkt hinterlegst — nicht irgendein Fake-Account.
- **Mehrere Panels** — `/ticket-panel` und `/buy-panel` so oft senden, wie du willst, in beliebige Kanäle.
- **Texte senden** — `/sagen` (Klartext oder Embed) und `/embed` (Farbe, Bild, Footer).
- **Giveaways** — Start mit Dauer (`7h`, `30m`, `1d`), Teilnehmen-Button, automatische Auslosung, Reroll.
- **Vouches** — Bewertung mit Sternen, Produkt, Menge, Preis; Panel zum Nachschlagen von Käufer-/Verkäufer-Statistik.
- **Services** — z. B. Bau-Service mit Limit (`10/10 Tickets – Limit erreicht`).

## Bot-Host (Git)

Der Host soll den Code **per Git klonen und bei jedem Start/Update ziehen** — nicht als ZIP hochladen.

1. Oben in Cursor auf **Create repo** klicken und das GitHub-Repository anlegen (öffentlich oder privat).
2. Im Bot-Host-Panel das GitHub-Repo eintragen:

| Feld | Wert |
| --- | --- |
| Repository | `https://github.com/<dein-user>/<dein-repo>.git` |
| Branch | `main` |
| Install | `npm install` |
| Start | `npm start` |
| Auto-Pull | an (Host zieht bei Restart den neuesten `main`-Stand) |

3. Umgebungsvariable im Host setzen (nicht in Git speichern):

```
DISCORD_TOKEN=dein_bot_token
DATA_DIR=./data
```

Bei einem **privaten** Repo braucht der Host einen GitHub [Personal Access Token](https://github.com/settings/tokens) (Recht `repo`) oder einen Deploy Key. Öffentliche Repos kann der Host ohne Token klonen.

Nach dem ersten Start in Discord `/setup setzen` ausführen.

## Schnellstart (Discord)

1. Anwendung auf [Discord Developer Portal](https://discord.com/developers/applications) anlegen.
2. Unter **Bot** einen Bot erstellen, Token kopieren. **Server Members Intent** einschalten.
3. Unter **OAuth2 → URL Generator**: Scopes `bot` und `applications.commands`. Rechte u. a. Kanäle verwalten, Nachrichten senden, Embeds, Dateien, Nachrichtenverlauf, Rollen verwalten.
4. Bot auf den Server einladen.
5. Im Projektordner:

```bash
cp .env.example .env
# DISCORD_TOKEN=dein_token
npm --prefix bot install
npm run bot
```

6. In Discord: `/setup setzen` (Ticket-Kategorie, Team-Rolle, Standard-Pay-Empfänger), danach Panels posten.

## Wichtige Befehle

| Befehl | Zweck |
| --- | --- |
| `/setup setzen` | Community-Name, Ticket-Kategorie, Team-Rolle, `/pay`-Empfänger |
| `/sagen` | Bot schreibt deinen Text (optional als Embed) |
| `/embed` | Farbiges Embed mit Titel, Bild, Footer |
| `/ticket-kategorie hinzufuegen` | Anliegen für das Ticket-Dropdown |
| `/ticket-panel` | Ticket-Panel senden (mehrfach möglich) |
| `/produkt erstellen` | Name, Preis, Verkäufer, Minecraft-Empfänger, Bild |
| `/buy-panel` | Kauf-Panel für eine Produkt-ID senden |
| `/pay` | Zahlungsanfrage mit Gesamtbetrag posten |
| `/giveaway starten` | Gewinnspiel mit Button |
| `/vouch erstellen` / `/vouch-panel` | Bewertung bzw. Statistik-Panel |
| `/service hinzufuegen` / `/service-panel` | Service-Tickets mit Limit |
| `/help` | Übersicht |

### Beispiel Shop

```
/produkt erstellen name:Thorfinn von Vinland Saga preis:6000000 verkaeufer:@Du empfaenger:FriendsWithMny sku:#7 button:Map-Art kaufen
/buy-panel produkt_id:1 listing:True
```

Im geöffneten Ticket steht z. B. bei Menge 3:

- Einzelpreis **$6.000.000**
- Gesamt **$18.000.000**
- Befehl `/pay FriendsWithMny 18000000`

## Web-Vorschau

Ohne Discord-Token:

```bash
npm --prefix dashboard install
npm run dev
```

Öffnet die Discord-ähnliche Oberfläche auf Port **43123**. Dort kannst du Tickets öffnen, Map-Art kaufen (Gesamtpreis + `/pay`), Giveaways, Vouches und Bot-Nachrichten ausprobieren.

## Technik

- **Bot:** Node.js, discord.js 14, SQLite (`bot/data/nexus.db`)
- **Vorschau:** Vite + React + Tailwind
- Daten bleiben lokal. Kein Login, keine Cloud-Datenbank.

## Hinweise

- Slash-Befehle erscheinen nach dem Start (kann auf großen Bots kurz dauern). Bot einmal neu einladen, falls sie fehlen.
- Ticket-Kanäle werden privat in der konfigurierten Kategorie angelegt.
- Der `/pay`-Befehl ist ein **Text zum Kopieren** für euer Ingame-Economy (nicht der Discord-Slash-Command selbst). In Discord existiert zusätzlich `/pay`, um dieselbe Zahlungsanfrage manuell zu posten.
