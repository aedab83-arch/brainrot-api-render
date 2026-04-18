const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

const PORT = process.env.PORT || 10000;
const PLACE_ID = 109983668079237;
const COOLDOWN = 15 * 60;           // 15 minuta

// Spremi scanned servere u memoriju
let scannedServers = {};

console.log("🚀 Brainrot Backend (bez Redisa) pokrenut...");

const checkSecret = (req, res, next) => {
  if (req.headers['x-api-secret'] !== process.env.API_SECRET) {
    return res.status(401).json({ error: "Invalid secret" });
  }
  next();
};

// GET new server
app.get('/get-server', checkSecret, async (req, res) => {
  try {
    const response = await fetch(`https://games.roblox.com/v1/games/${PLACE_ID}/servers/Public?limit=100`);
    const data = await response.json();

    if (!data.data || data.data.length === 0) return res.json({ job_id: null });

    const now = Math.floor(Date.now() / 1000);

    for (const s of data.data) {
      const lastScan = scannedServers[s.id] || 0;
      if (lastScan === 0 || (now - lastScan) > COOLDOWN) {
        return res.json({ job_id: s.id });
      }
    }
    res.json({ job_id: null });
  } catch (e) {
    res.json({ job_id: null });
  }
});

// ADD server
app.post('/add-server', checkSecret, (req, res) => {
  const jobId = req.body.jobId;
  if (jobId) {
    scannedServers[jobId] = Math.floor(Date.now() / 1000);
  }
  res.json({ success: true });
});

// Record hop
app.post('/record-hop', checkSecret, (req, res) => {
  console.log("[HOP]", req.body);
  res.json({ success: true });
});

// Bot registry (u memoriji)
let botList = [];

app.post('/scanner-register', checkSecret, (req, res) => {
  if (req.body.username && !botList.includes(req.body.username)) {
    botList.push(req.body.username);
  }
  res.json({ success: true });
});

app.get('/scanner-list', checkSecret, (req, res) => {
  res.json({ usernames: botList });
});

// WebSocket
wss.on('connection', (ws) => {
  console.log('✅ Novi WebSocket klijent spojen');
  ws.on('message', (msg) => {
    if (msg.toString() === "ping") ws.send("pong");
  });
});

server.listen(PORT, () => {
  console.log(`✅ Brainrot Backend (memorija) radi na portu ${PORT}`);
  console.log(`🔗 WebSocket URL: wss://brainrot-api-render.onrender.com`);
});
