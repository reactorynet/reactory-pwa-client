# Booktutor E2E Suite

Playwright tests for the `booktutor` client, covering the reactory-classroom
module's screens (Courses, MyCourses, OwnedCourses, Students, Assignments,
UserSchedule) end to end against a real running stack.

## Status

**Written but not yet run against a live server in the environment this was
authored in** (no local Postgres/Mongo instance was available). Selectors
are role/label-based rather than exact test-ids, because the login form
(`core.Login@1.0.0`) is loaded from a runtime plugin bundle whose source
isn't in this repo, so its exact markup couldn't be verified ahead of time.
Treat the first real run as a selector-verification pass, not a guaranteed
green run - see `reactory-classroom/PROGRESS_TRACKER.md` Phase 10 for the
honest, up-to-date status once it's actually been run.

## Prerequisites

1. Postgres and MongoDB running locally (whatever `reactory-express-server`'s
   `.env` points at).
2. API server running:
   ```bash
   cd reactory-express-server
   bin/start.sh reactory local
   ```
3. Booktutor client running:
   ```bash
   cd reactory-pwa-client
   bin/start.sh booktutor local
   ```
   Confirms on `http://localhost:3004` (per `config/env/booktutor/.env.local`).
4. **Unverified environment step**: the API server's `CLIENTS_ENABLED` env var
   (`.env`, currently `enabled-clients.reactory`) controls which *modules* are
   loaded - it was not conclusively determined during this work whether the
   `booktutor` client config additionally needs to be present in an
   enabled-clients list for the server to recognize the `booktutor` client key,
   or whether client configs are resolved independently of that mechanism. If
   the booktutor client doesn't load (wrong theme/menu/routes returned), check
   this first.
5. Test accounts must exist in whatever database the API server is pointed at -
   `authentication/users.yaml` describes the *intended* seed accounts; confirm
   they've actually been created (e.g. via the CLI or a seed script) before
   assuming login will succeed.

## Running

```bash
cd reactory-pwa-client
npx playwright test                 # headless, all specs
npx playwright test --headed        # watch it run
npx playwright test --debug         # step through
npx playwright show-report          # after a run, view the HTML report
```

## Role matrix

Test accounts from `reactory-classroom/../booktutor/authentication/users.yaml`,
mirrored in `e2e/fixtures/users.ts`:

| Account | Roles | Used for |
|---|---|---|
| test_user | USER | Student flow - browse/enroll/my courses |
| test_admin | USER, DEVELOPER, ADMIN | Admin panel access |
| fourtyslevin (werner.weber@gmail.com) | USER, DEVELOPER, ADMIN, STUDENT, TUTOR | Tutor flow - owned courses, students, schedule |

`test_developer` and the `anon`/`wweber` accounts exist in `users.yaml` but
aren't currently exercised by any spec - add them if you need
DEVELOPER-specific or anonymous-access coverage.

## What these specs actually verify

- `auth.spec.ts` - login succeeds per role, and role-gated nav links
  (matched by `href`, not translated text - the booktutor i18n resource
  files weren't found in this repo) appear/disappear correctly.
- `classroom-student-flow.spec.ts` - `/courses` renders a table of published
  courses, enrolling (if an Enroll action is visible) doesn't error, and
  `/courses/assigned` renders afterward.
- `classroom-tutor-flow.spec.ts` - `/courses/owned`, `/students`, `/schedule`
  each render a table.
- `classroom-admin-flow.spec.ts` - admin routes are reachable and courses
  still render for an ADMIN-roled user.

These are presence/rendering checks (a `<table>` shows up, the URL doesn't
bounce back to `/login`), not deep data-correctness assertions - the goal is
catching "this screen doesn't render at all" regressions, not replacing the
backend's own test suite.
