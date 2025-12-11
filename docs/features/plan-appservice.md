# Feature Design Document: Native App Service (Non-Container) Deployment Option

## Feature Overview
**What is this feature?**  
Introduce a parallel deployment path that runs the existing voice AI chat client (Vite/React) and server (Node/Express + SQLite) on native Azure Linux App Services without custom container images. This supplements (does NOT remove) the current container-based App Service deployment. It simplifies operational overhead (no Docker builds/ACR dependency), shortens deployment time, and enables incremental runtime configuration via App Settings.

**What problem does it solve / value?**  
Reduces build complexity, speeds hotfix deployment, decreases image storage costs, and lowers barrier for contributors who lack container tooling. Provides a resilience fallback if container build pipeline breaks.

**Who is it for?**  
Internal dev team (faster iteration), operations (simpler rollbacks), and stakeholders wanting lower friction environments (dev / staging / lightweight prod).

---

## Goals & Success Criteria

Goals:
1. Stand up native App Service deployments for both client and server alongside existing container-based apps.
2. Persist SQLite data reliably between restarts without introducing a managed DB yet.
3. Support single-instance operation (no scale-out) safely with SQLite.
4. Minimize delta from current code (no major refactors) other than path + env variable adjustments.
5. Provide a single deterministic Zip Deploy PowerShell script that can deploy server, client, or both in one invocation.

Success Criteria (Measurable):
- Deployment time reduced: native Zip Deploy < 3 minutes end-to-end (baseline container path > 5 min).
- Zero data loss across 5 consecutive redeployments (SQLite file unchanged hash except expected growth).
- Server responds healthy (`/healthz`) within 90s after deploy in 5/5 test runs.
- Client routes (SPA) load via direct deep link (e.g., /chat) without 404.
- Rollback (redeploy previous zip) proven manually in < 2 minutes.

Out of Scope (Explicitly Not Doing Now):
- Database migration off SQLite.
- GitHub Actions CI/CD.
- Key Vault integration (using App Settings only).

---

## Requirements

### Functional Requirements
- Provide a unified PowerShell script: `deploy-appservice.ps1` that:
   - Accepts subscription, resource group, server app name, client app name.
   - Supports flags: `-SkipServer`, `-SkipClient`, `-NoBuild`, optional `-WhatIf` (dry run output only).
   - Builds projects locally (npm ci + build) unless `-NoBuild` supplied.
   - Packages minimal artifacts (server: dist + production dependencies + package.json + lock file; client: dist/ only).
   - Performs Zip Deploy for each selected app.
   - Sets/updates required App Settings idempotently (add/update only; leaves unrelated settings).
   - Automatically creates EMPTY placeholder App Settings for any referenced environment variables that are not already defined (server & client) so operators can later populate secrets without code changes.
   - Exits non-zero on any failed sub-step (build, package, deploy, config) and reports a concise summary at end.
   - Logs artifact sizes and elapsed times for each stage.
- Server must read SQLite file path from env var `SQLITE_DB_PATH`.
- Server must create directory for DB if missing and reuse existing file if present.
- Server must bind to `process.env.PORT`.
- SPA client must serve static assets with an index.html fallback.
- Provide documentation (this file + brief README section) describing usage.

### Non-Functional Requirements
- Reliability: SQLite file persists across restarts and redeploys (stored outside wwwroot purge path).
- Simplicity: No external services added; single instance only (documented constraint).
- Security: Secrets stored only in App Settings (treated as confidential). No expansion of surface area.
- Performance: Maintain existing perceived latency; avoid adding build steps that exceed target time.
- Maintainability: Scripts idempotent; re-run updates config without manual cleanup.
- Observability (Minimum): Enable basic App Service logging; optional App Insights (flagged but can defer).

---

## Feature Design

### UI/UX
No UI changes to components. Minor documentation updates referencing new deployment option. Ensure client deep links function (add rewrite/fallback config or static `routes.json` for Linux App Service).

### Backend / Data
- Data Store: Continue using SQLite, relocated to `/home/site/data/voice-ai-documents.db` via env `SQLITE_DB_PATH`.
- File System Layout:
  - Deployed code: `/home/site/wwwroot` (overwritten each deploy).
  - Persistent data: `/home/site/data` (untouched by Zip Deploy).
- Environment Variables (App Settings):
  - `NODE_ENV=production`
  - `PORT=8080` (or App Service default—server uses `process.env.PORT || 3000`).
  - `SQLITE_DB_PATH=/home/site/data/voice-ai-documents.db`
  - Existing service keys: `AZURE_OPENAI_*`, `AZURE_SPEECH_*`, `AUTH_USERS`, `SESSION_SECRET`, `VITE_API_URL`.
  - Optional: `WEBSITE_RUN_FROM_PACKAGE=1` (recommended) for immutable deployment root.
   - Placeholder creation: on deploy, the script inspects current settings and adds empty values (e.g. `KEY=`) for missing referenced keys so future secure values can be injected without another code change. Current server placeholder list: `API_BASE_URL`, `VITE_API_URL`, `DATABASE_PATH`, `USE_SEED_DATA_MODE`, `SKIP_RESTORE`, `AZURE_STORAGE_ACCOUNT_NAME`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_KEY`, `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_MODEL`, `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `AZURE_AI_FOUNDRY_PROJECT_ENDPOINT`, `AZURE_EVALUATION_AGENT_ID`, `MESSAGE_WINDOW_SIZE`, `AUTH_USERS`, `SESSION_SECRET`, `SESSION_DURATION_HOURS`, `RATE_LIMIT_PER_MINUTE`, `AUTH_ENABLED`, `PROMPTY_TEMPLATE`. Client placeholder list (currently): `VITE_API_URL`.
- Health Endpoint: Add simple `/healthz` (200 OK + basic JSON) if not already present.
- Scaling: Explicitly set max instance count = 1 (document risk if changed).

### Runtime Client Configuration (API Base URL)
Decision: Implement Option 2 (runtime JSON endpoint) to allow changing API base URL via App Service settings without rebuilding the client.
- Server exposes `GET /runtime-config` returning `{ apiBaseUrl, updatedAt }`.
- App Setting precedence: `API_BASE_URL` then fallback to `VITE_API_URL` then derive from request host.
- Client loads `/runtime-config` before rendering (see `runtimeConfig.ts` + modified `main.tsx`).
- `apiClient` now resolves base URL at request time via runtime cache; no dependency on `window.ENV` or container `startup.sh`.
- Changing the App Setting triggers server restart → next page load fetches new value.

---

## Implementation Plan

Phase Breakdown:
1. Code Adjustments
   - Introduce `SQLITE_DB_PATH` usage and directory creation logic in server startup.
   - Ensure Express listens on `process.env.PORT`.
   - Add `/healthz` if missing.
2. Client Build Adaptation
   - Confirm `npm run build` produces hashed assets under `dist/`.
   - Add SPA fallback (static rewrite) file if required by hosting.
3. Unified Deployment Script
   - Author `deploy-appservice.ps1` handling server + client build/package/deploy.
   - Implement selective deployment flags and dry-run (`-WhatIf`) output (shows intended actions, no changes).
   - Ensure minimal production dependency install for server (e.g., `npm ci --omit=dev`).
   - Include checksum generation (e.g., SHA256) per artifact for quick diff visibility.
   - Implement placeholder App Settings creation for missing referenced environment variables (server + client) to surface configuration surface early.
4. Validation
   - Manual deploy to test resource group/app pair (new native apps: suffix `-native`).
   - Verify persistence: create data via app, redeploy, confirm data remains.
   - Confirm placeholder settings appear in App Settings list with empty values and can be safely edited post-deploy.
5. Hardening & Documentation
   - Document usage in README (section: Native App Service Deployment).
   - Add operational notes: single-instance constraint, future migration path.

Concrete 5-Step Execution Sequence (High-Level, Run Sequentially):
1. Adjust server code for `SQLITE_DB_PATH`, directory creation, health endpoint.
2. Implement `deploy-appservice.ps1` with server path only; test server deploy & DB persistence (`-SkipClient`).
3. Extend script for client deploy; test full deploy (both) with SPA routing & API integration.
4. Add SPA fallback rule / config and enable `WEBSITE_RUN_FROM_PACKAGE=1`; re-run full deploy (verify deep links).
5. Update docs (README + this file) and announce availability; retain container path unchanged.

---

## Testing & Validation

### Unit Tests
- Add/adjust test for DB path resolution logic (ensures env var honored, fallback not used incorrectly).
- Add test for health endpoint handler (200 + expected shape).

### Integration Tests
- Smoke test hitting API endpoints after deployment (login, send message, retrieve message).
- Persistence test: Insert record, redeploy (Zip Deploy), re-query record.

### Manual Testing
- Deep link to `/chat` or another non-root route directly in browser (expect index.html fallback).
- Restart App Service (portal) and confirm DB state remains.
- Check application logs for any SQLite lock errors.

### Acceptance Criteria
- All success metrics (earlier section) met.
- No 500 errors in first 10 minutes post-deploy smoke test.
- Data persists across at least 2 manual redeploy cycles.

---

## Additional Notes
- Existing container deployment remains untouched (ACR + Docker scripts retained).
- This pathway is a tactical simplification; strategic future step is migrating persistence off SQLite for scale-out.
- Optional improvement: Introduce staging slots later for zero-downtime swaps.

---

## Assumptions
- Single instance only; horizontal scaling deferred until DB migration complete.
- Region matches existing resources; no cross-region latency concerns introduced.
- Operator has sufficient RBAC rights to create/update Web Apps and App Settings.
- Secrets are already known and can be safely copied into App Settings (no compliance blocker).
- Local developer environment has Node 20 LTS installed (matching runtime).

---

## Open Questions
1. WEBSITE_RUN_FROM_PACKAGE: RESOLVED – enabled immediately (script sets it for both apps).
2. Application Insights: PENDING – not added to keep initial scope lean; revisit in hardening phase.
3. SPA fallback: RESOLVED – using static `404.html` loader approach in client artifact.
4. Enforce HTTPS-only: PENDING – will document recommendation; enforcement not yet scripted.
5. Naming convention: PENDING – currently using explicit names passed via parameters (option to suffix with `-native`).

---

## Future Follow-Up (Not Blocking This Feature)
- Migrate SQLite to managed database (PostgreSQL / Azure SQL) to allow autoscale.
- Introduce GitHub Actions pipeline for native path.
- Key Vault integration + managed identity usage for secrets.
- Add staging slot + automated smoke tests before swap.
- Add CDN/Front Door for static client assets + caching policies.
