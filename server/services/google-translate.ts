import translate from 'google-translate-api-x';

/**
 * Translate text from English to Chinese (zh-CN) using Google Translate.
 * This serves as a free fallback when Gemini quotas are exhausted.
 */
export async function translateWithGoogle(text: string): Promise<string> {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text provided for translation');
  }

  try {
    const result = await translate(text, { from: 'en', to: 'zh-CN' });
    const translated = result.text;

    if (!translated) {
      throw new Error('Google Translate returned an empty response');
    }

    return translated;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Google Translate failed: ${message}`);
  }
}

/**
 * Test connectivity to Google Translate with a simple phrase.
 */
export async function testGoogleConnection(): Promise<boolean> {
  try {
    const result = await translate('hello', { from: 'en', to: 'zh-CN' });
    return typeof result.text === 'string' && result.text.length > 0;
  } catch (err) {
    console.error('Google Translate connection test failed:', err instanceof Error ? err.message : err);
    return false;
  }
}
