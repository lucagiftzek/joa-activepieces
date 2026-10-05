import { createAction, Property } from '@activepieces/pieces-framework';
import { joaAuth } from '../common/auth';
import { joaPaginate } from '../common/client';
import { jobFilterProps, jobFilterQuery, JobFilterValues } from '../common/props';

export const searchJobs = createAction({
  auth: joaAuth,
  name: 'search_jobs',
  displayName: 'Search Jobs',
  description: 'Search employer-direct job postings, newest first, with filters.',
  props: {
    ...jobFilterProps(),
    postedAfter: Property.DateTime({
      displayName: 'Posted After',
      description: 'Only jobs posted after this date/time.',
      required: false,
    }),
    includeDescription: Property.Checkbox({
      displayName: 'Include Description',
      description: 'Return the job advert text (plain text) in the description field.',
      required: false,
      defaultValue: false,
    }),
    maxResults: Property.Number({
      displayName: 'Max Results',
      description: 'How many jobs to return (1-1000). Every returned row counts against your plan\'s record allowance.',
      required: false,
      defaultValue: 25,
    }),
  },
  async run(context) {
    const p = context.propsValue;
    const max = Math.min(Math.max(Number(p.maxResults ?? 25), 1), 1000);
    return joaPaginate(
      context.auth,
      '/v1/jobs',
      {
        ...jobFilterQuery(p as JobFilterValues),
        posted_after: p.postedAfter,
        include_description: p.includeDescription ? 'true' : undefined,
      },
      max
    );
  },
});
