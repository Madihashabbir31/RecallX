# RecallX verification record

Verified on 11 September 2026 in the build environment.

## Completed automated checks

- **TypeScript + Vite production build: PASS.** The compiled frontend is included in `frontend/dist`.
- **Backend workflow suite: 9 tests passed.** Covers valid/invalid login, unauthenticated access, patient/caregiver permissions, unlinked-caregiver isolation, routine create/edit/complete/delete and idempotent completion, medication confirmation, missed-reminder deduplication, acknowledgement ownership, photo validation/protected photo retrieval, all four game-session persistence paths, duplicate-session replay, invalid score validation, rule-based adaptation, family voice data and settings isolation.
- **Frontend component/interaction suite: 8 tests passed.** Runs with React Testing Library and jsdom. Covers completing Memory Match (including pause), Object Recall, Sequence Recall, Family Recall with hint tracking, retrying a failed game save with the same event ID, concurrent offline actions, account-scoped replay and retaining failed queued events.
- **Python syntax compilation: PASS.**
- **Compiled app and real-clock reminder smoke:** see `live-smoke-result.txt`. Uses the actual FastAPI lifespan, serves the compiled HTML/assets and checks the background worker after a real 33-second interval.

The backend suite uses an isolated temporary database. Component tests mock the app-data context and network responses; these are not full browser-to-server end-to-end tests.

## Browser validation limitation

The browser preview was blocked by the execution environment (`ERR_BLOCKED_BY_CLIENT`). No rendered desktop/mobile screenshots, browser-console sweep, real microphone capture, notification-permission flow, installation prompt or actual service-worker offline navigation could be verified. Browser/device QA remains outstanding. Source includes the relevant handling, and queue behavior was tested separately.

A manual browser pass should cover:

1. Patient/caregiver demo login and protected-route redirects.
2. Mobile widths (360/390/768 px), desktop width (1440 px), and large/extra-large text.
3. All four game completions, pause, restart and stored results.
4. Caregiver task creation → patient completion → caregiver update.
5. Family photo upload → display in patient library and game.
6. Real 30-second demo expiry and caregiver acknowledgement.
7. English/Hindi/Assamese controls and saved preferences.
8. Speech recognition/text fallback, speech synthesis and notifications on supported browsers.
9. Compiled app reload offline after an initial online visit; complete tasks/games offline; reconnect and verify no duplicate records.
10. Account switching clears private cached data after pending activity syncs.

## Limits and future work

- Browser notifications require an open page; no closed-browser push, SMS or native background alarms.
- One API process runs the reminder worker. Multi-worker coordination is not implemented.
- Initial family records use clearly visible initial-letter avatars. Upload actual family photos through the caregiver UI to personalize them.
- UI translation does not translate caregiver-entered medicine, task or family text. Speech voices and recognition languages depend on the browser. Assamese and Hindi translations need a native-speaker usability pass.
- The optional LLM adapter is not implemented. Cognitive adaptation and voice intents are explicitly rule-based; no trained AI or diagnostic claims.
- PostgreSQL-compatible ORM types are used, but PostgreSQL and Docker execution were not tested here.
- No self-service invitations, password recovery or production account administration. A local provisioning CLI creates linked patient/caregiver accounts.
- Latest build emits a non-fatal bundle-size warning. Core scripts are approximately 956 kB before gzip; future route-level code splitting can improve first-load performance.
