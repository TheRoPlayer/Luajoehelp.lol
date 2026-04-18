import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbDir = path.join(process.cwd(), "db");
const dbPath = path.join(dbDir, "scriptvault.db");

if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

export const db = new Database(dbPath);

export function initDb() {
  const schema = fs.readFileSync(path.join(dbDir, "schema.sql"), "utf8");
  db.exec(schema);

  const count = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  if (count === 0) {
    const seed = fs.readFileSync(path.join(dbDir, "seed.sql"), "utf8");
    db.exec(seed);
  }
}
