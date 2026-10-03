import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { Run } from "./types";
let db: DatabaseSync;
function database() {
  if (!db) {
    mkdirSync(path.join(process.cwd(), "data"), { recursive: true });
    db = new DatabaseSync(
      process.env.AFTERBELL_DATABASE_PATH ||
        path.join(process.cwd(), "data", "afterbell.sqlite"),
    );
    db.exec(
      "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, created TEXT NOT NULL, body TEXT NOT NULL)",
    );
    const columns = db.prepare("PRAGMA table_info(runs)").all();
    if (!columns.some((c) => c.name === "owner"))
      db.exec(
        "ALTER TABLE runs ADD COLUMN owner TEXT NOT NULL DEFAULT '__local__'",
      );
  }
  return db;
}
export function save(run: Run, owner = "__local__") {
  database()
    .prepare(
      "INSERT OR REPLACE INTO runs (id,created,body,owner) VALUES (?, ?, ?, ?)",
    )
    .run(run.id, run.createdAt, JSON.stringify(run), owner);
}
export function get(id: string, owner = "__local__"): Run | null {
  const row = database()
    .prepare("SELECT body FROM runs WHERE id=? AND owner=?")
    .get(id, owner) as { body: string } | undefined;
  return row ? JSON.parse(row.body) : null;
}
export function recent(owner = "__local__") {
  return database()
    .prepare(
      "SELECT body FROM runs WHERE owner=? ORDER BY created DESC LIMIT 20",
    )
    .all(owner)
    .map((row) => {
      const r = JSON.parse(String(row.body)) as Run;
      return {
        id: r.id,
        createdAt: r.createdAt,
        status: r.status,
        symbol: r.input.symbol,
        question: r.input.question,
        engine: r.engine,
        mode: r.input.mode,
      };
    });
}
