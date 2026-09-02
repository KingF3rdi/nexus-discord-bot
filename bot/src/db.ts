import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const dataDir = path.resolve(process.env.DATA_DIR ?? path.join(process.cwd(), "data"));
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "nexus.db"));
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS guilds (
  id TEXT PRIMARY KEY,
  community_name TEXT NOT NULL DEFAULT 'Community',
  footer TEXT NOT NULL DEFAULT 'Ticket- & Shop-System',
  ticket_category_id TEXT,
  staff_role_id TEXT,
  log_channel_id TEXT,
  pay_format TEXT NOT NULL DEFAULT '/pay {empfaenger} {betrag}',
  default_pay_recipient TEXT,
  one_ticket_limit INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS ticket_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'support',
  enabled INTEGER NOT NULL DEFAULT 1,
  max_open INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  description TEXT NOT NULL,
  important TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  max_open INTEGER NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  greeting TEXT,
  warning TEXT,
  price INTEGER NOT NULL,
  seller_id TEXT NOT NULL,
  pay_recipient TEXT NOT NULL,
  image_url TEXT,
  unlimited INTEGER NOT NULL DEFAULT 1,
  stock INTEGER,
  status TEXT NOT NULL DEFAULT 'available',
  sku TEXT,
  button_label TEXT NOT NULL DEFAULT 'Kaufen'
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  category_id INTEGER,
  service_id INTEGER,
  product_id INTEGER,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER,
  total INTEGER,
  pay_recipient TEXT,
  seller_id TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  claimed_by TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS giveaways (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id TEXT NOT NULL UNIQUE,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  prize TEXT NOT NULL,
  winners_count INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  hosted_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running'
);

CREATE TABLE IF NOT EXISTS giveaway_entries (
  giveaway_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (giveaway_id, user_id)
);

CREATE TABLE IF NOT EXISTS vouches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Shop',
  product TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price INTEGER NOT NULL,
  buyer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  note TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS panels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  type TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  extra TEXT
);
`);

export type GuildConfig = {
  id: string;
  community_name: string;
  footer: string;
  ticket_category_id: string | null;
  staff_role_id: string | null;
  log_channel_id: string | null;
  pay_format: string;
  default_pay_recipient: string | null;
  one_ticket_limit: number;
};

export function requireGuildId(id: string | null | undefined): string {
  if (!id) throw new Error("Dieser Bot funktioniert nur auf Servern.");
  return id;
}

export function getGuild(id: string | null | undefined): GuildConfig {
  const guildId = requireGuildId(id);
  const existing = db.prepare("SELECT * FROM guilds WHERE id = ?").get(guildId) as GuildConfig | undefined;
  if (existing) return existing;
  db.prepare("INSERT INTO guilds (id) VALUES (?)").run(guildId);
  return db.prepare("SELECT * FROM guilds WHERE id = ?").get(guildId) as GuildConfig;
}

export function updateGuild(id: string | null | undefined, patch: Partial<GuildConfig>) {
  const guildId = requireGuildId(id);
  getGuild(guildId);
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
  if (!entries.length) return getGuild(guildId);
  const sql = `UPDATE guilds SET ${entries.map(([k]) => `${k} = ?`).join(", ")} WHERE id = ?`;
  db.prepare(sql).run(...entries.map(([, v]) => v), guildId);
  return getGuild(guildId);
}

export function ensureDefaultCategories(guildId: string | null | undefined) {
  const id = requireGuildId(guildId);
  db.prepare(
    "DELETE FROM ticket_categories WHERE guild_id = ? AND (type = 'verify' OR name = 'Verifizieren')",
  ).run(id);
  const count = db.prepare("SELECT COUNT(*) AS c FROM ticket_categories WHERE guild_id = ?").get(id) as { c: number };
  if (count.c > 0) return;
  const defaults = [
    ["Website-Support", "🔵", "Hilfe rund um Website, Login oder technische Probleme.", "support"],
    ["Allgemeiner Support", "⚪", "allgemeine Fragen und Anliegen.", "support"],
    ["Clan-Fight", "⚔️", "Anfrage für einen Clan-Fight.", "support"],
    ["Allianz-Anfrage", "🤝", "Anfrage für eine Allianz.", "support"],
    ["Giveaway", "🎉", "Anliegen rund um Gewinne oder Gewinnspiele.", "support"],
  ] as const;
  const insert = db.prepare(
    "INSERT INTO ticket_categories (guild_id, name, emoji, description, type, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
  );
  defaults.forEach((row, i) => insert.run(id, ...row, i));
}

export function countOpenTickets(guildId: string, userId: string, type?: string) {
  if (type) {
    return (
      db
        .prepare("SELECT COUNT(*) AS c FROM tickets WHERE guild_id = ? AND user_id = ? AND status = 'open' AND type = ?")
        .get(guildId, userId, type) as { c: number }
    ).c;
  }
  return (
    db
      .prepare("SELECT COUNT(*) AS c FROM tickets WHERE guild_id = ? AND user_id = ? AND status = 'open'")
      .get(guildId, userId) as { c: number }
  ).c;
}

export function countOpenByService(guildId: string, serviceId: number) {
  return (
    db
      .prepare("SELECT COUNT(*) AS c FROM tickets WHERE guild_id = ? AND service_id = ? AND status = 'open'")
      .get(guildId, serviceId) as { c: number }
  ).c;
}
