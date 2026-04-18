import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { db, initDb } from "./db.js";

dotenv.config();
initDb();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "change_me",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

app.use(express.static(path.join(__dirname, "public")));

function nowIso() {
  return new Date().toISOString();
}
function makeId(prefix = "sv") {
  return `${prefix}_${Math.floor(Math.random() * 900000 + 100000)}`;
}
function buildAvatarUrl(discordId, avatar) {
  if (!avatar) return "";
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png`;
}
function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "not authenticated" });
  next();
}
function serializeScript(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    views: row.views,
    points: row.points,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rawUrl: `${BASE_URL}/raw/${row.id}`,
    loader: `loadstring(game:HttpGet("${BASE_URL}/raw/${row.id}"))()`
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "ScriptVault V3 API" });
});

app.get("/api/auth/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

app.get("/api/auth/discord/start", (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: "Discord env vars missing" });
  }

  const state = crypto.randomBytes(16).toString("hex");
  req.session.oauthState = state;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "identify",
    state,
    prompt: "consent"
  });

  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

app.get("/api/auth/discord/callback", async (req, res) => {
  const { code, state } = req.query;
  const expected = req.session.oauthState;

  if (!code || !state || state !== expected) {
    return res.redirect("/callback.html?error=state");
  }

  try {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code: String(code),
        redirect_uri: process.env.DISCORD_REDIRECT_URI
      })
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error("Discord token exchange failed:", text);
      return res.redirect("/callback.html?error=token");
    }

    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!userRes.ok) {
      const text = await userRes.text();
      console.error("Discord user fetch failed:", text);
      return res.redirect("/callback.html?error=user");
    }

    const discordUser = await userRes.json();

    let user = db.prepare("SELECT * FROM users WHERE discord_id = ?").get(discordUser.id);
    if (!user) {
      const newId = makeId("u");
      db.prepare(`
        INSERT INTO users (id, discord_id, username, avatar, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(newId, discordUser.id, discordUser.username, discordUser.avatar || "", nowIso());
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(newId);
    } else {
      db.prepare("UPDATE users SET username = ?, avatar = ? WHERE id = ?")
        .run(discordUser.username, discordUser.avatar || "", user.id);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
    }

    req.session.user = {
      id: user.id,
      discordId: user.discord_id,
      username: user.username,
      avatar: buildAvatarUrl(user.discord_id, user.avatar)
    };

    delete req.session.oauthState;
    res.redirect("/dashboard.html");
  } catch (err) {
    console.error(err);
    res.redirect("/callback.html?error=unknown");
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/scripts", (req, res) => {
  const viewer = req.session.user;
  let rows;
  if (viewer) {
    rows = db.prepare(`
      SELECT * FROM scripts
      WHERE visibility IN ('public', 'unlisted') OR owner_user_id = ?
      ORDER BY updated_at DESC
    `).all(viewer.id);
  } else {
    rows = db.prepare(`
      SELECT * FROM scripts
      WHERE visibility IN ('public', 'unlisted')
      ORDER BY updated_at DESC
    `).all();
  }
  res.json({ items: rows.map(serializeScript) });
});

app.get("/api/my/scripts", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM scripts WHERE owner_user_id = ? ORDER BY updated_at DESC").all(req.session.user.id);
  res.json({ items: rows.map(serializeScript) });
});

app.get("/api/scripts/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM scripts WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "not found" });

  const viewerId = req.session.user?.id;
  const canReadMeta = row.visibility !== "private" || row.owner_user_id === viewerId;
  if (!canReadMeta) return res.status(403).json({ error: "forbidden" });

  res.json({
    ...serializeScript(row),
    code: row.owner_user_id === viewerId ? row.code : undefined
  });
});

app.post("/api/scripts", requireAuth, (req, res) => {
  const { title, description = "", visibility = "private", code = "" } = req.body || {};
  if (!title) return res.status(400).json({ error: "title required" });
  if (!code) return res.status(400).json({ error: "code required" });
  if (!["private", "unlisted", "public"].includes(visibility)) {
    return res.status(400).json({ error: "invalid visibility" });
  }

  const id = makeId("sv");
  const now = nowIso();
  db.prepare(`
    INSERT INTO scripts (id, owner_user_id, title, description, visibility, code, views, points, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
  `).run(id, req.session.user.id, title, description, visibility, code, now, now);

  const row = db.prepare("SELECT * FROM scripts WHERE id = ?").get(id);
  res.status(201).json(serializeScript(row));
});

app.put("/api/scripts/:id", requireAuth, (req, res) => {
  const existing = db.prepare("SELECT * FROM scripts WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "not found" });
  if (existing.owner_user_id !== req.session.user.id) return res.status(403).json({ error: "forbidden" });

  const title = req.body.title ?? existing.title;
  const description = req.body.description ?? existing.description;
  const visibility = req.body.visibility ?? existing.visibility;
  const code = req.body.code ?? existing.code;

  db.prepare(`
    UPDATE scripts
    SET title = ?, description = ?, visibility = ?, code = ?, updated_at = ?
    WHERE id = ?
  `).run(title, description, visibility, code, nowIso(), existing.id);

  const row = db.prepare("SELECT * FROM scripts WHERE id = ?").get(existing.id);
  res.json(serializeScript(row));
});

app.delete("/api/scripts/:id", requireAuth, (req, res) => {
  const existing = db.prepare("SELECT * FROM scripts WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "not found" });
  if (existing.owner_user_id !== req.session.user.id) return res.status(403).json({ error: "forbidden" });

  db.prepare("DELETE FROM scripts WHERE id = ?").run(existing.id);
  res.json({ ok: true });
});

app.get("/raw/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM scripts WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).type("text/plain").send("-- not found");

  if (row.visibility === "private") {
    return res.status(403).type("text/plain").send("-- private script");
  }

  db.prepare("UPDATE scripts SET views = views + 1, points = points + 1, updated_at = ? WHERE id = ?")
    .run(nowIso(), row.id);

  res.type("text/plain; charset=utf-8").send(row.code);
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/raw/")) return next();
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`ScriptVault V3 running on ${BASE_URL}`);
});
