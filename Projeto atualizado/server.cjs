// DEPTHGATE — servidor local de teste SEM dependências (Node puro).
// Uso: node server.cjs  (ou duplo clique em INICIAR-JOGO.bat)
// Serve os arquivos desta pasta em http://localhost:5200 e abre o navegador.
const http = require("http");
const { readFile } = require("fs");
const { extname, join, normalize } = require("path");
const { exec } = require("child_process");

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

const server = http.createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
  if (path.endsWith("/")) path += "index.html";
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  readFile(file, (err, data) => {
    if (err) {
      // fallback de navegação (SPA/PWA)
      return readFile(join(ROOT, "index.html"), (err2, index) => {
        if (err2) { res.writeHead(404); return res.end("404"); }
        res.writeHead(200, { "Content-Type": MIME[".html"] });
        res.end(index);
      });
    }
    res.writeHead(200, { "Content-Type": MIME[extname(file).toLowerCase()] || "application/octet-stream" });
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
