const express = require('express');
const { kv } = require('@vercel/kv');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
const PLACE_ID = 109983668079237;   // Steal a Brainrot
const COOLDOWN = 15 * 60;           // 15 minuta (možeš promijeniti)
const SECRET = process.env.API_SECRET;

if (!SECRET) console.error("⚠️ API_SECRET nije postavljen!");

const checkSecret = (req, res, next) => {
  if (req.headers['x-api-secret'] !== SECRET) {
    return res.status(401).json({ error: "Invalid secret" });
  }
  next();
};

// ==================== GET SERVER (nove servere) ====================
app.get('/get-server', checkSecret, async (req, res) => {
  try {
    const response = await fetch(`https://games.roblox.com/v1/games/${PLACE_ID}/servers/Public?limit=100`);
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return res.json({ job_id: null });
    }

    let scanned = await kv.get("scanned_servers") || {};
    const now = Math.floor(Date.now() / 1000);

    for (const server of data.data) {
      const jobId = server.id;
      if (!scanned[jobId] || (now - scanned[jobId]) > COOLDOWN) {
        console.log(`[GET] Vraćam novi server: ${jobId}`);
        return res.json({ job_id: jobId });
      }
    }

    res.json({ job_id: null });
  } catch (err) {
    console.error(err);
    res.json({ job_id: null });
  }
});

// ==================== ADD SERVER ====================
app.post('/add-server', checkSecret, async (req, res) => {
  const jobId = req.body.jobId;
  if (jobId) {
    let scanned = await kv.get("scanned_servers") || {};
    scanned[jobId] = Math.floor(Date.now() / 1000);
    await kv.set("scanned_servers", scanned);
  }
  console.log(`[ADD] Primljeni brainroti za: ${jobId}`);
  res.json({ success: true });
});

// ==================== RECORD HOP ====================
app.post('/record-hop', checkSecret, (req, res) => {
  console.log("[HOP]", req.body);
  res.json({ success: true });
});

// ==================== BOT DEDUPLICATION ====================
app.post('/scanner-register', checkSecret, async (req, res) => {
  let bots = await kv.get("bot_list") || [];
  if (req.body.username && !bots.includes(req.body.username)) {
    bots.push(req.body.username);
    await kv.set("bot_list", bots);
  }
  res.json({ success: true });
});

app.get('/scanner-list', checkSecret, async (req, res) => {
  const bots = await kv.get("bot_list") || [];
  res.json({ usernames: bots });
});

app.listen(PORT, () => {
  console.log(`🚀 Brainrot API radi na portu ${PORT}`);
});
