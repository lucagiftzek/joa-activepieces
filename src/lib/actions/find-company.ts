import { createAction, Property } from '@activepieces/pieces-framework';
import { joaAuth } from '../common/auth';
import { joaGet, joaPaginate } from '../common/client';

export const findCompany = createAction({
  auth: joaAuth,
  name: 'find_company',
  displayName: 'Find Company',
  description: 'Find employers by name, or get one employer by slug.',
  props: {
    name: Property.ShortText({
      displayName: 'Company Name',
      description: 'Search employers by name, e.g. "google". Leave empty when you give a slug.',
      required: false,
    }),
    slug: Property.ShortText({
      displayName: 'Company Slug',
      description: 'Get exactly one employer by slug. Takes precedence over the name.',
      required: false,
    }),
    country: Property.ShortText({
      displayName: 'Country',
      description: 'ISO-3166 alpha-2 country code, e.g. "US".',
      required: false,
    }),
    maxResults: Property.Number({
      displayName: 'Max Results',
      description: 'How many companies to return when searching by name (1-200).',
      required: false,
      defaultValue: 10,
    }),
  },
  async run(context) {
    const p = context.propsValue;
    if (p.slug && p.slug.trim()) {
      return joaGet(context.auth, `/v1/companies/${encodeURIComponent(p.slug.trim())}`);
    }
    if (!p.name || !p.name.trim()) {
      throw new Error('Enter a Company Name to search for, or a Company Slug.');
    }
    const max = Math.min(Math.max(Number(p.maxResults ?? 10), 1), 200);
    return joaPaginate(context.auth, '/v1/companies', { q: p.name.trim(), country: p.country?.toUpperCase() }, max);
  },
});
