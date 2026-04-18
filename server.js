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

console.log("🚀 Brainrot Backend (TEST MODE) pokrenut...");

// Broadcast funkcija
function broadcastNewServer(data) {
  const payload = JSON.stringify({
    type: "new_server",
    ...data
  });
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
  console.log(`[BROADCAST] Poslano ${data.brainrots ? data.brainrots.length : 0} brainrota`);
}

// GET SERVER
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
    res.json({ job_id: null });
  }
});

// ADD SERVER - OVDJE DODAJEMO BROADCAST
app.post('/add-server', async (req, res) => {
  console.log("[ADD] Primljen zahtjev!", req.body);
  const jobId = req.body.jobId;
  const brainrots = req.body.brainrots || [];

  if (jobId) {
    scannedServers[jobId] = Math.floor(Date.now() / 1000);
  }

  // VAŽNO: Broadcast prema AutoJoineru
  if (brainrots.length > 0) {
    broadcastNewServer({
      jobid: jobId,
      name: brainrots[0].name || "Unknown",
      money: brainrots[0].gen || "0",
      brainrots: brainrots
    });
  }

  res.json({ success: true });
});

app.post('/record-hop', (req, res) => {
  console.log("[HOP]", req.body);
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
  console.log('✅ WebSocket klijent spojen (Pulse Joiner)');
});

server.listen(PORT, () => {
  console.log(`✅ Backend radi na portu ${PORT}`);
  console.log(`🔗 WebSocket URL: wss://brainrot-api-render.onrender.com`);
});
