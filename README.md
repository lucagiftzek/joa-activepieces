# Job Opportunities API (JOA) — Activepieces piece

An Activepieces community piece (`@activepieces/pieces-framework` 0.32.0, `@activepieces/pieces-common` 0.12.5)
for the **Job Opportunities API (JOA)**: employer-direct job postings from employers' own applicant tracking
systems and career sites, every field tagged published / inferred / absent, closures tracked.

- Website: https://jobopportunitiesapi.org — coverage (live figures): https://jobopportunitiesapi.org/coverage
- API docs: https://jobopportunitiesapi.org/docs
- Free API key (no card required): https://jobopportunitiesapi.org/register

Package: `@jobopportunitiesapi/piece-job-opportunities-api` on npm.

## Contents

| Kind | Name | Notes |
|---|---|---|
| Auth | `PieceAuth.SecretText` "API Key" | `validate` calls `GET /v1/me`; a bad key shows the mapped 401 message |
| Trigger | **New Job** (`new_job`) | polling, `DedupeStrategy.TIMEBASED` on `first_seen_at`; filters keywords, countries, work arrangement, employment type, seniority, category, companies; look-back window on `posted_after`; jobs per check |
| Trigger | **Job Closed** (`job_closed`) | polling `/v1/jobs/expired`, `next_since` cursor kept in the flow store; 403 surfaces on enable (Growth+) |
| Trigger | **Job Changed** (`job_changed`) | polling `/v1/changes` with cursor; optional change-type filter; Growth+ |
| Action | **Search Jobs** | filters + posted after + include description + max results (cursor pagination) |
| Action | **Get Job** | by uuid or slug, optional include closed |
| Action | **Find Company** | by name (+ country) or by slug |
| Action | **Custom API Call** | `createCustomApiCallAction`, Bearer header mapped from the connection |

Errors 401/402/403/404/410/400/422/429 are translated into clear messages (`src/lib/common/client.ts`).
The API silently clamps `limit` to the key's `max_page_size`, so list code follows `next_cursor` until it has the
requested number of rows. `apply_url` is always the employer's own apply link; when `attribution` /
`canonical_url` are present, show the attribution with the listing and link to `canonical_url`.

## Build, test, package

```bash
npm install
npm test            # tsc build + 8 unit tests (nock)
set -a; . ~/.config/joa-integrations/test.env; set +a
npm run test:live   # 5 live tests
npm run pack        # -> jobopportunitiesapi-piece-job-opportunities-api-0.1.1.tgz (packed from dist/)
```

**Layout note (verified on a self-hosted Activepieces 0.82.0):** Activepieces imports
`<package root>/src/index.js`. The package is therefore packed from `dist/`, where
`scripts/prepare-dist.mjs` writes a `package.json` with `main: ./src/index.js` — the same shape as the official
pieces. Packing the repository root (`main: ./dist/src/index.js`) fails to install with `ERR_MODULE_NOT_FOUND`.

## Self-hosted test

`test/selfhosted/` holds the scripts used for the end-to-end check on a throwaway, localhost-only Activepieces
container (start, sign up a local admin, upload the tarball, create a connection, build a flow, test the trigger
and steps). See [PUBLISHING.md](PUBLISHING.md) and the leg report for the results.

## Showing listings publicly

If you display the listings publicly, the Job Opportunities API terms ask for a visible credit, "Data: Job Opportunities API", linking to https://jobopportunitiesapi.org.

## Licence

MIT — see [LICENSE](LICENSE). Maintainer: Loukas Tzekos <support@jobopportunitiesapi.org>.
