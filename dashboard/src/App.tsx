import { useMemo, useState } from "react";
import {
  Code,
  DiscordButton,
  DiscordMessage,
  Embed,
  Field,
  Mention,
  SelectBox,
} from "./components/ui";
import { formatMoney, payCommand, stars } from "./format";

type ChannelId = "ticket" | "map" | "vouch" | "fwm" | "giveaway" | "services" | "commands" | `kauf-${string}`;

type Ticket = {
  id: string;
  kind: "support" | "buy" | "service";
  title: string;
  product?: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
  recipient?: string;
};

const TICKET_OPTIONS = [
  { value: "web", label: "🔵 Website-Support" },
  { value: "allgemein", label: "⚪ Allgemeiner Support" },
  { value: "fight", label: "⚔️ Clan-Fight" },
  { value: "allianz", label: "🤝 Allianz-Anfrage" },
  { value: "gw", label: "🎉 Giveaway" },
];

const TICKET_META: Record<string, { emoji: string; name: string; text: string }> = {
  web: { emoji: "🔵", name: "Website-Support", text: "Hilfe rund um Website, Login oder technische Probleme." },
  allgemein: { emoji: "⚪", name: "Allgemeiner Support", text: "allgemeine Fragen und Anliegen." },
  fight: { emoji: "⚔️", name: "Clan-Fight", text: "Anfrage für einen Clan-Fight." },
  allianz: { emoji: "🤝", name: "Allianz-Anfrage", text: "Anfrage für eine Allianz mit FriendsWithMoney." },
  gw: { emoji: "🎉", name: "Giveaway", text: "Anliegen rund um Gewinne oder Gewinnspiele." },
};

const VOUCH_PEOPLE = [
  { value: "hydra", label: "HydraVB | FWM", buyer: 12, seller: 3, avg: 5 },
  { value: "hugo", label: "Hugo", buyer: 4, seller: 40, avg: 4.9 },
  { value: "nether", label: "Netherite0815", buyer: 8, seller: 1, avg: 4.8 },
];

const PRODUCT = {
  name: "Thorfinn von Vinland Saga",
  price: 6_000_000,
  seller: "@MapSeller",
  recipient: "FriendsWithMny",
  sku: "#7",
};

export default function App() {
  const [channel, setChannel] = useState<ChannelId>("map");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [qtyOpen, setQtyOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [gwJoined, setGwJoined] = useState(false);
  const [gwCount, setGwCount] = useState(42);
  const [vouchUser, setVouchUser] = useState<string | null>(null);
  const [sayText, setSayText] = useState("");
  const [sayColor, setSayColor] = useState("#ed4245");
  const [posted, setPosted] = useState<{ text: string; color: string }[]>([]);
  const [serviceOpen, setServiceOpen] = useState(10);
  const [copied, setCopied] = useState(false);

  const channels: { id: ChannelId; name: string; unread?: boolean }[] = useMemo(() => {
    const extra = tickets.map((t) => ({
      id: `kauf-${t.id}` as ChannelId,
      name: t.kind === "buy" ? `🛒${t.title}` : t.kind === "service" ? `🧡${t.title}` : `🎫${t.title}`,
      unread: true as const,
    }));
    return [
      { id: "ticket", name: "🎫TICKET" },
      { id: "map", name: "🖼️MAP-ARTS" },
      { id: "vouch", name: "🤍VOUCH" },
      { id: "fwm", name: "🪖FRIENDSWITHMONEY" },
      { id: "giveaway", name: "💫GIVEAWAY" },
      { id: "services", name: "🧡SERVICES" },
      { id: "commands", name: "⚙️BEFEHLE" },
      ...extra,
    ];
  }, [tickets]);

  const header = channels.find((c) => c.id === channel)?.name.replace(/^[^\w🎫🖼️🤍🪖💫🧡⚙️🛒]+/, "") ?? channel;

  function openSupport(key: string) {
    const meta = TICKET_META[key];
    if (!meta) return;
    const id = `${Date.now()}`;
    const ticket: Ticket = { id, kind: "support", title: meta.name.toLowerCase().replace(/\s+/g, "-") };
    setTickets((t) => [...t, ticket]);
    setChannel(`kauf-${id}`);
    setSidebarOpen(false);
  }

  function openBuy() {
    const id = `${Date.now()}`;
    const ticket: Ticket = {
      id,
      kind: "buy",
      title: "map-art",
      product: PRODUCT.name,
      quantity: qty,
      unitPrice: PRODUCT.price,
      total: PRODUCT.price * qty,
      recipient: PRODUCT.recipient,
    };
    setTickets((t) => [...t, ticket]);
    setQtyOpen(false);
    setChannel(`kauf-${id}`);
    setSidebarOpen(false);
  }

  function openService(name: string) {
    if (serviceOpen >= 10 && name.includes("Base")) return;
    const id = `${Date.now()}`;
    const ticket: Ticket = { id, kind: "service", title: name.toLowerCase().replace(/\s+/g, "-") };
    setTickets((t) => [...t, ticket]);
    setServiceOpen((n) => Math.min(10, n + 1));
    setChannel(`kauf-${id}`);
    setSidebarOpen(false);
  }

  const activeTicket = channel.startsWith("kauf-")
    ? tickets.find((t) => `kauf-${t.id}` === channel)
    : undefined;

  async function copyPay(cmd: string) {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 bg-[#313338] text-[#dbdee1]">
      <aside className="hidden w-[72px] shrink-0 flex-col items-center gap-2 bg-[#1e1f22] py-3 md:flex">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[16px] bg-[#111]">
          <img src="/fwm-logo.svg" alt="FWM" className="h-12 w-12" />
        </div>
        <div className="h-[2px] w-8 rounded bg-[#3f4147]" />
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#313338] text-xl" title="Nexus">
          🎫
        </div>
      </aside>

      <aside
        className={`${
          sidebarOpen ? "flex" : "hidden"
        } absolute z-20 h-full w-[240px] flex-col bg-[#2b2d31] md:relative md:flex`}
      >
        <div className="flex h-12 items-center border-b border-black/20 px-4 shadow-sm">
          <div className="truncate text-[16px] font-semibold text-white">FriendsWithMoney</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#949ba4]">Shop & Support</p>
          {channels.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setChannel(c.id);
                setSidebarOpen(false);
              }}
              className={`mb-0.5 flex w-full items-center rounded-[4px] px-2 py-1.5 text-left text-[15px] ${
                channel === c.id ? "bg-[#404249] text-white" : "text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]"
              }`}
            >
              <span className="mr-1 text-[#80848e]">#</span>
              <span className="truncate">{c.name.replace(/^#/, "")}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-[#232428] p-2">
          <div className="h-8 w-8 overflow-hidden rounded-full bg-[#111]">
            <img src="/fwm-logo.svg" alt="" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-white">Nexus Bot</div>
            <div className="text-[11px] text-[#23a559]">Online</div>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center gap-2 border-b border-black/20 px-3 shadow-sm">
          <button
            type="button"
            className="rounded p-1 text-xl md:hidden"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Kanäle"
          >
            ☰
          </button>
          <span className="text-[#80848e]">#</span>
          <h1 className="truncate text-[16px] font-semibold text-white">{header}</h1>
          {channel === "map" || channel === "fwm" ? (
            <span className="ml-auto hidden text-xs text-[#949ba4] sm:inline">Kanal kann nur gelesen werden.</span>
          ) : null}
        </header>

        <div className="flex-1 overflow-y-auto py-4 scrollbar-thin">
          {channel === "ticket" && <TicketChannel onSelect={openSupport} />}
          {channel === "map" && <MapChannel onBuy={() => setQtyOpen(true)} />}
          {channel === "vouch" && <VouchChannel selected={vouchUser} onSelect={setVouchUser} />}
          {channel === "fwm" && <WarningChannel extras={posted} />}
          {channel === "giveaway" && (
            <GiveawayChannel
              joined={gwJoined}
              count={gwCount}
              onJoin={() => {
                if (gwJoined) return;
                setGwJoined(true);
                setGwCount((n) => n + 1);
              }}
            />
          )}
          {channel === "services" && (
            <ServiceChannel open={serviceOpen} onSelect={openService} />
          )}
          {channel === "commands" && (
            <CommandsChannel
              sayText={sayText}
              setSayText={setSayText}
              sayColor={sayColor}
              setSayColor={setSayColor}
              onSend={() => {
                if (!sayText.trim()) return;
                setPosted((p) => [...p, { text: sayText, color: sayColor }]);
                setSayText("");
                setChannel("fwm");
              }}
            />
          )}
          {activeTicket && (
            <TicketView ticket={activeTicket} copied={copied} onCopy={copyPay} />
          )}
        </div>
      </main>

      {qtyOpen && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-lg bg-[#313338] p-4 shadow-xl">
            <h2 className="mb-1 text-lg font-semibold text-white">Kaufen · {PRODUCT.name}</h2>
            <p className="mb-4 text-sm text-[#b5bac1]">Wie viele Stück? Der Gesamtpreis wird automatisch berechnet.</p>
            <label className="text-xs font-bold uppercase text-[#b5bac1]">Menge</label>
            <input
              type="number"
              min={1}
              max={99}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
              className="mt-1 mb-3 w-full rounded bg-[#1e1f22] px-3 py-2 text-white outline-none"
            />
            <p className="mb-4 text-sm">
              Gesamt: <strong className="text-white">{formatMoney(PRODUCT.price * qty)}</strong>
            </p>
            <div className="flex justify-end gap-2">
              <DiscordButton variant="secondary" onClick={() => setQtyOpen(false)}>
                Abbrechen
              </DiscordButton>
              <DiscordButton onClick={openBuy}>Ticket öffnen</DiscordButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TicketChannel({ onSelect }: { onSelect: (key: string) => void }) {
  return (
    <DiscordMessage>
      <Embed color="#23a559" footer="FriendsWithMoney · Ticket-System">
        <p>🔵 <strong>Website-Support</strong></p>
        <p className="mb-3">Hilfe rund um Website, Login oder technische Probleme.</p>
        <p>⚪ <strong>Allgemeiner Support</strong></p>
        <p className="mb-3">allgemeine Fragen und Anliegen.</p>
        <p>⚔️ <strong>Clan-Fight</strong></p>
        <p className="mb-3">Anfrage für einen Clan-Fight.</p>
        <p>🤝 <strong>Allianz-Anfrage</strong></p>
        <p className="mb-3">Anfrage für eine Allianz mit FriendsWithMoney.</p>
        <p>🎉 <strong>Giveaway</strong></p>
        <p className="mb-3">Anliegen rund um Gewinne oder Gewinnspiele.</p>
        <p>🔒 <strong>Wichtiger Hinweis</strong></p>
        <p>
          Pro Person ist <strong>ein aktives Support-Ticket</strong> erlaubt (außer Bewerbungen).
        </p>
      </Embed>
      <SelectBox placeholder="Wähle dein Anliegen aus ..." options={TICKET_OPTIONS} onChange={onSelect} />
    </DiscordMessage>
  );
}

function MapChannel({ onBuy }: { onBuy: () => void }) {
  return (
    <>
      <DiscordMessage>
        <Embed color="#23a559" footer="FriendsWithMoney · Map-Art-Verkauf">
          <p className="text-[16px] font-semibold text-white">🎨 {PRODUCT.name}</p>
          <p className="mt-2">
            Hallo, liebe <strong>HugoSMP-Community!</strong>
          </p>
          <p className="mt-2">Zum Verkauf steht eine <strong>2 x 2 Karten große Map-Art</strong> zum Thema:</p>
          <blockquote className="quote mt-2">
            <strong>{PRODUCT.name}</strong>
          </blockquote>
          <Field
            name="♾️ Nicht limitiert"
            value="Die Map-Art ist nicht limitiert und kann von beliebig vielen Spielern erworben werden."
          />
          <Field name="⚠️ WICHTIG" value={<strong>ES WIRD NICHT DIE ORIGINALKARTE VERKAUFT!</strong>} />
          <Field name="💸 VERKÄUFER" value={<>Die Map-Art wird verkauft von: <Mention>{PRODUCT.seller}</Mention></>} />
          <Field name="💰 Preis" value={<span className="text-[16px] font-bold text-white">{formatMoney(PRODUCT.price)}</span>} />
        </Embed>
      </DiscordMessage>
      <DiscordMessage>
        <Embed color="#23a559" footer="FriendsWithMoney · Map-Art-Verkauf | heute um 12:04 Uhr" image="/mapart.svg">
          <p>
            Die Map-Art wird verkauft von: <Mention>{PRODUCT.seller}</Mention>
          </p>
          <Field name="💰 Preis" value={<span className="text-[16px] font-bold text-white">{formatMoney(PRODUCT.price)}</span>} />
          <Field name="Status" value="✅ Verfügbar" />
          <Field name="Map-Art-ID" value={PRODUCT.sku} />
        </Embed>
        <DiscordButton onClick={onBuy}>🛒 Map-Art kaufen</DiscordButton>
      </DiscordMessage>
    </>
  );
}

function VouchChannel({ selected, onSelect }: { selected: string | null; onSelect: (v: string) => void }) {
  const person = VOUCH_PEOPLE.find((p) => p.value === selected);
  return (
    <>
      <DiscordMessage>
        <Embed color="#23a559" author="Verifiziertes Vouch-System · Spawner" footer="FriendsWithMoney · Spawner-Vouches: 2540 · Gesamte Vouches: 2610">
          <p className="text-[16px] font-semibold text-white">Neue Bewertung · Vouch #2610</p>
          <p className="mt-1">{stars(5)}</p>
          <Field name="📦 Produkt" value="Skelly" />
          <Field name="⚖️ Menge" value="1" />
          <Field name="💵 Preis" value="12.300.000$" />
          <Field name="👤 Käufer" value={<Mention>@HydraVB | FWM</Mention>} />
          <Field name="🛡️ Verkäufer" value={<Mention>@Hugo</Mention>} />
          <Field name="🗒️ Notiz" value={<blockquote className="quote">war nice</blockquote>} />
        </Embed>
      </DiscordMessage>
      <DiscordMessage>
        <Embed color="#fee75c" footer="FriendsWithMoney · 40 verifizierte Profile · Seite 1 von 2">
          <p className="text-[16px] font-semibold text-white">🔍 Vouch-Auswertung</p>
          <p className="mt-2">
            <strong>Finde schnell die Bewertungen unserer Käufer und Verkäufer.</strong>
          </p>
          <p className="mt-2">Wähle unten eine Person aus, um die vollständige Vouch-Statistik anzusehen.</p>
        </Embed>
        <SelectBox
          placeholder="Käufer oder Verkäufer auswählen ..."
          options={VOUCH_PEOPLE.map((p) => ({ value: p.value, label: p.label }))}
          onChange={onSelect}
          value={selected ?? ""}
        />
        {person ? (
          <Embed color="#fee75c" footer="FriendsWithMoney · Vouch-Auswertung">
            <p className="text-[16px] font-semibold text-white">Vouch-Statistik · {person.label}</p>
            <Field name="Als Käufer" value={`${person.buyer} Vouches`} />
            <Field name="Als Verkäufer" value={`${person.seller} Vouches`} />
            <Field name="Durchschnitt" value={`${person.avg}/5`} />
          </Embed>
        ) : null}
      </DiscordMessage>
    </>
  );
}

function WarningChannel({ extras }: { extras: { text: string; color: string }[] }) {
  return (
    <>
      <DiscordMessage>
        <Embed color="#ed4245">
          <p>
            Das <strong>Faken von FriendsWithMoney-Clans und Accounts</strong> nimmt leider zu. Es gibt verschiedene
            Fake-Accounts, die sich als uns ausgeben.
          </p>
          <p className="mt-3">
            Seid bei Zahlungen <strong>besonders vorsichtig</strong> und prüft, ob ihr den richtigen Account ausgewählt
            habt. Der korrekte Name lautet <Code>FriendsWithMny</Code>.
          </p>
          <p className="mt-3">
            Der sicherste Weg ist, den Zahlungsbefehl <strong>direkt aus der jeweiligen Zahlungsanfrage</strong> zu
            kopieren.
          </p>
          <p className="mt-3">Danke für eure Aufmerksamkeit — bleibt wachsam.</p>
        </Embed>
      </DiscordMessage>
      {extras.map((m, i) => (
        <DiscordMessage key={i}>
          <Embed color={m.color}>
            <p className="whitespace-pre-wrap">{m.text}</p>
          </Embed>
        </DiscordMessage>
      ))}
    </>
  );
}

function GiveawayChannel({
  joined,
  count,
  onJoin,
}: {
  joined: boolean;
  count: number;
  onJoin: () => void;
}) {
  return (
    <>
      <DiscordMessage>
        <Embed color="#f0b232">
          <p className="text-[16px] font-semibold text-white">🏆 Gewinner</p>
          <p className="mt-2">
            1. <Mention>@Netherite0815</Mention> — <strong>$2.5M</strong>
          </p>
          <p>
            2. <Mention>@BuilderJo</Mention> — <strong>$2.5M</strong>
          </p>
          <Field name="Gewinnspiel-ID" value={<Code>J69YAwA</Code>} />
        </Embed>
      </DiscordMessage>
      <DiscordMessage>
        <Embed color="#23a559" footer="Klicke auf den Button, um teilzunehmen. | gestern um 20:00 Uhr">
          <p className="text-[16px] font-semibold text-white">🎉 Public Giveaway</p>
          <p className="mt-1">Daily GW</p>
          <Field name="Gewinne" value="• **2x** $2.5M" />
          <Field name="Auflösung" value="Freitag, 28. August 2026 um 19:00 (in 7 Stunden)" />
          <Field name="Regeln" value="Teilnahmebedingungen gemäß internem Gewinnspiel-System" />
          <Field name="Gewinnspiel-ID" value={<Code>hN4nmcM</Code>} />
        </Embed>
        <DiscordButton onClick={onJoin} disabled={joined}>
          {joined ? `Teilgenommen · ${count}` : "Teilnehmen"}
        </DiscordButton>
      </DiscordMessage>
    </>
  );
}

function ServiceChannel({ open, onSelect }: { open: number; onSelect: (name: string) => void }) {
  const full = open >= 10;
  return (
    <DiscordMessage>
      <Embed color="#23a559" footer="FriendsWithMoney · Service-System | heute um 11:56 Uhr">
        <p>🏗️ <strong>Schematic Bau Service</strong></p>
        <p className="mb-3">
          Wir bauen dein Schematic in-game. <strong>Wichtig:</strong> Bitte Welt-Download und Maße angeben.
        </p>
        <p className={full ? "text-[#949ba4] line-through" : ""}>
          🧱 <strong>Base/Farm Bau Service</strong>
        </p>
        <p className={`mb-3 ${full ? "text-[#949ba4] line-through" : ""}`}>
          Komplette Bases und Farmen nach Vorgabe.
        </p>
        <p className="mt-2">
          {full ? `🟡 **${open}/10 Tickets – Limit erreicht**` : `🟢 ${open}/10 offene Service-Tickets`}
        </p>
        <p className="mt-3 text-[#b5bac1]">
          Für die Nutzung unserer Services ist ein verifizierter Minecraft-Account erforderlich.
        </p>
      </Embed>
      <SelectBox
        placeholder="Service auswählen ..."
        options={[
          { value: "Schematic Bau", label: "🏗️ Schematic Bau Service" },
          { value: "Base Bau", label: full ? "🧱 Base/Farm Bau (voll)" : "🧱 Base/Farm Bau Service" },
        ]}
        onChange={onSelect}
      />
    </DiscordMessage>
  );
}

function CommandsChannel({
  sayText,
  setSayText,
  sayColor,
  setSayColor,
  onSend,
}: {
  sayText: string;
  setSayText: (v: string) => void;
  sayColor: string;
  setSayColor: (v: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4">
      <Embed color="#5865f2" footer="Diese Vorschau zeigt das Look & Feel. Der echte Bot läuft in Discord.">
        <p className="text-[16px] font-semibold text-white">Slash-Befehle</p>
        <p className="mt-2">
          Rufe den Bot mit einem Token in deinem Discord-Server auf. Mehrere Ticket- und Buy-Panels können in beliebige
          Kanäle gesendet werden.
        </p>
        <Field name="/setup setzen" value="Ticket-Kategorie, Team-Rolle, Standard-/pay-Empfänger" />
        <Field name="/sagen · /embed" value="Bot schreibt deinen Text oder ein farbiges Embed" />
        <Field name="/ticket-panel" value="Dropdown wie in #TICKET — beliebig oft, in jeden Kanal" />
        <Field name="/produkt erstellen + /buy-panel" value="Shop-Listing mit Kauf-Button, Preis und Verkäufer" />
        <Field name="/pay" value="Zahlungsanfrage mit Gesamtbetrag und kopierbarem /pay Spieler Betrag" />
        <Field name="/giveaway starten" value="Teilnehmen-Button, automatische Auslosung, Reroll" />
        <Field name="/vouch erstellen · /vouch-panel" value="Bewertungen und Statistik-Dropdown" />
        <Field name="/service-panel" value="Services mit Ticket-Limit (z. B. 10/10)" />
      </Embed>
      <div className="rounded-lg bg-[#2b2d31] p-4">
        <p className="mb-2 font-semibold text-white">Nachricht als Bot senden (Vorschau)</p>
        <textarea
          value={sayText}
          onChange={(e) => setSayText(e.target.value)}
          placeholder="Text, den der Bot in #FRIENDSWITHMONEY posten soll …"
          className="mb-2 h-28 w-full resize-none rounded bg-[#1e1f22] p-3 text-sm text-white outline-none"
        />
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#949ba4]">Embed-Farbe</span>
          {["#ed4245", "#23a559", "#fee75c", "#5865f2"].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSayColor(c)}
              className={`h-6 w-6 rounded-full border-2 ${sayColor === c ? "border-white" : "border-transparent"}`}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
        </div>
        <DiscordButton variant="primary" onClick={onSend}>
          Als Bot senden
        </DiscordButton>
      </div>
    </div>
  );
}

function TicketView({
  ticket,
  copied,
  onCopy,
}: {
  ticket: Ticket;
  copied: boolean;
  onCopy: (cmd: string) => void;
}) {
  if (ticket.kind === "buy" && ticket.total && ticket.recipient && ticket.unitPrice) {
    const cmd = payCommand(ticket.recipient, ticket.total);
    return (
      <DiscordMessage>
        <p className="mb-2 text-sm">
          <Mention>@Du</Mention> · <Mention>{PRODUCT.seller}</Mention> · <Mention>@Team</Mention>
        </p>
        <Embed color="#23a559" footer={`FriendsWithMoney · Bestellung ${PRODUCT.sku}`}>
          <p className="text-[16px] font-semibold text-white">💳 Zahlungsanfrage</p>
          <p className="mt-2">
            Hallo <Mention>@Du</Mention>, hier ist deine Bestellung. Bitte überweise den Betrag <strong>nur</strong> mit
            dem Befehl aus dieser Nachricht.
          </p>
          <Field name="📦 Produkt" value={ticket.product ?? PRODUCT.name} />
          <Field name="⚖️ Menge" value={String(ticket.quantity)} />
          <Field name="💵 Einzelpreis" value={formatMoney(ticket.unitPrice)} />
          <Field
            name="💰 Gesamt"
            value={<span className="text-[16px] font-bold text-white">{formatMoney(ticket.total)}</span>}
          />
          <Field name="🛡️ Verkäufer" value={<Mention>{PRODUCT.seller}</Mention>} />
          <Field name="👤 Zahlungsempfänger" value={<Code>{ticket.recipient}</Code>} />
          <Field
            name="Zahlungsbefehl — bitte kopieren"
            value={
              <pre className="mt-1 overflow-x-auto rounded bg-[#1e1f22] p-2 font-mono text-[13px] text-[#dbdee1]">{cmd}</pre>
            }
          />
        </Embed>
        <DiscordButton onClick={() => onCopy(cmd)}>{copied ? "Kopiert" : "Befehl kopieren"}</DiscordButton>
        <DiscordButton variant="primary">Übernehmen</DiscordButton>
        <DiscordButton variant="danger">Schließen</DiscordButton>
      </DiscordMessage>
    );
  }

  return (
    <DiscordMessage>
      <p className="mb-2 text-sm">
        <Mention>@Du</Mention> · <Mention>@Team</Mention>
      </p>
      <Embed color="#23a559" footer="FriendsWithMoney · Ticket-System">
        <p className="text-[16px] font-semibold text-white">{ticket.title}</p>
        <p className="mt-2">Hallo, beschreibe bitte dein Anliegen. Das Team wird sich so schnell wie möglich bei dir melden.</p>
      </Embed>
      <DiscordButton variant="primary">Übernehmen</DiscordButton>
      <DiscordButton variant="danger">Schließen</DiscordButton>
    </DiscordMessage>
  );
}
