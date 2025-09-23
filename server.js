import 'dotenv/config';
import express from 'express';
import { GoogleAuth } from 'google-auth-library';

console.log("[BOOT] Starting server.js");

// Dump key environment values (but don’t log secrets!)
console.log("[ENV] GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS || "(not set)");
console.log("[ENV] PORT:", process.env.PORT || "(default 8080)");

const app = express();
console.log("[APP] Creating Express app");

// put this ABOVE everything else (before body parsers, auth, decode, 404, etc.)
app.all('/healthz', (req, res) => {
  console.log('[ROUTE] /healthz', req.method);
  res.set('Cache-Control', 'no-store').json({ ok: true });
});

//app.use(express.json({ limit: '1mb' }));
//console.log("[APP] JSON body parser attached");

// Init GoogleAuth
console.log("[AUTH] Initializing GoogleAuth with Play Integrity scope");
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/playintegrity']
});

// (Optional) log every request path so you can see it in logs
app.use((req, _res, next) => { console.log(`[REQ] ${req.method} ${req.path}`); next(); });

//app.get('/healthz', (_req, res) => {
//  console.log("[ROUTE] GET /healthz hit");
//  res.json({ ok: true });
//});

// Health route (exactly this path)
//app.get('/healthz', (_req, res) => res.json({ ok: true }));

// (Optional) root for sanity
app.get('/', (_req, res) => res.json({ ok: true, hint: 'Use /healthz or POST /decode' }));

const jsonBody = express.json({ limit: '1mb' });
console.log("[APP] JSON body parser attached");

// POST /decode  { packageName, encodedIntegrityToken }
app.post('/decode',jsonBody, async (req, res) => {
  console.log("[ROUTE] POST /decode hit");
  console.log("[REQ BODY]", req.body);

  try {
    const { packageName, encodedIntegrityToken } = req.body;
    console.log("[CHECK] packageName:", packageName);
    console.log("[CHECK] encodedIntegrityToken length:", encodedIntegrityToken ? encodedIntegrityToken.length : "(missing)");

    if (!packageName || !encodedIntegrityToken) {
      console.warn("[WARN] Missing packageName or encodedIntegrityToken");
      return res.status(400).json({ error: "packageName and encodedIntegrityToken required" });
    }

    console.log("[AUTH] Getting Google client");
    const client = await auth.getClient();
    console.log("[AUTH] Got Google client");

    const url = `https://playintegrity.googleapis.com/v1/${encodeURIComponent(packageName)}:decodeIntegrityToken`;
    console.log("[REQUEST] URL:", url);

    console.log("[REQUEST] Sending request to Play Integrity API...");
    const r = await client.request({
      url,
      method: 'POST',
      data: { integrity_token: encodedIntegrityToken }
    });
    console.log("[REQUEST] Response received from Play Integrity API");
    console.log("[RESPONSE DATA]", JSON.stringify(r.data, null, 2));

    // Optional server-side enforcement checks (log placeholders):
    if (r.data?.requestDetails) {
      console.log("[CHECK] requestDetails:", JSON.stringify(r.data.requestDetails, null, 2));
    }

    res.json(r.data);
  } catch (e) {
    console.error("[ERROR] Exception in /decode:", e);
    res.status(500).json({ error: String(e) });
  }
});

// Optional: unified 404 so you see the path in the browser too
app.use((req, res) => res.status(404).json({ error: 'not found', path: req.originalUrl }));

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`[BOOT] Verifier listening on :${port}`);
});
