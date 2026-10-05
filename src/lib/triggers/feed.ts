import { Store } from '@activepieces/pieces-framework';
import { joaGet } from '../common/client';

type FeedPage<T> = { data: T[]; next_since?: string; count?: number };

const STORE_KEY = 'joa_since';

/**
 * Cursor-following reader for the since/next_since feeds (/v1/jobs/expired, /v1/changes).
 * The cursor is kept in the flow's store, so nothing is read twice and nothing is skipped.
 */
export async function readFeed<T>(
  auth: unknown,
  store: Store,
  path: string,
  pageLimit: number,
  max: number
): Promise<T[]> {
  let since = (await store.get<string>(STORE_KEY)) ?? new Date().toISOString();
  const out: T[] = [];
  while (out.length < max) {
    const limit = Math.min(pageLimit, max - out.length);
    const page = await joaGet<FeedPage<T>>(auth, path, { since, limit });
    const rows = page.data ?? [];
    out.push(...rows);
    if (page.next_since) since = page.next_since;
    if (rows.length < limit) break;
  }
  await store.put(STORE_KEY, since);
  return out;
}

/** Start the cursor at "now" and fail early (403 on plans below Growth) when the flow is enabled. */
export async function startFeed(auth: unknown, store: Store, path: string): Promise<void> {
  const since = new Date().toISOString();
  await joaGet(auth, path, { since, limit: 1 });
  await store.put(STORE_KEY, since);
}

export async function stopFeed(store: Store): Promise<void> {
  await store.delete(STORE_KEY);
}

/** Sample for the builder's test button: the most recent rows of the last 24 hours, cursor untouched. */
export async function sampleFeed<T>(auth: unknown, path: string, limit: number): Promise<T[]> {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const page = await joaGet<FeedPage<T>>(auth, path, { since, limit });
  return page.data ?? [];
}
