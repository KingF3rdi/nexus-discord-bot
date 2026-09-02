export const COLORS = {
  green: 0x23a559,
  lime: 0x57f287,
  yellow: 0xfee75c,
  red: 0xed4245,
  blurple: 0x5865f2,
  gold: 0xf0b232,
  gray: 0x2b2d31,
} as const;

export function formatMoney(amount: number): string {
  return `$${Math.round(amount).toLocaleString("de-DE")}`;
}

export function payCommand(recipient: string, amount: number): string {
  const cleanRecipient = recipient.replace(/^@/, "").trim();
  return `/pay ${cleanRecipient} ${Math.round(amount)}`;
}

/** 4000000 → 4,0M · null → STOP */
export function formatMillions(amount: number | null | undefined): string {
  if (amount == null || amount < 0) return "STOP";
  return `${(amount / 1_000_000).toFixed(1).replace(".", ",")}M`;
}

/** 4,0M / 4000000 / STOP → number or null (disabled) */
export function parsePrice(input: string): number | null {
  const t = input.trim().toUpperCase().replace(/\s/g, "");
  if (!t || t === "STOP" || t === "-" || t === "AUS") return null;
  if (t.endsWith("M")) {
    const num = Number(t.slice(0, -1).replace(",", "."));
    if (!Number.isFinite(num) || num < 0) throw new Error(`Ungültiger Preis: ${input}`);
    return Math.round(num * 1_000_000);
  }
  const raw = t.replace(/\./g, "").replace(",", ".");
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) throw new Error(`Ungültiger Preis: ${input}`);
  return Math.round(n);
}

export function shortId(length = 7): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let id = "";
  for (let i = 0; i < length; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export function parseDuration(input: string): number | null {
  const match = input.trim().match(/^(\d+)\s*(s|sec|sek|m|min|h|std|d|t|w)?$/i);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = (match[2] ?? "m").toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    sec: 1000,
    sek: 1000,
    m: 60_000,
    min: 60_000,
    h: 3_600_000,
    std: 3_600_000,
    d: 86_400_000,
    t: 86_400_000,
    w: 604_800_000,
  };
  return value * (multipliers[unit] ?? 60_000);
}

export function channelSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20) || "user";
}

export function stars(rating: number): string {
  const filled = Math.min(5, Math.max(1, Math.round(rating)));
  return `${"⭐".repeat(filled)}${"☆".repeat(5 - filled)}  ${filled}/5`;
}

export function parseColor(input: string | null | undefined): number {
  if (!input) return COLORS.green;
  const named: Record<string, number> = {
    gruen: COLORS.green,
    green: COLORS.green,
    lime: COLORS.lime,
    gelb: COLORS.yellow,
    yellow: COLORS.yellow,
    rot: COLORS.red,
    red: COLORS.red,
    gold: COLORS.gold,
    blau: COLORS.blurple,
    blurple: COLORS.blurple,
  };
  const key = input.toLowerCase().replace("ü", "ue");
  if (named[key]) return named[key];
  const hex = input.replace("#", "");
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return Number.parseInt(hex, 16);
  return COLORS.green;
}

export function relativeTime(date: Date): string {
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const minutes = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);
  if (minutes < 60) return diff >= 0 ? `in ${minutes} Minuten` : `vor ${minutes} Minuten`;
  if (hours < 24) return diff >= 0 ? `in ${hours} Stunden` : `vor ${hours} Stunden`;
  return diff >= 0 ? `in ${days} Tagen` : `vor ${days} Tagen`;
}

export function formatDateDe(date: Date): string {
  return date.toLocaleString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
