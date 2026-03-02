/**
 * Proxy setup — makes Node.js global fetch respect HTTP_PROXY / HTTPS_PROXY
 * environment variables. Must be imported before any fetch calls.
 *
 * Node.js v18+ has a built-in fetch that does NOT respect undici's
 * setGlobalDispatcher. We must override globalThis.fetch with undici's
 * own fetch bound to a ProxyAgent.
 */

import { ProxyAgent, fetch as undiciFetch } from 'undici';

const proxyUrl =
  process.env.HTTPS_PROXY ||
  process.env.https_proxy ||
  process.env.HTTP_PROXY ||
  process.env.http_proxy ||
  process.env.ALL_PROXY;

if (proxyUrl) {
  const agent = new ProxyAgent(proxyUrl);

  // Override the global fetch so all libraries (including @google/generative-ai)
  // go through the proxy automatically.
  const proxiedFetch = (input: any, init?: any) => {
    return undiciFetch(input, { ...init, dispatcher: agent });
  };

  (globalThis as any).fetch = proxiedFetch;

  console.log(`Proxy configured: ${proxyUrl}`);
}
