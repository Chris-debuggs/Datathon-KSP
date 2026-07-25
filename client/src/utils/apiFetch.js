// ─── Ticket 4.2: Rate Limit Fallbacks ──────────────────────────────────────
// Fetch wrapper that catches HTTP 429 and 504
// Keeps app stable after failure
// Used across ALL API calls in the frontend
// Replaces raw fetch() calls everywhere

// ─── Custom error class for rate limit ─────────────────────────────────────
export class RateLimitError extends Error {
  constructor(status) {
    super('System Busy');
    this.status = status;
    this.name = 'RateLimitError';
  }
}

// ─── Main fetch wrapper ─────────────────────────────────────────────────────
// Drop-in replacement for fetch()
// Usage: import { apiFetch } from '../utils/apiFetch';
//        const data = await apiFetch('/api/chat', { method: 'POST', body: ... });
export const apiFetch = async (url, options = {}) => {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Ticket 4.2: catch HTTP 429 (rate limit) and 504 (timeout)
    if (res.status === 429 || res.status === 504) {
      throw new RateLimitError(res.status);
    }

    // Handle other non-ok responses
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    return await res.json();

  } catch (err) {
    // Re-throw RateLimitError so UI can handle it
    if (err instanceof RateLimitError) throw err;

    // Handle network errors (no connection etc)
    if (err.name === 'TypeError') {
      throw new RateLimitError(504);
    }

    throw err;
  }
};

// ─── System Busy Message ────────────────────────────────────────────────────
// Exact text per ticket 4.2 spec
export const SYSTEM_BUSY_MESSAGE =
  'System Busy - Re-routing Intel. Please try again in 30 seconds.';

// ─── Check if error is rate limit ──────────────────────────────────────────
export const isRateLimitError = (err) =>
  err instanceof RateLimitError ||
  err?.status === 429 ||
  err?.status === 504;