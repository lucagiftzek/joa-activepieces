// A few real calls (skipped without JOA_API_KEY). Every returned row is metered: keep this small.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { joaAuth } = require('../dist/src/index.js');
const { newJob } = require('../dist/src/lib/triggers/new-job.js');
const { jobClosed } = require('../dist/src/lib/triggers/job-closed.js');
const { jobChanged } = require('../dist/src/lib/triggers/job-changed.js');
const { searchJobs } = require('../dist/src/lib/actions/search-jobs.js');
const { getJob } = require('../dist/src/lib/actions/get-job.js');
const { findCompany } = require('../dist/src/lib/actions/find-company.js');

const KEY = process.env.JOA_API_KEY;
const opts = { skip: !KEY && 'JOA_API_KEY not set' };
const auth = { type: 'SECRET_TEXT', secret_text: KEY };
const makeStore = () => {
  const m = new Map();
  return { get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => (m.set(k, v), v), delete: async (k) => void m.delete(k) };
};
const ctx = (propsValue = {}, store = makeStore()) => ({ auth, propsValue, store, files: {} });

test('live: auth validate accepts the key and rejects a bad one', opts, async () => {
  assert.deepEqual(await joaAuth.validate({ auth: KEY }), { valid: true });
  assert.equal((await joaAuth.validate({ auth: 'joa_invalid_key_for_test' })).valid, false);
});

test('live: search_jobs + get_job', opts, async () => {
  const jobs = await searchJobs.run(ctx({ country: 'DE', remote: ['on_site'], maxResults: 3 }));
  assert.ok(jobs.length >= 1 && jobs.length <= 3);
  const one = await getJob.run(ctx({ job: jobs[0].slug }));
  assert.equal(one.data.id, jobs[0].id);
});

test('live: new_job test() returns at most 5 samples', opts, async () => {
  const out = await newJob.test(ctx({ country: 'GB' }));
  assert.ok(out.length >= 1 && out.length <= 5);
});

test('live: job_closed and job_changed enable + test', opts, async () => {
  const s1 = makeStore();
  await jobClosed.onEnable(ctx({}, s1));
  assert.ok(await s1.get('joa_since'));
  const closed = await jobClosed.test(ctx({}));
  assert.ok(closed.length <= 5);
  const changes = await jobChanged.test(ctx({}));
  assert.ok(changes.length <= 5);
});

test('live: find_company', opts, async () => {
  const out = await findCompany.run(ctx({ name: 'google', maxResults: 1 }));
  assert.equal(out.length, 1);
});
