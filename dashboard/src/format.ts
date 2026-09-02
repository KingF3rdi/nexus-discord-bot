export function formatMoney(amount: number): string {
  return `$${Math.round(amount).toLocaleString("de-DE")}`;
}

export function formatMillions(amount: number | null): string {
  if (amount == null || amount < 0) return "STOP";
  return `${(amount / 1_000_000).toFixed(1).replace(".", ",")}M`;
}

export function payCommand(recipient: string, amount: number): string {
  return `/pay ${recipient.replace(/^@/, "")} ${Math.round(amount)}`;
}

export function stars(rating: number): string {
  const filled = Math.min(5, Math.max(1, Math.round(rating)));
  return `${"⭐".repeat(filled)}${"☆".repeat(5 - filled)}  ${filled}/5`;
}
