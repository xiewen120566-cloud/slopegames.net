const http = require("http");
const fs = require("fs");
const path = require("path");
const net = require("net");

const root = process.cwd();
const startPort = Number(process.env.PORT || 7333);
const maxPort = startPort + 20;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

const server = http.createServer((req, res) => {
  const urlPath = (req.url || "/").split("?")[0];
  const safePath = decodeURIComponent(urlPath);
  let filePath = safePath === "/" ? "/333/index.html" : safePath;
  filePath = path.join(root, filePath.replace(/^\/+/, ""));

  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
  } catch {}

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Not Found");
      return;
    }
    res.statusCode = 200;
    res.setHeader(
      "Content-Type",
      mime[path.extname(filePath).toLowerCase()] || "application/octet-stream"
    );
    res.end(data);
  });
});

const isPortFree = (port) => {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", () => resolve(false))
      .once("listening", () => tester.close(() => resolve(true)))
      .listen(port, "127.0.0.1");
  });
};

const findFreePort = async (from, to) => {
  for (let port = from; port <= to; port++) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No free port in range ${from}-${to}`);
};

(async () => {
  const port = await findFreePort(startPort, maxPort);
  server.listen(port, "127.0.0.1", () => {
    process.stdout.write(`http://127.0.0.1:${port}/333/index.html\n`);
  });
})().catch((err) => {
  process.stderr.write(String(err && err.stack ? err.stack : err) + "\n");
  process.exit(1);
});
