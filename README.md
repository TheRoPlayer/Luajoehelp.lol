# NovaPortal Starter

A polished homepage starter with a Discord login button and the front-end pieces for OAuth.

## What is included

- `index.html` — animated homepage
- `styles.css` — full styling and effects
- `script.js` — UI behavior and Discord auth redirect
- `config.js` — easy config file
- `callback.html` — handles the redirect after Discord login
- `server-example.js` — example secure backend route for token exchange

## Important

Do **not** put your Discord client secret into the front end or commit it to GitHub.
Use the included backend example or a serverless function.

## Setup

### 1) Create a Discord app

Go to the Discord Developer Portal and create an application.

### 2) Add a redirect URI

For local testing, use something like:

`http://localhost:5500/callback.html`

For production, use your real deployed callback URL.

### 3) Update `config.js`

Set:

- `discordClientId`
- `redirectUri`
- `backendExchangeUrl`

### 4) Run a local static server

You can use the VS Code Live Server extension, or any simple local server.

### 5) Run the backend example

```bash
npm install express cors
```

Set env vars:

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`

Then run:

```bash
node server-example.js
```

## GitHub

You can push the front end to a GitHub repo immediately.
For production login, deploy the backend example to Vercel, Netlify Functions, Railway, Render, or another backend host.

## Next step ideas

- Add a real dashboard after login
- Store sessions with secure cookies instead of local storage
- Add user avatar + username in the header after login
- Add route protection for dashboard pages
