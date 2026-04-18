(function () {
  const config = window.APP_CONFIG || {};
  const loginBtn = document.getElementById("discordLoginBtn");
  const toast = document.getElementById("toast");

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.classList.remove("show"), 3000);
  }

  function randomState(length = 32) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < array.length; i++) {
      result += chars[array[i] % chars.length];
    }
    return result;
  }

  function buildDiscordAuthUrl() {
    if (!config.discordClientId || config.discordClientId === "YOUR_DISCORD_CLIENT_ID") {
      showToast("Add your Discord client ID in config.js first.");
      return null;
    }

    const state = randomState();
    sessionStorage.setItem("discord_oauth_state", state);

    const params = new URLSearchParams({
      client_id: config.discordClientId,
      response_type: "code",
      redirect_uri: config.redirectUri,
      scope: (config.discordScopes || ["identify"]).join(" "),
      state,
      prompt: "consent"
    });

    return `https://discord.com/oauth2/authorize?${params.toString()}`;
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const url = buildDiscordAuthUrl();
      if (url) window.location.href = url;
    });
  }

  const revealItems = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealItems.forEach((item) => observer.observe(item));
})();
