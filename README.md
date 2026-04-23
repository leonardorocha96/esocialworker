# e-Social Worker (mTLS bridge)

Microserviço Node.js que recebe um envelope SOAP + certificado PEM do Edge Function do Lovable e faz a chamada **mTLS** real para o webservice do e-Social. Necessário porque o runtime Deno do Supabase Edge Functions não suporta apresentar certificado cliente em `fetch`.

## Endpoints

- `GET /health` → `{ ok: true }`
- `POST /esocial` → body JSON `{ endpoint, soap, cert, key }` → retorna o XML de resposta do e-Social

Se a env `WORKER_TOKEN` estiver setada, exija header `Authorization: Bearer <token>`.

---

## Deploy — Fly.io (recomendado, região GRU)

```bash
# 1. Instale o CLI: https://fly.io/docs/hands-on/install-flyctl/
fly auth signup    # ou: fly auth login

# 2. Dentro de esocial-worker/
fly launch --no-deploy --copy-config --name esocial-worker-SEUNOME --region gru
fly deploy

# 3. (opcional) habilite token de proteção
fly secrets set WORKER_TOKEN=$(openssl rand -hex 32)

# 4. URL final:
fly status   # → https://esocial-worker-SEUNOME.fly.dev
```

No Lovable, configure a secret **`ESOCIAL_WORKER_URL`** com:
```
https://esocial-worker-SEUNOME.fly.dev/esocial
```
(e `ESOCIAL_WORKER_TOKEN` se usou WORKER_TOKEN — ver TODO abaixo)

---

## Deploy — Render.com

1. Crie repositório Git só com a pasta `esocial-worker/`
2. https://dashboard.render.com → **New → Web Service** → conecte o repo
3. Render detecta o `render.yaml` automaticamente
4. Aguarde build → copie a URL `https://esocial-worker.onrender.com`
5. No Lovable: `ESOCIAL_WORKER_URL=https://esocial-worker.onrender.com/esocial`

⚠️ Tier grátis dorme após 15min — primeira chamada após inatividade demora ~30s.

---

## Deploy — Railway

```bash
npm i -g @railway/cli
railway login
cd esocial-worker
railway init
railway up
railway domain     # gera URL pública
```

---

## Deploy — VPS (Ubuntu) com PM2

```bash
# No servidor
git clone <seu-repo> && cd esocial-worker
npm install
npm i -g pm2
pm2 start server.js --name esocial-worker
pm2 save && pm2 startup

# Coloque atrás de um Nginx com HTTPS (Certbot)
```

---

## Teste local

```bash
npm install
npm start
curl http://localhost:3000/health
```

---

## Próximo passo no Lovable

Depois do deploy, me passe a URL e eu configuro a secret `ESOCIAL_WORKER_URL` automaticamente. A Edge Function `esocial-consultar-s5002` já está pronta para usar o worker (ela detecta a env var).
