import { createAction, Property } from '@activepieces/pieces-framework';
import { joaAuth } from '../common/auth';
import { joaGet } from '../common/client';

export const getJob = createAction({
  auth: joaAuth,
  name: 'get_job',
  displayName: 'Get Job',
  description: 'Get one job posting, with its description, by id or slug.',
  props: {
    job: Property.ShortText({
      displayName: 'Job ID or Slug',
      description: 'The job id (uuid) or its public slug.',
      required: true,
    }),
    includeClosed: Property.Checkbox({
      displayName: 'Include Closed',
      description: 'Return the job even if it has closed (status "closed") instead of a not-found error.',
      required: false,
      defaultValue: false,
    }),
  },
  async run(context) {
    const ref = encodeURIComponent(context.propsValue.job.trim());
    return joaGet(context.auth, `/v1/jobs/${ref}`, {
      include_closed: context.propsValue.includeClosed ? 'true' : undefined,
    });
  },
});
