import { createTrigger, Property, TriggerStrategy } from '@activepieces/pieces-framework';
import { joaAuth } from '../common/auth';
import { closureSample } from '../common/samples';
import { readFeed, sampleFeed, startFeed, stopFeed } from './feed';

const PATH = '/v1/jobs/expired';

export const jobClosed = createTrigger({
  auth: joaAuth,
  name: 'job_closed',
  displayName: 'Job Closed',
  description: 'Triggers when a job closes or expires at its source (id, closed_at, closed_reason). Requires the Growth plan or above.',
  type: TriggerStrategy.POLLING,
  props: {
    maxClosures: Property.Number({
      displayName: 'Closures per Check',
      description: 'Upper bound on closures read per check (1-10000). Any remainder is read on the next check.',
      required: false,
      defaultValue: 1000,
    }),
  },
  sampleData: closureSample,
  async onEnable(context) {
    await startFeed(context.auth, context.store, PATH);
  },
  async onDisable(context) {
    await stopFeed(context.store);
  },
  async run(context) {
    const max = Math.min(Math.max(Number(context.propsValue.maxClosures ?? 1000), 1), 10000);
    return readFeed(context.auth, context.store, PATH, 1000, max);
  },
  async test(context) {
    return sampleFeed(context.auth, PATH, 5);
  },
});
