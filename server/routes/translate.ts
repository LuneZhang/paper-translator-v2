import { Router, Request, Response } from 'express';
import { translateWithGemini, testGeminiConnection } from '../services/gemini.js';
import { translateWithGoogle, testGoogleConnection } from '../services/google-translate.js';
import { recordUsage, getQuota, getAvailableEngine } from '../services/quota-manager.js';

const router = Router();

interface TranslateRequestBody {
  text: string;
  context?: {
    title?: string;
    abstract?: string;
  };
  glossary?: Record<string, string>;
  engine?: 'gemini-flash' | 'gemini-flash-lite' | 'google-translate';
  apiKey?: string;
}

interface TestConnectionBody {
  apiKey?: string;
  engine: string;
}

/**
 * POST /api/translate
 * Translates text using the specified engine with formula protection.
 */
router.post('/api/translate', async (req: Request<{}, {}, TranslateRequestBody>, res: Response) => {
  try {
    const { text, context, glossary, engine = 'gemini-flash', apiKey } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Missing or invalid "text" field' });
      return;
    }

    // Formula protection is handled by the frontend before sending text.
    // The text received here already has <formula_N> placeholders.

    let translation: string;
    let usedEngine: string = engine;

    if (engine === 'google-translate') {
      // Google Translate fallback — no API key needed
      translation = await translateWithGoogle(text);
      usedEngine = 'google-translate';
    } else {
      // Gemini-based engines
      if (!apiKey) {
        res.status(400).json({ error: 'API key is required for Gemini engines' });
        return;
      }

      // Check quota and determine the best available engine
      const resolvedEngine = getAvailableEngine(engine);

      if (!resolvedEngine) {
        // All Gemini quotas exhausted — fall back to Google Translate
        try {
          translation = await translateWithGoogle(text);
          usedEngine = 'google-translate';
        } catch {
          res.status(429).json({
            error: 'All translation engine quotas exhausted and Google Translate fallback failed',
          });
          return;
        }
      } else {
        const model = resolvedEngine as 'gemini-flash' | 'gemini-flash-lite';
        translation = await translateWithGemini(text, context, glossary, apiKey, model);
        recordUsage(model);
        usedEngine = resolvedEngine;
      }
    }

    const quota = getQuota();

    res.json({ translation, engine: usedEngine, quota });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Translation failed';
    console.error('Translation error:', message);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/quota
 * Returns current quota usage for all engines.
 */
router.get('/api/quota', (_req: Request, res: Response) => {
  try {
    const quota = getQuota();
    res.json(quota);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get quota';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/test-connection
 * Tests connectivity to the specified translation engine.
 */
router.post('/api/test-connection', async (req: Request<{}, {}, TestConnectionBody>, res: Response) => {
  try {
    const { apiKey, engine } = req.body;

    if (!engine) {
      res.status(400).json({ success: false, message: 'Missing "engine" field' });
      return;
    }

    if (engine === 'google-translate') {
      const success = await testGoogleConnection();
      res.json({
        success,
        message: success ? 'Google Translate connection successful' : 'Google Translate connection failed',
      });
      return;
    }

    // Gemini engines
    if (!apiKey) {
      res.status(400).json({ success: false, message: 'API key is required for Gemini engines' });
      return;
    }

    const success = await testGeminiConnection(apiKey);
    res.json({
      success,
      message: success ? `${engine} connection successful` : `${engine} connection failed`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Connection test failed';
    res.status(500).json({ success: false, message });
  }
});

export default router;
