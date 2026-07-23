// Shared across every page/component in the app. Module scope survives client-side route
// changes (Next.js only unmounts/remounts the page component, not this module), so a GET
// already made from one page is reused by every other page that asks for the same URL —
// instead of every remount re-fetching catalog data (pools, skills, talents, etc.) from
// scratch. This matters a lot on hosts with a daily GET-request cap.

const cache = new Map<string, Promise<unknown>>();

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 1000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJSON<T>(url: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url} responded ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) await delay(RETRY_DELAY_MS);
    }
  }
  throw lastError;
}

/**
 * Cached, deduplicated GET — concurrent or later callers for the same `url` get the same
 * promise instead of triggering another request. A request that fails after retrying is
 * evicted from the cache so a later caller can try again rather than being stuck rejected.
 */
export function getJSON<T>(url: string): Promise<T> {
  let entry = cache.get(url) as Promise<T> | undefined;
  if (!entry) {
    entry = fetchJSON<T>(url);
    entry.catch(() => cache.delete(url));
    cache.set(url, entry);
  }
  return entry;
}
