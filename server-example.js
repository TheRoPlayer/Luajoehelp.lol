// Example Express endpoint for secure Discord OAuth code exchange.
// Do NOT commit your client secret to GitHub.

import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/auth/discord/exchange", async (req, res) => {
  const { code, redirectUri } = req.body;

  if (!code || !redirectUri) {
    return res.status(400).json({ error: "Missing code or redirectUri." });
  }

  const body = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    client_secret: process.env.DISCORD_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri
  });

  try {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      return res.status(tokenRes.status).json(tokenData);
    }

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `${tokenData.token_type} ${tokenData.access_token}`
      }
    });

    const userData = await userRes.json();

    return res.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
      user: userData
    });
  } catch (error) {
    return res.status(500).json({ error: "Server error while exchanging Discord OAuth code." });
  }
});

app.listen(3000, () => {
  console.log("Discord auth server example running on http://localhost:3000");
});
