# ScriptVault V3

A fuller full-stack starter for a Lua script platform.

## Included
- animated homepage
- dashboard
- upload page
- profile page
- Discord OAuth wiring with backend routes
- persistent SQLite database for users and scripts
- raw script endpoints
- view + points tracking on raw hits
- session-based auth starter
- GitHub-ready frontend files

## Stack
- Node.js
- Express
- better-sqlite3
- express-session
- dotenv

## Quick start
1. `npm install`
2. Copy `.env.example` to `.env`
3. Fill in:
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - `DISCORD_REDIRECT_URI`
   - `SESSION_SECRET`
4. `npm run dev`
5. Open `http://localhost:3000`

## Notes
- This is a starter, not a finished production deployment.
- Sessions use the default memory session store in this starter.
- For production, move sessions to Redis or a DB-backed session store.
- Private scripts are owner-only in API routes and blocked on raw access by default.
- Public and unlisted scripts can be served via `/raw/:id`.

## Discord setup
Add your redirect URI in the Discord developer portal so it exactly matches your `.env` value.

Example:
`http://localhost:3000/api/auth/discord/callback`
