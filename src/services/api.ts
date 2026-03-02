import type { TranslationRequest, TranslationResponse, QuotaInfo } from '@/types/translation'

const API_BASE = '/api'

export async function translateText(request: TranslationRequest): Promise<TranslationResponse> {
  const res = await fetch(`${API_BASE}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Translation request failed' }))
    throw new Error(err.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function getQuota(): Promise<QuotaInfo> {
  const res = await fetch(`${API_BASE}/quota`)
  if (!res.ok) throw new Error('Failed to fetch quota')
  return res.json()
}

export async function testConnection(apiKey: string, engine: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/test-connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, engine }),
  })
  return res.json()
}
