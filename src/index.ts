import { createPiece } from '@activepieces/pieces-framework';
import { PieceCategory } from '@activepieces/shared';
import { createCustomApiCallAction } from '@activepieces/pieces-common';
import { joaAuth } from './lib/common/auth';
import { apiKeyOf, JOA_BASE_URL } from './lib/common/client';
import { newJob } from './lib/triggers/new-job';
import { jobClosed } from './lib/triggers/job-closed';
import { jobChanged } from './lib/triggers/job-changed';
import { searchJobs } from './lib/actions/search-jobs';
import { getJob } from './lib/actions/get-job';
import { findCompany } from './lib/actions/find-company';

export { joaAuth } from './lib/common/auth';

export const jobOpportunitiesApi = createPiece({
  displayName: 'Job Opportunities API (JOA)',
  description:
    'Employer-direct job postings from company career sites and applicant tracking systems, with every field tagged published, inferred or absent, and closures tracked.',
  auth: joaAuth,
  minimumSupportedRelease: '0.82.0',
  logoUrl: 'https://jobopportunitiesapi.org/icon.svg',
  authors: ['lucagiftzek'],
  categories: [PieceCategory.HUMAN_RESOURCES, PieceCategory.PRODUCTIVITY],
  actions: [
    searchJobs,
    getJob,
    findCompany,
    createCustomApiCallAction({
      auth: joaAuth,
      baseUrl: () => JOA_BASE_URL,
      authMapping: async (auth) => ({ Authorization: `Bearer ${apiKeyOf(auth)}` }),
    }),
  ],
  triggers: [newJob, jobClosed, jobChanged],
});
