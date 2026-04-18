const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

const PORT = process.env.PORT || 10000;
const PLACE_ID = 109983668079237;
const COOLDOWN = 15 * 60;

let scannedServers = {};

console.log("🚀 Brainrot Backend (TEST MODE - bez secreta) pokrenut...");

// === BEZ PROVJERE SECRETA ZA TEST ===
app.get('/get-server', async (req, res) => {
  console.log("[GET] Zahtjev primljen");
  try {
    const response = await fetch(`https://games.roblox.com/v1/games/${PLACE_ID}/servers/Public?limit=100`);
    const data = await response.json();

    if (!data.data || data.data.length === 0) return res.json({ job_id: null });

    const now = Math.floor(Date.now() / 1000);

    for (const s of data.data) {
      const lastScan = scannedServers[s.id] || 0;
      if (lastScan === 0 || (now - lastScan) > COOLDOWN) {
        console.log(`[GET] Vraćam novi server: ${s.id}`);
        return res.json({ job_id: s.id });
      }
    }
    res.json({ job_id: null });
  } catch (e) {
    console.log("[GET] Greška:", e.message);
    res.json({ job_id: null });
  }
});

app.post('/add-server', async (req, res) => {
  console.log("[ADD] Primljen zahtjev!", req.body);
  const jobId = req.body.jobId;
  if (jobId) {
    scannedServers[jobId] = Math.floor(Date.now() / 1000);
    console.log(`[ADD] Server ${jobId} označen kao skeniran`);
  }
  res.json({ success: true });
});

app.post('/record-hop', (req, res) => {
  console.log("[HOP] Primljen:", req.body);
  res.json({ success: true });
});

app.post('/scanner-register', (req, res) => {
  console.log("[REGISTER] Bot:", req.body.username);
  res.json({ success: true });
});

app.get('/scanner-list', (req, res) => {
  res.json({ usernames: [] });
});

// WebSocket
wss.on('connection', (ws) => {
  console.log('✅ WebSocket klijent spojen');
});

server.listen(PORT, () => {
  console.log(`✅ Backend radi na portu ${PORT}`);
  console.log(`🔗 WebSocket: wss://brainrot-api-render.onrender.com`);
});
