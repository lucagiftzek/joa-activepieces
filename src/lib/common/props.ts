import { Property } from '@activepieces/pieces-framework';
import { Query } from './client';

const opts = (values: string[]) => values.map((v) => ({ label: v, value: v }));

export const REMOTE_OPTIONS = [
  { label: 'Remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'On site', value: 'on_site' },
  { label: 'Not stated', value: 'not_stated' },
];
export const EMPLOYMENT_TYPE_OPTIONS = [
  ...opts(['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship']),
  { label: 'Not stated', value: 'not_stated' },
];
export const SENIORITY_OPTIONS = [
  ...opts(['Intern', 'Entry', 'Mid', 'Senior', 'Lead', 'Manager', 'Director', 'Executive']),
  { label: 'Not stated', value: 'not_stated' },
];
export const CATEGORY_OPTIONS = [
  ...opts([
    'Consulting & Strategy', 'Construction & Trades', 'Customer Support', 'Data & Analytics', 'Design',
    'Education', 'Engineering', 'Finance', 'Healthcare', 'Hospitality', 'HR & Recruiting', 'Legal & Compliance',
    'Logistics & Transport', 'Manufacturing', 'Marketing', 'Operations & Admin', 'Procurement', 'Product',
    'Retail', 'Safety & Environment', 'Sales', 'Science & Research', 'Security', 'Skilled Technician',
  ]),
  { label: 'Uncategorised', value: 'uncategorised' },
];

export const jobFilterProps = () => ({
  q: Property.ShortText({
    displayName: 'Keywords',
    description: 'Full-text search over job title, company name and location (not the description), e.g. "data engineer".',
    required: false,
  }),
  country: Property.ShortText({
    displayName: 'Countries',
    description: 'Comma-separated ISO-3166 alpha-2 codes, e.g. "DE,GB,US".',
    required: false,
  }),
  remote: Property.StaticMultiSelectDropdown({
    displayName: 'Work Arrangement',
    description: 'Only jobs with this remote status.',
    required: false,
    options: { options: REMOTE_OPTIONS },
  }),
  employmentType: Property.StaticMultiSelectDropdown({
    displayName: 'Employment Type',
    required: false,
    options: { options: EMPLOYMENT_TYPE_OPTIONS },
  }),
  seniority: Property.StaticMultiSelectDropdown({
    displayName: 'Seniority',
    required: false,
    options: { options: SENIORITY_OPTIONS },
  }),
  category: Property.StaticMultiSelectDropdown({
    displayName: 'Category',
    description: 'Job family.',
    required: false,
    options: { options: CATEGORY_OPTIONS },
  }),
  company: Property.ShortText({
    displayName: 'Companies',
    description: 'Comma-separated company slugs, e.g. "google". Use the Find Company action to look slugs up.',
    required: false,
  }),
});

export type JobFilterValues = {
  q?: string;
  country?: string;
  remote?: unknown[];
  employmentType?: unknown[];
  seniority?: unknown[];
  category?: unknown[];
  company?: string;
};

export function commaList(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parts = (Array.isArray(value) ? value : String(value).split(','))
    .map((v) => String(v).trim())
    .filter(Boolean);
  return parts.length ? parts.join(',') : undefined;
}

export function jobFilterQuery(v: JobFilterValues): Query {
  return {
    q: v.q,
    country: commaList(v.country)?.toUpperCase(),
    remote: commaList(v.remote),
    employment_type: commaList(v.employmentType),
    seniority: commaList(v.seniority),
    category: commaList(v.category),
    company: commaList(v.company),
  };
}
