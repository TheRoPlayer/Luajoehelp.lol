window.APP_CONFIG = {
  appName: "NovaPortal",

  // Fill these in later from the Discord Developer Portal and your deployment.
  discordClientId: "YOUR_DISCORD_CLIENT_ID",
  redirectUri: "http://localhost:5500/callback.html",

  // For sign-in only, `identify` is usually enough. Add `email` only if you truly need it.
  discordScopes: ["identify"],

  // This endpoint should exist on your backend/serverless app.
  // It receives { code, redirectUri } and exchanges it with Discord securely.
  backendExchangeUrl: "http://localhost:3000/api/auth/discord/exchange"
};
