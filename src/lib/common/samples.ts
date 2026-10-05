export const jobSample = {
  id: 'defb93bc-0de5-432d-8323-185757ba256f',
  slug: 'warehouse-associate-defb93bc',
  title: 'Warehouse Associate',
  company: 'Example Logistics',
  company_slug: 'example-logistics',
  location: 'Hamburg, Germany',
  city: 'Hamburg',
  country: 'DE',
  remote: 'on_site',
  remote_inferred: true,
  employment_type: 'Full-time',
  seniority: 'Entry',
  category: 'Logistics & Transport',
  posted_at: '2026-10-05T17:16:38Z',
  first_seen_at: '2026-10-05T15:29:41Z',
  last_verified_at: '2026-10-05T18:18:53Z',
  status: 'live',
  apply_url: 'https://example-logistics.jobs.example/job/2828434',
  source: 'personio',
  source_type: 'ats',
  has_description: true,
  field_sources: { remote: 'inferred', location: 'published', posted_at: 'published', salary: 'absent' },
};

export const closureSample = {
  id: 'be3c3b3d-5a4e-4157-ba7d-62f20f1b1b01',
  closed_at: '2026-10-01T00:08:17.191881Z',
  closed_reason: 'expired_upstream',
};

export const changeSample = {
  change: 'updated',
  job: { ...jobSample, last_verified_at: '2026-10-06T08:00:00Z' },
};

export const companySample = {
  slug: 'example-logistics',
  name: 'Example Logistics',
  website: 'example-logistics.example',
  country: 'DE',
  industry: 'Logistics',
  org_type: 'Enterprise',
  open_roles: 12,
  source_types: ['ats'],
  first_seen: '2026-07-14',
};
