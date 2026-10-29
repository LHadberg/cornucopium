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
