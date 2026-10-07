// DEPTHGATE — servidor local de teste SEM dependências (Node puro).
// Uso: node server.cjs  (ou duplo clique em INICIAR-JOGO.bat)
// Serve os arquivos desta pasta em http://localhost:5200 e abre o navegador.
const http = require("http");
const { readFile } = require("fs");
const { extname, join, normalize } = require("path");
const { exec } = require("child_process");
const os = require("os");

const ROOT = __dirname;
const PORT = process.env.PORT || 5200;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

// WebRTC P2P Signaling Store (em memória, sem dependências externas)
const signalRooms = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [code, r] of signalRooms.entries()) {
    if (now - r.updatedAt > 15 * 60 * 1000) signalRooms.delete(code);
  }
}, 60 * 1000);

const sanitizeDesc = (desc) => {
  if (!desc || typeof desc !== "object") return null;
  const type = typeof desc.type === "string" ? desc.type.toLowerCase() : null;
  const sdp = typeof desc.sdp === "string" ? desc.sdp : null;
  if (!type || !sdp || !["offer", "answer", "pranswer", "rollback"].includes(type)) return null;
  return { type, sdp };
};

const sanitizeCandidate = (cand) => {
  if (!cand || typeof cand !== "object") return null;
  if (!cand.candidate || typeof cand.candidate !== "string") return null;
  const c = cand.candidate.trim();
  if (!c || !c.startsWith("candidate:")) return null;
  return {
    candidate: c,
    sdpMid: cand.sdpMid != null ? String(cand.sdpMid) : undefined,
    sdpMLineIndex: cand.sdpMLineIndex != null ? Number(cand.sdpMLineIndex) : undefined
  };
};

const normalizeRoomCode = (raw) => {
  if (!raw) return "";
  let clean = String(raw).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.startsWith("DG")) clean = clean.substring(2);
  return clean;
};

const getRoom = (raw) => {
  if (!raw) return null;
  const clean = normalizeRoomCode(raw);
  return signalRooms.get(clean) || signalRooms.get("DG-" + clean) || signalRooms.get(String(raw).toUpperCase().trim()) || null;
};

function handleP2PSignal(req, res, pathname, url) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(200); return res.end(); }

  if (pathname === "/api/signal/info" && req.method === "GET") {
    const interfaces = os.networkInterfaces();
    let lanIp = "localhost";
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === "IPv4" && !iface.internal) {
          lanIp = iface.address;
          break;
        }
      }
      if (lanIp !== "localhost") break;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, lanIp, port: PORT, lanUrl: `http://${lanIp}:${PORT}` }));
    return true;
  }

  if (pathname === "/api/signal/create" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const d = JSON.parse(body || "{}");
        const clean = normalizeRoomCode(d.code) || Math.random().toString(36).substring(2, 6).toUpperCase();
        const code = "DG-" + clean;
        const hostOffer = sanitizeDesc(d.offer);
        const roomObj = {
          code, clean, hostOffer, guestAnswer: null,
          hostCandidates: [], guestCandidates: [], updatedAt: Date.now()
        };
        signalRooms.set(clean, roomObj);
        signalRooms.set(code, roomObj);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, code, cleanCode: clean }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
    });
    return true;
  }
  if (pathname === "/api/signal/join" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const d = JSON.parse(body || "{}");
        const r = getRoom(d.code);
        if (!r) {
          res.writeHead(404, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Sala não encontrada! Verifique o código e se o Host já clicou em Criar Sala." }));
        }
        r.updatedAt = Date.now();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, offer: r.hostOffer, code: r.code }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
    });
    return true;
  }
  if (pathname === "/api/signal/answer" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const d = JSON.parse(body || "{}");
        const r = getRoom(d.code);
        if (!r) { res.writeHead(404, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ error: "Sala não encontrada" })); }
        const guestAnswer = sanitizeDesc(d.answer);
        if (guestAnswer) r.guestAnswer = guestAnswer;
        r.updatedAt = Date.now();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
    });
    return true;
  }
  if (pathname === "/api/signal/candidate" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const d = JSON.parse(body || "{}");
        const r = getRoom(d.code);
        if (!r) { res.writeHead(404, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ error: "Sala não encontrada" })); }
        const cand = sanitizeCandidate(d.candidate);
        if (cand) {
          if (d.from === "host") r.hostCandidates.push(cand);
          else r.guestCandidates.push(cand);
        }
        r.updatedAt = Date.now();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
    });
    return true;
  }
  if (pathname.startsWith("/api/signal/poll/") && req.method === "GET") {
    const rawCode = pathname.replace("/api/signal/poll/", "").trim();
    const role = url.searchParams.get("role");
    const r = getRoom(rawCode);
    if (!r) { res.writeHead(404, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ error: "Sala não encontrada" })); }
    r.updatedAt = Date.now();
    res.writeHead(200, { "Content-Type": "application/json" });
    if (role === "host") {
      const candidates = [...r.guestCandidates];
      r.guestCandidates.length = 0;
      res.end(JSON.stringify({ answer: r.guestAnswer, candidates }));
    } else {
      const candidates = [...r.hostCandidates];
      r.hostCandidates.length = 0;
      res.end(JSON.stringify({ candidates }));
    }
    return true;
  }
  return false;
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(reqUrl.pathname);
  if (pathname.startsWith("/api/signal/")) {
    if (handleP2PSignal(req, res, pathname, reqUrl)) return;
  }
  let path = pathname;
  if (path.endsWith("/")) path += "index.html";
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  readFile(file, (err, data) => {
    if (err) {
      // fallback de navegação (SPA/PWA)
      return readFile(join(ROOT, "index.html"), (err2, index) => {
        if (err2) { res.writeHead(404); return res.end("404"); }
        res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-cache, no-store, must-revalidate" });
        res.end(index);
      });
    }
    const ext = extname(file).toLowerCase();
    const headers = { "Content-Type": MIME[ext] || "application/octet-stream" };
    if (ext === ".html" || ext === ".js" || ext === ".mjs" || ext === ".json") {
      headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
    }
    res.writeHead(200, headers);
    res.end(data);
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}/`;
  console.log(`\n  DEPTHGATE rodando em ${url}`);
  console.log("  (Ctrl+C para encerrar)\n");
  const opener = process.platform === "win32" ? `start "" "${url}"`
    : process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
  exec(opener);
});
