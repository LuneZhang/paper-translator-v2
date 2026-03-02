/**
 * In-memory quota manager for Gemini API usage.
 * Tracks daily usage counts for each model tier and resets at midnight.
 */

interface EngineQuota {
  used: number;
  limit: number;
  resetAt: string; // ISO timestamp of next midnight reset
}

interface QuotaStatus {
  flash: EngineQuota;
  flashLite: EngineQuota;
}

interface UsageRecord {
  date: string; // YYYY-MM-DD
  flash: number;
  flashLite: number;
}

const LIMITS = {
  flash: 100,
  flashLite: 1000,
} as const;

let usage: UsageRecord = {
  date: getTodayDate(),
  flash: 0,
  flashLite: 0,
};

/**
 * Returns today's date string in YYYY-MM-DD format (local time).
 */
function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns an ISO timestamp for the next midnight (local time).
 */
function getNextMidnight(): string {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return tomorrow.toISOString();
}

/**
 * Reset usage counts if the date has rolled over.
 */
function ensureDateCurrent(): void {
  const today = getTodayDate();
  if (usage.date !== today) {
    usage = {
      date: today,
      flash: 0,
      flashLite: 0,
    };
  }
}

/**
 * Map the public engine name to the internal usage key.
 */
function engineKey(model: string): 'flash' | 'flashLite' {
  if (model === 'gemini-flash-lite') {
    return 'flashLite';
  }
  return 'flash';
}

/**
 * Record one usage against the given model's daily quota.
 */
export function recordUsage(model: string): void {
  ensureDateCurrent();
  const key = engineKey(model);
  usage[key]++;
}

/**
 * Return the current quota status for both engine tiers.
 */
export function getQuota(): QuotaStatus {
  ensureDateCurrent();
  const resetAt = getNextMidnight();

  return {
    flash: {
      used: usage.flash,
      limit: LIMITS.flash,
      resetAt,
    },
    flashLite: {
      used: usage.flashLite,
      limit: LIMITS.flashLite,
      resetAt,
    },
  };
}

/**
 * Check whether the given engine still has remaining daily quota.
 */
export function hasQuota(engine: string): boolean {
  ensureDateCurrent();
  const key = engineKey(engine);
  return usage[key] < LIMITS[key];
}

/**
 * Determine the best available engine based on quota.
 *
 * Logic:
 *  1. If the preferred engine has quota, use it.
 *  2. If preferred is flash and it's exhausted, fall back to flash-lite.
 *  3. If both are exhausted, return null (caller should fall back to Google Translate).
 */
export function getAvailableEngine(
  preferred: string,
): 'gemini-flash' | 'gemini-flash-lite' | null {
  ensureDateCurrent();

  // Normalise: anything that isn't flash-lite is treated as flash
  const isPreferredFlash = preferred !== 'gemini-flash-lite';

  if (isPreferredFlash) {
    if (hasQuota('gemini-flash')) {
      return 'gemini-flash';
    }
    // Flash exhausted — try flash-lite
    if (hasQuota('gemini-flash-lite')) {
      return 'gemini-flash-lite';
    }
    return null;
  }

  // Preferred is flash-lite
  if (hasQuota('gemini-flash-lite')) {
    return 'gemini-flash-lite';
  }
  // Flash-lite exhausted — try flash
  if (hasQuota('gemini-flash')) {
    return 'gemini-flash';
  }
  return null;
}
