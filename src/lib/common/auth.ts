import { PieceAuth } from '@activepieces/pieces-framework';
import { joaGet, JoaError, JOA_REGISTER_URL } from './client';

export const joaAuth = PieceAuth.SecretText({
  displayName: 'API Key',
  description: `Your Job Opportunities API (JOA) key. Get a free key (no card required) at [jobopportunitiesapi.org/register](${JOA_REGISTER_URL}).`,
  required: true,
  validate: async ({ auth }) => {
    try {
      await joaGet(auth, '/v1/me');
      return { valid: true };
    } catch (e) {
      return {
        valid: false,
        error: e instanceof JoaError ? e.message : 'Could not reach the Job Opportunities API (JOA) to check the key.',
      };
    }
  },
});
