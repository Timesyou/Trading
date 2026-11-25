import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { runSmaBacktest } from "./src/backtest.js";
import { PaperBroker } from "./src/paper-broker.js";

const root = fileURLToPath(new URL("./public/", import.meta.url));
const broker = new PaperBroker();
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };
const send = (res, status, data, type = "application/json; charset=utf-8") => {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(type.startsWith("application/json") ? JSON.stringify(data) : data);
};
async function body(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 2_000_000) throw new Error("Request body too large");
  }
  return raw ? JSON.parse(raw) : {};
}
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/api/health") return send(res, 200, { ok: true, mode: "LOCAL_PAPER_ONLY", liveTradingEnabled: false });
    if (req.method === "GET" && url.pathname === "/api/paper/state") return send(res, 200, broker.snapshot());
    if (req.method === "POST" && url.pathname === "/api/backtest") {
      const input = await body(req);
      return send(res, 200, runSmaBacktest(input.candles, input.options || {}));
    }
    if (req.method === "POST" && url.pathname === "/api/paper/order") {
      const input = await body(req);
      return send(res, 200, { fill: broker.placeOrder(input), state: broker.snapshot() });
    }
    if (req.method === "POST" && url.pathname === "/api/paper/kill") {
      const input = await body(req);
      broker.setKillSwitch(input.active !== false);
      return send(res, 200, broker.snapshot());
    }
    if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });
    const requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
    const safe = normalize(requested).replace(/^([.][.][/\\])+/, "");
    const path = join(root, safe);
    if (!path.startsWith(root)) return send(res, 403, { error: "Forbidden" });
    const data = await readFile(path);
    return send(res, 200, data.toString("utf8"), mime[extname(path)] || "application/octet-stream");
  } catch (error) {
    const status = error.message === "Method not allowed" ? 405 : 400;
    return send(res, status, { error: error.message || "Request failed" });
  }
});
const port = Number(process.env.PORT || 4173);
server.listen(port, "127.0.0.1", () => process.stdout.write(`ATI local dashboard: http://127.0.0.1:${port}\n`));
