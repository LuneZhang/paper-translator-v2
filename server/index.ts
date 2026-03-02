// Proxy setup — must be first import so fetch respects HTTP_PROXY
import './proxy-setup.js';

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import translateRoutes from './routes/translate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// API Routes (must be before static files so /api/* is handled first)
app.use(translateRoutes);

// Production: serve built frontend from dist/
if (isProd) {
  const distPath = resolve(__dirname, '..', 'dist');
  app.use(express.static(distPath));

  // SPA fallback: any non-API route serves index.html
  app.get('*', (_req, res) => {
    res.sendFile(resolve(distPath, 'index.html'));
  });
} else {
  // Dev: just a health check on the API server root
  app.get('/', (_req, res) => {
    res.json({ status: 'ok', service: 'paper-translator-api', mode: 'development' });
  });
}

app.listen(PORT, () => {
  const mode = isProd ? 'production' : 'development';
  const url = `http://localhost:${PORT}`;
  console.log(`Paper Translator server running in ${mode} mode`);
  if (isProd) {
    console.log(`Open in browser: ${url}`);
  } else {
    console.log(`API server: ${url}`);
    console.log(`Frontend: http://localhost:5173`);
  }
});

export default app;
