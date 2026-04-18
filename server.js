const express = require('express');
const { WebSocketServer } = require('ws');
const { kv } = require('@vercel/kv');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

const PORT = process.env.PORT || 10000;
const PLACE_ID = 109983668079237;
const COOLDOWN = 15 * 60;
const SECRET = process.env.API_SECRET || "default-secret-change-me";

console.log("🚀 Brainrot Backend pokrenut...");

// Middleware za provjeru secreta
const checkSecret = (req, res, next) => {
  if (req.headers['x-api-secret'] !== SECRET) {
    return res.status(401).json({ error: "Invalid secret" });
  }
  next();
};

// ==================== HTTP ROUTES ====================

app.get('/get-server', checkSecret, async (req, res) => {
  try {
    const response = await fetch(`https://games.roblox.com/v1/games/${PLACE_ID}/servers/Public?limit=100`);
    const data = await response.json();

    if (!data.data || data.data.length === 0) return res.json({ job_id: null });

    let scanned = await kv.get("scanned_servers") || {};
    const now = Math.floor(Date.now() / 1000);

    for (const s of data.data) {
      if (!scanned[s.id] || (now - scanned[s.id]) > COOLDOWN) {
        return res.json({ job_id: s.id });
      }
    }
    res.json({ job_id: null });
  } catch (e) {
    res.json({ job_id: null });
  }
});

app.post('/add-server', checkSecret, async (req, res) => {
  const jobId = req.body.jobId;
  if (jobId) {
    let scanned = await kv.get("scanned_servers") || {};
    scanned[jobId] = Math.floor(Date.now() / 1000);
    await kv.set("scanned_servers", scanned);
  }
  res.json({ success: true });
});

app.post('/record-hop', checkSecret, (req, res) => {
  console.log("[HOP]", req.body);
  res.json({ success: true });
});

app.post('/scanner-register', checkSecret, async (req, res) => {
  let bots = await kv.get("bot_list") || [];
  if (req.body.username) {
    bots.push(req.body.username);
    await kv.set("bot_list", bots);
  }
  res.json({ success: true });
});

app.get('/scanner-list', checkSecret, async (req, res) => {
  const bots = await kv.get("bot_list") || [];
  res.json({ usernames: bots });
});

// ==================== WEBSOCKET ====================

wss.on('connection', (ws) => {
  console.log('✅ Novi WebSocket klijent spojen');
  ws.on('message', (msg) => {
    if (msg.toString() === "ping") ws.send("pong");
  });
  ws.on('close', () => console.log('WebSocket klijent odspojen'));
});

function broadcast(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(payload);
  });
}

server.listen(PORT, () => {
  console.log(`✅ Brainrot Backend radi na portu ${PORT}`);
  console.log(`🔗 WebSocket URL: wss://brainrot-api-render.onrender.com`);
});
