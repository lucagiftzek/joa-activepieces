# Publishing the Activepieces piece (run only after Luca approves)

Nothing below has been run. Nothing was published to npm.

## Already verified locally
- `npm test` (8 unit), `npm run test:live` (5 live), `npm run pack` -> `lucagiftzek-piece-job-opportunities-api-0.1.0.tgz`.
- Installed from the tarball on a self-hosted Activepieces **0.82.0 CE** (Docker, 127.0.0.1 only, removed afterwards)
  via `POST /api/v1/pieces` (packageType ARCHIVE, scope PLATFORM): piece metadata listed 4 actions + 3 triggers;
  bad-key connection rejected with the mapped 401 message; good connection ACTIVE; trigger tests returned samples
  for New Job / Job Closed / Job Changed; Search Jobs, Get Job and Find Company steps SUCCEEDED in a test flow.

## Option A — npm (community piece, installable by name)
1. Decide the npm scope (the package is `@lucagiftzek/piece-job-opportunities-api`; change `name` in package.json
   if JOA has its own npm org, e.g. `@jobopportunitiesapi/piece-job-opportunities-api`).
2. `npm login` (needs the npm account), then:
   ```bash
   cd ~/joa-integrations/activepieces
   npm ci && npm test && npm run build
   npm publish ./dist --access public      # publish the dist/ folder, never the repo root
   ```
3. Users of self-hosted Activepieces: Settings (or Platform Admin) -> Pieces -> Install Piece -> npm name + version.

## Option B — private upload to one instance
Platform Admin -> Pieces -> Install Piece -> upload `lucagiftzek-piece-job-opportunities-api-0.1.0.tgz`
(or `POST https://<host>/api/v1/pieces` multipart: packageType=ARCHIVE, scope=PLATFORM, pieceName, pieceVersion,
pieceArchive). On Activepieces Cloud, private pieces are a platform/enterprise feature.

## Option C — official listing in the Activepieces catalogue
Requires a PR to github.com/activepieces/activepieces adding `packages/pieces/community/job-opportunities-api`
(monorepo layout, `@activepieces/piece-job-opportunities-api`, logo URL, i18n) — **we were told not to open PRs**;
the source here ports 1:1 (the `src/` tree is the piece).

Checklist before any release: bump `version` for every change (installed versions are cached by
`name@version`), logo URL resolves (`https://jobopportunitiesapi.org/icon.svg`), `minimumSupportedRelease` 0.82.0
matches the framework minimum for context v2.
