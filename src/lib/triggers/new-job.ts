import {
  AppConnectionValueForAuthProperty,
  createTrigger,
  Property,
  TriggerStrategy,
} from '@activepieces/pieces-framework';
import { DedupeStrategy, Polling, pollingHelper } from '@activepieces/pieces-common';
import { joaAuth } from '../common/auth';
import { joaPaginate } from '../common/client';
import { jobFilterProps, jobFilterQuery, JobFilterValues } from '../common/props';
import { jobSample } from '../common/samples';

type Job = { id: string; posted_at?: string; first_seen_at?: string };
type Props = JobFilterValues & { maxJobs?: number; lookbackHours?: number };

const HOUR = 3600 * 1000;

/**
 * TIMEBASED dedupe on first_seen_at (when JOA first saw the job), while the query window is on
 * posted_at (the API's sort key), opened a few hours before the last poll so late-indexed jobs
 * are still caught.
 */
export const newJobPolling: Polling<AppConnectionValueForAuthProperty<typeof joaAuth>, Props> = {
  strategy: DedupeStrategy.TIMEBASED,
  items: async ({ auth, propsValue, lastFetchEpochMS }) => {
    const lookback = Math.min(Math.max(Number(propsValue.lookbackHours ?? 24), 1), 168) * HOUR;
    const max = Math.min(Math.max(Number(propsValue.maxJobs ?? 20), 1), 200);
    const since = lastFetchEpochMS > 0 ? lastFetchEpochMS - lookback : Date.now() - lookback;
    const jobs = await joaPaginate<Job>(
      auth,
      '/v1/jobs',
      { ...jobFilterQuery(propsValue), posted_after: new Date(since).toISOString() },
      max
    );
    return jobs.map((job) => ({
      epochMilliSeconds: Date.parse(job.first_seen_at || job.posted_at || '') || Date.now(),
      data: job,
    }));
  },
};

export const newJob = createTrigger({
  auth: joaAuth,
  name: 'new_job',
  displayName: 'New Job',
  description: 'Triggers when a new employer-direct job matching your filters appears.',
  type: TriggerStrategy.POLLING,
  props: {
    ...jobFilterProps(),
    lookbackHours: Property.Number({
      displayName: 'Look-back Window (hours)',
      description: 'How far before the last check to look for jobs by posting date (1-168). Catches jobs that are indexed some time after they were posted.',
      required: false,
      defaultValue: 24,
    }),
    maxJobs: Property.Number({
      displayName: 'Jobs per Check',
      description: 'Newest matching jobs read per check (1-200). Every returned row counts against your plan\'s record allowance.',
      required: false,
      defaultValue: 20,
    }),
  },
  sampleData: jobSample,
  async onEnable(context) {
    await pollingHelper.onEnable(newJobPolling, {
      auth: context.auth,
      store: context.store,
      propsValue: context.propsValue as Props,
    });
  },
  async onDisable(context) {
    await pollingHelper.onDisable(newJobPolling, {
      auth: context.auth,
      store: context.store,
      propsValue: context.propsValue as Props,
    });
  },
  async run(context) {
    return pollingHelper.poll(newJobPolling, {
      auth: context.auth,
      store: context.store,
      propsValue: context.propsValue as Props,
      files: context.files,
    });
  },
  async test(context) {
    return pollingHelper.test(newJobPolling, {
      auth: context.auth,
      store: context.store,
      propsValue: { ...(context.propsValue as Props), maxJobs: 5 },
      files: context.files,
    });
  },
});
