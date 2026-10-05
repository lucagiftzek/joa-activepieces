import { createTrigger, Property, TriggerStrategy } from '@activepieces/pieces-framework';
import { joaAuth } from '../common/auth';
import { changeSample } from '../common/samples';
import { readFeed, sampleFeed, startFeed, stopFeed } from './feed';

const PATH = '/v1/changes';

type Change = { change: string; job: Record<string, unknown> };

export const jobChanged = createTrigger({
  auth: joaAuth,
  name: 'job_changed',
  displayName: 'Job Changed',
  description: 'Triggers for each change in the feed: created, updated, withdrawn or delisted. Treat withdrawn like delisted. Requires the Growth plan or above.',
  type: TriggerStrategy.POLLING,
  props: {
    changeTypes: Property.StaticMultiSelectDropdown({
      displayName: 'Change Types',
      description: 'Only these change types. Leave empty for all.',
      required: false,
      options: {
        options: ['created', 'updated', 'withdrawn', 'delisted'].map((v) => ({ label: v, value: v })),
      },
    }),
    maxChanges: Property.Number({
      displayName: 'Changes per Check',
      description: 'Upper bound on changes read per check (1-5000). Every returned row counts against your plan\'s record allowance.',
      required: false,
      defaultValue: 500,
    }),
  },
  sampleData: changeSample,
  async onEnable(context) {
    await startFeed(context.auth, context.store, PATH);
  },
  async onDisable(context) {
    await stopFeed(context.store);
  },
  async run(context) {
    const max = Math.min(Math.max(Number(context.propsValue.maxChanges ?? 500), 1), 5000);
    const rows = await readFeed<Change>(context.auth, context.store, PATH, 500, max);
    const wanted = (context.propsValue.changeTypes as string[] | undefined) ?? [];
    return wanted.length ? rows.filter((r) => wanted.includes(r.change)) : rows;
  },
  async test(context) {
    return sampleFeed(context.auth, PATH, 5);
  },
});
