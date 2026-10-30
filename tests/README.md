# Picker regression tests

Install the browser binaries once with `npx playwright install chromium webkit`,
then run `npm run test:pickers`.

The tests bundle the real archetype picker in a bottom-of-page card. No dev server,
authentication, or database is required. They cover both plain options and the
longer descriptions used by MTG Complete, with empty and existing selections.

Mobile emulation does not reproduce native phone focus scrolling or zoom. The
regression injects the reported viewport movement on input focus to verify that
a touch tap still opens the picker. Selection, clearing, outside dismissal, and
keyboard interaction are checked in Chromium and WebKit.

## Dependency compatibility checks

Run `npm run test:compatibility` after installing dependencies and generating
Prisma. This creates a disposable local SQLite database; it does not use the
configured Turso database. It exercises Auth.js persistence, real tRPC callers,
input validation, saved-game compatibility, and environment validation.

Run `npm run build` followed by `npm run test:smoke` for production browser
checks. The suite owns port 3012 and starts/stops its own production server.
It uses an in-memory database and disables external Redis rate limiting.
Guest page rendering, guest authorization, dice assets/rolls, and life-tracker
reload persistence are checked in Chromium and WebKit.

These checks do not replace a real Discord sign-in/callback/sign-out check or
live Turso/Redis and external map/card-service verification before deployment.
Use the Node runtime range declared in package.json (required by Prisma 7).
