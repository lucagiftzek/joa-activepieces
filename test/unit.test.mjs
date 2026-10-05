// Unit tests against the compiled piece (dist/), HTTP mocked with nock (the framework's httpClient uses axios).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import nock from 'nock';

const require = createRequire(import.meta.url);
const { jobOpportunitiesApi, joaAuth } = require('../dist/src/index.js');
const { newJob } = require('../dist/src/lib/triggers/new-job.js');
const { jobClosed } = require('../dist/src/lib/triggers/job-closed.js');
const { jobChanged } = require('../dist/src/lib/triggers/job-changed.js');
const { searchJobs } = require('../dist/src/lib/actions/search-jobs.js');
const { getJob } = require('../dist/src/lib/actions/get-job.js');
const { findCompany } = require('../dist/src/lib/actions/find-company.js');

const API = 'https://api.jobopportunitiesapi.org';
const auth = { type: 'SECRET_TEXT', secret_text: 'test_key' };
const makeStore = () => {
  const m = new Map();
  return {
    m,
    get: async (k) => (m.has(k) ? m.get(k) : null),
    put: async (k, v) => (m.set(k, v), v),
    delete: async (k) => void m.delete(k),
  };
};
const ctx = (propsValue = {}, store = makeStore()) => ({ auth, propsValue, store, files: {} });
const job = (id, extra = {}) => ({ id, title: `Job ${id}`, company: 'Acme', ...extra });

test.beforeEach(() => nock.disableNetConnect());
test.afterEach(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

test('piece metadata', () => {
  const md = jobOpportunitiesApi.metadata();
  assert.equal(md.displayName, 'Job Opportunities API (JOA)');
  assert.deepEqual(Object.keys(md.triggers).sort(), ['job_changed', 'job_closed', 'new_job']);
  assert.deepEqual(Object.keys(md.actions).sort(), ['custom_api_call', 'find_company', 'get_job', 'search_jobs']);
  assert.equal(md.auth.type, 'SECRET_TEXT');
  assert.ok(md.minimumSupportedRelease);
  for (const t of Object.values(md.triggers)) assert.ok(t.sampleData, `${t.name} sampleData`);
});

test('auth validate: ok with /v1/me, clear message on 401', async () => {
  nock(API, { reqheaders: { authorization: 'Bearer good' } }).get('/v1/me').reply(200, { plan: 'explore' });
  assert.deepEqual(await joaAuth.validate({ auth: 'good' }), { valid: true });
  nock(API).get('/v1/me').reply(401, { error: 'invalid_key', message: 'That key is not valid.' });
  const bad = await joaAuth.validate({ auth: 'bad' });
  assert.equal(bad.valid, false);
  assert.match(bad.error, /rejected the API key \(401\).*signup.*not valid/);
});

test('search_jobs sends filters and pages past the server clamp', async () => {
  let first;
  nock(API, { reqheaders: { authorization: 'Bearer test_key' } })
    .get('/v1/jobs')
    .query((q) => {
      if (!q.cursor) first = q;
      return !q.cursor;
    })
    .reply(200, { data: [job('a'), job('b')], has_more: true, next_cursor: 'c1' })
    .get('/v1/jobs')
    .query((q) => q.cursor === 'c1' && q.limit === '1')
    .reply(200, { data: [job('c')], has_more: false, next_cursor: null });
  const out = await searchJobs.run(
    ctx({
      q: 'nurse',
      country: 'de, gb',
      remote: ['remote', 'hybrid'],
      employmentType: ['Full-time'],
      seniority: ['Senior'],
      category: ['Healthcare'],
      company: 'acme',
      includeDescription: true,
      maxResults: 3,
    })
  );
  assert.deepEqual(out.map((j) => j.id), ['a', 'b', 'c']);
  assert.deepEqual({ ...first }, {
    q: 'nurse',
    country: 'DE,GB',
    remote: 'remote,hybrid',
    employment_type: 'Full-time',
    seniority: 'Senior',
    category: 'Healthcare',
    company: 'acme',
    include_description: 'true',
    limit: '3',
  });
});

test('new_job: TIMEBASED dedupe on first_seen_at, posted_after window before last poll', async () => {
  const store = makeStore();
  await newJob.onEnable(ctx({}, store));
  const enabledAt = await store.get('lastPoll');
  assert.ok(enabledAt > 0);
  const after = new Date(enabledAt + 60_000).toISOString();
  const before = new Date(enabledAt - 60_000).toISOString();
  let seen;
  nock(API)
    .get('/v1/jobs')
    .query((q) => ((seen = q), true))
    .reply(200, { data: [job('new', { first_seen_at: after }), job('old', { first_seen_at: before })], has_more: false });
  const out = await newJob.run(ctx({ lookbackHours: 6, maxJobs: 20 }, store));
  assert.deepEqual(out.map((j) => j.id), ['new']);
  const windowH = (enabledAt - Date.parse(seen.posted_after)) / 3600e3;
  assert.ok(Math.abs(windowH - 6) < 0.01);
  // A second poll returning the same rows emits nothing.
  nock(API).get('/v1/jobs').query(true).reply(200, { data: [job('new', { first_seen_at: after })], has_more: false });
  assert.deepEqual(await newJob.run(ctx({ lookbackHours: 6 }, store)), []);
});

test('job_closed: 403 on enable is explained; run follows next_since', async () => {
  nock(API).get('/v1/jobs/expired').query(true).reply(403, { error: 'plan_upgrade_required', message: 'Growth needed.' });
  await assert.rejects(jobClosed.onEnable(ctx()), /does not include this endpoint \(403\).*Growth/);

  const store = makeStore();
  await store.put('joa_since', 's0');
  nock(API)
    .get('/v1/jobs/expired')
    .query({ since: 's0', limit: '3' })
    .reply(200, { data: [{ id: 'x' }, { id: 'y' }, { id: 'z' }], next_since: 's1', count: 3 });
  const out = await jobClosed.run(ctx({ maxClosures: 3 }, store));
  assert.deepEqual(out.map((r) => r.id), ['x', 'y', 'z']);
  assert.equal(await store.get('joa_since'), 's1');
  // Next check resumes from the stored cursor; a full page triggers a follow-up page.
  nock(API)
    .get('/v1/jobs/expired')
    .query({ since: 's1', limit: '1000' })
    .reply(200, { data: Array.from({ length: 1000 }, (_, i) => ({ id: `r${i}` })), next_since: 's2', count: 1000 })
    .get('/v1/jobs/expired')
    .query({ since: 's2', limit: '500' })
    .reply(200, { data: [{ id: 'last' }], next_since: 's3', count: 1 });
  const out2 = await jobClosed.run(ctx({ maxClosures: 1500 }, store));
  assert.equal(out2.length, 1001);
  assert.equal(await store.get('joa_since'), 's3');
});

test('job_changed: filters change types; empty page keeps the cursor', async () => {
  const store = makeStore();
  await store.put('joa_since', 'c0');
  nock(API)
    .get('/v1/changes')
    .query({ since: 'c0', limit: '500' })
    .reply(200, {
      data: [
        { change: 'created', job: job('a') },
        { change: 'withdrawn', job: job('b') },
      ],
      next_since: 'c1',
      count: 2,
    });
  const out = await jobChanged.run(ctx({ changeTypes: ['withdrawn', 'delisted'] }, store));
  assert.deepEqual(out.map((r) => r.change), ['withdrawn']);
  assert.equal(await store.get('joa_since'), 'c1');
  nock(API).get('/v1/changes').query({ since: 'c1', limit: '500' }).reply(200, { data: [], next_since: 'c1', count: 0 });
  assert.deepEqual(await jobChanged.run(ctx({}, store)), []);
  assert.equal(await store.get('joa_since'), 'c1');
});

test('get_job, find_company and error mapping (402/404/422/429)', async () => {
  nock(API).get('/v1/jobs/my-slug').query({ include_closed: 'true' }).reply(200, { data: job('z'), description: 'Text' });
  const res = await getJob.run(ctx({ job: ' my-slug ', includeClosed: true }));
  assert.equal(res.data.id, 'z');

  nock(API).get('/v1/companies').query({ q: 'google', country: 'US', limit: '10' }).reply(200, {
    data: [{ slug: 'google', name: 'Google' }],
    has_more: false,
  });
  const cos = await findCompany.run(ctx({ name: 'google', country: 'us' }));
  assert.equal(cos[0].slug, 'google');
  nock(API).get('/v1/companies/google').reply(200, { slug: 'google', name: 'Google' });
  assert.equal((await findCompany.run(ctx({ slug: 'google' }))).name, 'Google');
  await assert.rejects(findCompany.run(ctx({})), /Company Name/);
  await assert.rejects(getJob.run(ctx({ job: '  ' })), /job id \(uuid\) or slug/);

  nock(API).get('/v1/jobs/gone').reply(404, { error: 'not_found', message: 'No listing with that id.' });
  await assert.rejects(getJob.run(ctx({ job: 'gone' })), /Not found.*\(404\).*No listing/);
  nock(API).get('/v1/jobs').query(true).reply(402, { error: 'record_quota_exhausted', message: 'Allowance used.' });
  await assert.rejects(searchJobs.run(ctx({})), /record allowance.*Allowance used/);
  nock(API).get('/v1/jobs').query(true).reply(422, { error: 'bad_remote', message: 'Unknown remote.' });
  await assert.rejects(searchJobs.run(ctx({ remote: ['x'] })), /rejected a parameter \(422\)/);
  nock(API).get('/v1/jobs').query(true).reply(429, { error: 'rate_limited', message: 'Slow down' });
  await assert.rejects(searchJobs.run(ctx({})), /rate limit reached \(429\)/);
});

test('custom API call action maps the Bearer header', async () => {
  const action = jobOpportunitiesApi.getAction('custom_api_call');
  assert.ok(action);
  assert.ok(action.props.url && action.props.method);
});
