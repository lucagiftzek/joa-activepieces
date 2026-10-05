import { httpClient, HttpError, HttpMethod, QueryParams } from '@activepieces/pieces-common';

export const JOA_BASE_URL = 'https://api.jobopportunitiesapi.org';
export const JOA_SIGNUP_URL = 'https://jobopportunitiesapi.org/signup';
export const JOA_DOCS_URL = 'https://jobopportunitiesapi.org/docs';

/** The SecretText connection value is a string in validate() and { secret_text } in run contexts. */
export function apiKeyOf(auth: unknown): string {
  if (typeof auth === 'string') return auth.trim();
  if (auth && typeof auth === 'object' && 'secret_text' in auth) {
    return String((auth as { secret_text: string }).secret_text).trim();
  }
  throw new Error('No Job Opportunities API (JOA) API key on this connection.');
}

/** Clear message for an HTTP status from the Job Opportunities API (JOA). */
export function joaErrorMessage(status: number, body: unknown, retryAfter?: string): string {
  let apiMsg = '';
  if (body && typeof body === 'object') {
    const b = body as { message?: string; error?: string };
    apiMsg = b.message || b.error || '';
  } else if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      apiMsg = parsed.message || parsed.error || '';
    } catch {
      apiMsg = body.slice(0, 200);
    }
  }
  const said = apiMsg ? ` API said: ${apiMsg}` : '';
  switch (status) {
    case 401:
      return `Job Opportunities API (JOA) rejected the API key (401). Check the connection; a free key (no card required) is available at ${JOA_SIGNUP_URL}.${said}`;
    case 402:
      return `Your Job Opportunities API (JOA) plan has used up its record allowance for this period (402).${said}`;
    case 403:
      return `Your Job Opportunities API (JOA) plan does not include this endpoint (403). The closed-job and change feeds need the Growth plan or above.${said}`;
    case 404:
      return `Not found in Job Opportunities API (JOA) (404).${said}`;
    case 410:
      return `The employer withdrew this listing (410); stop showing it.${said}`;
    case 400:
    case 422:
      return `Job Opportunities API (JOA) rejected a parameter (${status}).${said}`;
    case 429:
      return `Job Opportunities API (JOA) rate limit reached (429).${retryAfter ? ` Retry after ${retryAfter} seconds.` : ''}${said}`;
    default:
      return `Job Opportunities API (JOA) returned HTTP ${status}.${said}`;
  }
}

export class JoaError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'JoaError';
  }
}

export type Query = Record<string, string | number | boolean | undefined | null>;

function toQueryParams(query: Query = {}): QueryParams {
  const out: QueryParams = {};
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    out[k] = String(v);
  }
  return out;
}

export async function joaGet<T>(auth: unknown, path: string, query?: Query): Promise<T> {
  try {
    const res = await httpClient.sendRequest<T>({
      method: HttpMethod.GET,
      url: `${JOA_BASE_URL}${path}`,
      headers: { Authorization: `Bearer ${apiKeyOf(auth)}`, Accept: 'application/json' },
      queryParams: toQueryParams(query),
    });
    return res.body;
  } catch (e) {
    if (e instanceof HttpError) {
      throw new JoaError(e.response.status, joaErrorMessage(e.response.status, e.response.body));
    }
    throw e;
  }
}

export type Page<T> = { data: T[]; next_cursor?: string | null; has_more?: boolean };

/**
 * Follow next_cursor until `max` rows are collected. The API silently clamps `limit` to
 * the key's max_page_size, so one page is not enough to trust.
 */
export async function joaPaginate<T>(auth: unknown, path: string, query: Query, max: number): Promise<T[]> {
  const rows: T[] = [];
  let cursor: string | null | undefined;
  let pages = 0;
  do {
    const page = await joaGet<Page<T>>(auth, path, {
      ...query,
      limit: Math.min(200, max - rows.length),
      cursor: cursor ?? undefined,
    });
    rows.push(...(page.data ?? []));
    cursor = page.has_more ? page.next_cursor : null;
    pages += 1;
  } while (cursor && rows.length < max && pages < 50);
  return rows.slice(0, max);
}
