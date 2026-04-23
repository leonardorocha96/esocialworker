// Worker Node.js — recebe { endpoint, soap, cert (PEM), key (PEM) } do Edge Function
// e faz a chamada mTLS REAL para o webservice do e-Social.
//
// Deploy: Render / Railway / Fly.io / VPS — qualquer Node 18+.
// Variáveis: PORT (default 3000), WORKER_TOKEN (opcional, autenticação simples).

import express from "express";
import https from "node:https";
import { URL } from "node:url";

const app = express();
app.use(express.json({ limit: "10mb" }));

const WORKER_TOKEN = process.env.WORKER_TOKEN || null;

app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.post("/esocial", async (req, res) => {
  try {
    if (WORKER_TOKEN) {
      const auth = req.headers.authorization || "";
      if (auth !== `Bearer ${WORKER_TOKEN}`) {
        return res.status(401).json({ error: "unauthorized" });
      }
    }

    const { endpoint, soap, cert, key } = req.body || {};
    if (!endpoint || !soap || !cert || !key) {
      return res.status(400).json({ error: "endpoint, soap, cert, key obrigatórios" });
    }

    const url = new URL(endpoint);
    const body = Buffer.from(soap, "utf8");

    const options = {
      method: "POST",
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      cert,            // PEM do certificado público
      key,             // PEM da chave privada
      rejectUnauthorized: true,
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
        "Content-Length": body.length,
        "SOAPAction": "",
      },
    };

    const upstream = await new Promise((resolve, reject) => {
      const r = https.request(options, (resp) => {
        const chunks = [];
        resp.on("data", (c) => chunks.push(c));
        resp.on("end", () => resolve({
          status: resp.statusCode || 0,
          body: Buffer.concat(chunks).toString("utf8"),
        }));
      });
      r.on("error", reject);
      r.write(body);
      r.end();
    });

    res
      .status(upstream.status >= 200 && upstream.status < 300 ? 200 : upstream.status)
      .type("application/xml")
      .send(upstream.body);
  } catch (err) {
    console.error("worker error", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`esocial-worker ouvindo em :${port}`));
