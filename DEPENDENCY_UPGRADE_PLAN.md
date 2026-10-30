# Dependency upgrade plan

Created: 2026-10-30. Status: upgrades in progress; see execution log.

## Objective and scope

Resolve the known dependency advisories while preserving existing behavior and data. Use the smallest supported upgrades that resolve the findings. Avoid unrelated feature changes and optional major upgrades. No test suite can guarantee zero regressions; completion requires the evidence below, with any unverified behavior explicitly recorded.

The initial npm audit reported 20 affected packages (4 critical, 13 high, 3 moderate); omitting development dependencies reported 19. These counts include inherited findings, not distinct exploitable application flaws. Refresh the audit before selecting versions.

## Execution rules

- Work in the existing checkout on `fix/dependency-security`, as requested by the user. Inspect and preserve any user changes before starting.
- Record the starting commit and create one reviewable checkpoint per passing upgrade batch. Keep package.json, package-lock.json, compatibility edits, and relevant tests together.
- Resolve exact target versions from current npm advisories, official release notes, runtime requirements, and peer dependency ranges at execution time. Record that evidence in the execution log; do not assume a previously suggested version clears every advisory.
- Do not use `npm audit fix --force`, `--legacy-peer-deps`, or broad overrides to conceal incompatibility. Prefer updating the owning dependency for transitive findings.
- Use a disposable test database and test accounts for write tests. Confirm the effective database destination before any writes. Never run migrations or schema pushes against production for this work.
- A failed check stops the batch. Diagnose and fix it or restore that batch to its preceding checkpoint; do not stack further upgrades on a regression. Preserve unrelated changes and avoid destructive resets.

## 1. Establish a reproducible baseline

- [ ] Record Git status and starting commit, Node/npm versions, deployment runtime, and the locked dependency tree (`npm ls --all`). Match the declared npm package manager where feasible.
- [ ] Capture full and production-only `npm audit --json` reports, including advisory URLs, dependency paths, and fix availability.
- [ ] Run `npm ci`, `npx prisma validate`, `npx prisma generate`, `npm run typecheck`, `npm run build`, and `npm run test:pickers` with Chromium and WebKit available. Record pre-existing errors separately and resolve any that would prevent meaningful upgrade validation.
- [ ] Run the production build with `npm run start` on an unused port and record baseline page behavior and browser/server errors. Check development startup separately.
- [ ] Establish isolated database fixtures and baseline checks from the behavior matrix below. Record external-service or credential requirements without exposing secrets.

Current test coverage is limited to an esbuild-bundled archetype-picker fixture. It does not start Next.js or exercise authentication and persistence. Add focused integration/browser coverage for the high-risk behavior below before upgrading the corresponding dependency group; use existing test facilities where practical. Do not add tests that only assert package versions.

## 2. Upgrade Next.js and its required runtime dependencies

- [ ] Select the smallest supported patched Next.js release that clears the current findings. Check Node requirements, React compatibility, image optimization, caching, routing, and dev/build CLI changes.
- [ ] Update React, React DOM, and matching types together only if needed for security or compatibility. Check React Three Fiber, Drei, React Spring, Mantine, and React Leaflet peer ranges if React changes.
- [ ] Inspect nested Sharp and PostCSS versions after installation; a top-level upgrade alone may leave vulnerable nested copies.
- [ ] Pass the common gate below, plus production page navigation, image loading, API routes, hydration, and 3D dice checks. Record the resulting audit delta.

## 3. Upgrade Auth.js as a compatible group

- [ ] Update `next-auth` and `@auth/prisma-adapter` to compatible patched releases. Verify every installed `@auth/core` copy and preserve the Discord provider and session user ID contract.
- [ ] Verify real Discord sign-in/callback, reload persistence, sign-out, expired/missing sessions, and rejection of unauthenticated protected operations using a test account.
- [ ] Test malformed authorization input and configuration/error paths relevant to the advisories. Ensure an error-bearing auth result cannot grant access.
- [ ] Verify cross-user access restrictions and the Prisma adapter's account/session persistence. Mocked tests supplement, but do not replace, a real OAuth round trip.
- [ ] Pass the common gate and record the audit delta. If the selected Auth.js version requires a Prisma change, combine only the necessary Prisma work with this batch and document why.

## 4. Resolve Prisma and libSQL compatibility

The manifest currently mixes `@prisma/adapter-libsql` major 7 with Prisma CLI/client major 6. `src/server/db.ts` uses the adapter and imports a generated client from `generated/prisma`. Treat this as a compatibility investigation, not proof of a runtime defect.

- [ ] Check official compatibility requirements and select a supported CLI/client/adapter/libSQL combination that addresses the findings. Prefer staying on the current client major if a secure supported combination exists; isolate a required major migration.
- [ ] Preserve the generated-client output path and database behavior, or update all affected imports deliberately. Review schema/configuration changes required by the selected release.
- [ ] Validate and regenerate Prisma, then test actual queries and transactions against an isolated database. Verify account/session operations and create/read/update/delete behavior for decks and hiking routes, plus dice settings persistence.
- [ ] Confirm there is no unintended schema/data migration. If one becomes necessary, stop this batch and prepare a separate migration, backup, restore, and compatibility plan before applying it.
- [ ] Pass the common gate and record the audit delta.

## 5. Migrate Zod and environment validation

- [ ] Select patched compatible versions of Zod and `@t3-oss/env-nextjs`/`@t3-oss/env-core`; inspect tRPC compatibility and any duplicate Zod copies.
- [ ] Inventory schema usage and migrate changed APIs deliberately. Preserve defaults, optional/nullable fields, coercion, transforms, and client-visible validation errors.
- [ ] Test representative valid and invalid tRPC inputs, oversized collections, and environment validation with valid, missing, and malformed variables. Verify client bundles do not expose server-only configuration.
- [ ] Pass the common gate and record the audit delta.

## 6. Resolve remaining transitive and tooling findings

- [ ] Re-audit and trace each remaining finding with `npm explain`. Update owning packages in small related batches, including CSS/build tooling, archive utilities, WebSocket dependencies, and other reported transitives as needed.
- [ ] Keep tightly coupled packages aligned, such as Mantine core/hooks and tRPC client/server/react-query. Avoid optional upgrades unrelated to remaining security or compatibility needs.
- [ ] For any unavoidable override, document upstream compatibility evidence, exercise its affected path, and record an explicit removal condition.
- [ ] Pass the common gate for each batch, with picker/visual checks for CSS or Mantine changes and dice/asset checks for 3D or archive changes.

## Common gate after each batch

1. Inspect the manifest/lockfile diff and `npm ls --all`; resolve new invalid peer relationships.
2. Run `npm run typecheck`, `npm run build`, and `npm run test:pickers`. Regenerate/validate Prisma when its dependency group or schema/configuration changes.
3. Run focused integration checks for the changed group and smoke-test its behavior in a production server. A build alone is not proof of working runtime behavior.
4. Re-run full and production-only audits. Explain remaining findings and any new ones.
5. Record exact versions, commands/results, behavior checks, and limitations; establish a checkpoint only when the gate passes.

## Behavior matrix

| Area | Required checks |
| --- | --- |
| Navigation/rendering | `/`, `/dice-roller`, `/life-tracker`, `/decks`, `/mtg-complete`, `/hiking`, and a public `/mtg-complete/[listName]` fixture; expected guest/authenticated states; no new hydration or runtime errors |
| Authentication/authorization | Discord login/logout, session persistence/expiry, guest rejection, user A cannot read or mutate user B's private records; public sharing remains intentional |
| Decks/MTG | Create/edit/delete fixtures, selection and archetype picker, public-list visibility, card search and Scryfall images, persistence after reload |
| Dice | Assets/WASM load, 3D roll completes and displays results, advantage/disadvantage, existing fallback path, settings persistence, language switching |
| Hiking | Map/tiles load, waypoint editing, route calculation, isolated save/reload/delete |
| Life tracker | Existing counter/control interactions and any existing reload persistence |
| Styling/devices | Representative desktop/mobile layouts, overlays/selects, Chromium/WebKit picker tests, no missing CSS or broken images |
| Validation/API | Valid requests succeed; invalid/oversized requests fail safely; response serialization and rate-limit behavior remain intact |

Use deterministic fixtures/mocks for repeatable service-dependent tests, then perform targeted real-service smoke checks where credentials/network access are available. Record unavailable checks as unverified, never as passes.

## 7. Final acceptance and rollout readiness

- [ ] From the final lockfile, run a fresh `npm ci`, Prisma validation/generation, typecheck, production build, picker suite, and added integration tests.
- [ ] Run the complete behavior matrix against the production build with isolated data. Check development startup too.
- [ ] Capture final full and production audits. Target zero known vulnerabilities; if any cannot be resolved, document the dependency path, exposure, blocker, and proposed mitigation. Do not label the security update complete with unexplained findings.
- [ ] Review the final diff for unrelated changes, secrets, generated artifacts, and accidental database/schema modifications.
- [ ] Produce an upgrade summary with before/after versions, audit counts, passing checks, and explicit residual risks or unavailable checks.
- [ ] If deployment is subsequently authorized, validate in staging first, retain the previous deployment artifact, and monitor login, API errors, persistence, image processing, and dice rendering. Roll back to that artifact if regressions appear. Reverting source dependencies also requires restoring the matching lockfile, reinstalling, regenerating Prisma, and rebuilding.

## Execution log

For each batch record: starting checkpoint; exact versions and advisory/release-note evidence; changed files; checks and results; audit delta; unresolved limitations; rollback checkpoint.

### Baseline started 2026-10-30

- Created `fix/dependency-security` from local `main` at `346fa25c726ae2bc732b6ef04e5421b89d2d8cd1`.
- Starting checkout contained only this untracked plan; preserved it.
- Runtime: Node v24.6.0, npm 11.17.0. The manifest declares npm 11.5.1; record this difference when assessing lockfile changes.
- Clean `npm ci`, typecheck, production build, and all 8 Chromium/WebKit picker tests passed. `npm ls --all` reported no invalid dependencies.
- Prisma generation passed. Validation with the existing environment failed because SQLite requires a `file:` DATABASE_URL; validation passed with a process-local `file:./dependency-validation.db` override. No environment file or database changed.
- Production HTTP checks returned 200 for `/`, `/dice-roller`, `/life-tracker`, `/decks`, `/mtg-complete`, `/hiking`, `/api/auth/session`, and the dice WASM asset.
- User selected local database fixtures; real Discord sign-in is reserved for manual verification.

### Batch 1: Next.js

- Next.js 16.2.1 -> 16.4.3 (`~16.4.3`); Sharp resolved to 0.35.5 and PostCSS to 8.5.23. React/React DOM remain 19.2.4.
- Evidence: npm package metadata (Node >=20.9.0, React ^19 supported), refreshed npm audit, and https://github.com/vercel/next.js/releases/tag/v16.4.3.
- Typecheck, production build, all 8 picker tests, and the same production HTTP checks passed. These HTTP checks do not establish browser hydration or interactive behavior.
- Full audit: 16 affected packages (3 critical, 10 high, 3 moderate); Next.js, Sharp, and PostCSS no longer reported.
- Existing generated-Prisma tracing warnings remain; the new build reports them in more detail. Module-type warnings also remain.
- Added `node --test tests/db-compatibility.test.cjs`: disposable local SQLite/libSQL fixture tests Auth.js account/session lifecycle, deck isolation filters/updates, hiking persistence/deletion, and dice settings across reconnect. Passed against the original Auth.js/Prisma versions. This is a persistence contract test, not a full router authorization test.
- The clean install created an unused `public/assets/themes` directory through dice-box postinstall; removed only that newly generated directory.
- Remaining: full browser behavior matrix, real Discord manual check, and subsequent upgrade batches.

### Batch 2: Auth.js

- `next-auth` -> 5.0.0-beta.32; `@auth/prisma-adapter` -> 2.11.3, resolving `@auth/core` to 0.41.3. Audit now reports 13 packages (0 critical, 10 high, 3 moderate).
- Evidence: npm metadata and https://github.com/nextauthjs/next-auth/security/advisories/GHSA-8fpg-xm3f-6cx3.
- Build, typecheck, 8 picker tests, and local persistence test pass. Fixed strict TypeScript checks in the newly added fixture test rather than disabling type checking.
- Added `playwright.smoke.config.ts` and 16 production smoke tests across Chromium/WebKit: main guest pages render without uncaught page errors, guest/malformed bearer requests get no session and cannot access protected decks, dice assets load. Tests use in-memory DB configuration and disable external rate limiting; they do not establish real Redis behavior or authenticated flows.
- Real Discord round trip remains a manual verification item by user choice.
