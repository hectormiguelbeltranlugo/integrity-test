import 'dotenv/config';
import express from 'express';
import { GoogleAuth } from 'google-auth-library';

const app = express();
app.use(express.json({ limit: '1mb' }));

// Use GOOGLE_APPLICATION_CREDENTIALS from .env (local) or environment (prod).
// Scope for Play Integrity decode: https://www.googleapis.com/auth/playintegrity
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/playintegrity']
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

// POST /decode  { packageName, encodedIntegrityToken }
app.post('/decode', async (req, res) => {
  try {
    const { packageName, encodedIntegrityToken } = req.body;
    if (!packageName || !encodedIntegrityToken) {
      return res.status(400).json({ error: "packageName and encodedIntegrityToken required" });
    }

    const client = await auth.getClient();
    const url = `https://playintegrity.googleapis.com/v1/${encodeURIComponent(packageName)}:decodeIntegrityToken`;

    const r = await client.request({
      url,
      method: 'POST',
      data: { integrity_token: encodedIntegrityToken }
    });

    res.json(r.data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

const port = process.env.PORT || 8080;
// Bind to 0.0.0.0 so emulator/physical devices can reach it
app.listen(port, '0.0.0.0', () => console.log(`Verifier listening on 0.0.0.0:${port}`));
