export function formatMoney(amount: number): string {
  return `$${Math.round(amount).toLocaleString("de-DE")}`;
}

export function formatMillions(amount: number | null): string {
  if (amount == null || amount < 0) return "STOP";
  return `${(amount / 1_000_000).toFixed(1).replace(".", ",")}M`;
}

/** 4,0M / 4000000 / STOP → number or null */
export function parsePrice(input: string): number | null {
  const t = input.trim().toUpperCase().replace(/\s/g, "");
  if (!t || t === "STOP" || t === "-" || t === "AUS") return null;
  if (t.endsWith("M")) {
    const num = Number(t.slice(0, -1).replace(",", "."));
    if (!Number.isFinite(num) || num < 0) return Number.NaN;
    return Math.round(num * 1_000_000);
  }
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return Number.NaN;
  return Math.round(n);
}

export function payCommand(recipient: string, amount: number): string {
  return `/pay ${recipient.replace(/^@/, "")} ${Math.round(amount)}`;
}

export function stars(rating: number): string {
  const filled = Math.min(5, Math.max(1, Math.round(rating)));
  return `${"⭐".repeat(filled)}${"☆".repeat(5 - filled)}  ${filled}/5`;
}
