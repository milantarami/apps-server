# apps-server: The Dispatch push dashboard

A small local web app for sending push notifications to your apps (Years of Us first). It runs only on your machine
(`127.0.0.1`), keeps the Supabase secret key server-side, and talks to the free Expo Push Service, which delivers
through Firebase Cloud Messaging (Android) and APNs (iOS).

```
app ──register token──▶ Supabase (push_tokens)
dashboard (local) ──reads tokens──▶ Supabase
dashboard ──send──▶ Expo Push API ──▶ FCM / APNs ──▶ device
```

This is a standalone pnpm project that sits next to the apps (`../concept1` is Years of Us); it shares no code
with them.

## Setup

1. Apply the app's `scripts/sql/push_notifications.sql` and then `scripts/sql/broadcast_notifications.sql` (for Years of Us: `../concept1/scripts/sql/`) once in the Supabase SQL editor.
2. `cp .env.example .env.local` (and `.env.prod` for the real thing) and fill in:
   - `SUPABASE_URL`: the project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: the **secret** key (`sb_secret_…`) or the legacy `service_role` key. Not the
     publishable key. This key bypasses row level security, so it stays in `.env.local` / `.env.prod` (gitignored) and is only read by
     the dashboard's server code; it never reaches the browser bundle.
   - `EXPO_ACCESS_TOKEN` (optional): only if you turn on "Enhanced push security" for the Expo project. Set
     `EXPO_ACCESS_TOKEN_<appId>` (for example `EXPO_ACCESS_TOKEN_3`) to override it for one app. The token is read
     from the env file only, never from the database, and never sent to the browser.
   - `DASHBOARD_PASSWORD` (optional): asks for a password before the dashboard reads devices or sends.
   - `DASHBOARD_PORT` (default `5178`).
3. `pnpm install` (or `make install`).

### Which apps show up

The app list comes from the `apps` table in that Supabase project: every row is shown, ordered by `id`. `id` is the
`app_id` used in all queries; the name is the first non-empty of `name`, `title` or `slug`, else `App <id>`. With more
than one app the masthead gets a **Project** picker; Compose, Devices and History follow it. The list is cached for
60 seconds and refreshed whenever the page loads; if Supabase can't be reached the last good list keeps working, and
on a first load the setup screen says what failed. Add an app by inserting a row into `apps`.

Every app needs `push_notifications.sql` and `broadcast_notifications.sql` applied and must register tokens with its
own app id. All apps share one Supabase project.

**Migrating from `PROJECTS`:** `PROJECTS`, `PROJECT_NAME`, `APP_ID` and every `<ID>_NAME`, `<ID>_APP_ID`,
`<ID>_SUPABASE_URL`, `<ID>_SUPABASE_SERVICE_ROLE_KEY` and `<ID>_EXPO_ACCESS_TOKEN` are ignored now. Delete them, keep
one `SUPABASE_URL` and key, and rename `<ID>_EXPO_ACCESS_TOKEN` to `EXPO_ACCESS_TOKEN_<appId>`. Setups that used a
different Supabase project per app are no longer supported; project ids in the UI are now app ids (the saved picker
choice resets once).

## Run

```sh
make dev                # http://127.0.0.1:5178, with hot reload, reads .env.local
make start ENV=prod     # build, then serve dist/ and the API with plain Node (Node 24+), reads .env.prod
pnpm build              # type-check and build the UI into dist/
```

`ENV` is `local` (default) or `prod` and picks `.env.local` or `.env.prod`; the target stops if the file is missing.
The Makefile sets `ENV_FILE`, which the server reads instead of `.env`, so `ENV_FILE=.env.prod pnpm start` works
without make. A plain `.env` is only read when `ENV_FILE` is unset (bare `pnpm dev` / `pnpm start`); rename it to
`.env.local` to use the make targets. Restart after editing the file. `make help` lists the same commands plus the
Docker ones.

### Docker

```sh
make docker-build   # build the image (about 195 MB, most of it the Node binary)
make docker-run     # run it on http://127.0.0.1:5178 with .env.local (ENV=prod for .env.prod)
make docker-logs    # follow logs
make docker-stop    # stop and remove the container
make docker-clean   # also remove the image
```

The image holds only the Node binary, the built UI and the server bundled into one file: no `node_modules`, npm
or pnpm. The env file is never copied into the image; `docker-run` passes `.env.local` or `.env.prod` in with
`--env-file`, so restart the container after editing it. Docker reads that file literally: write `DASHBOARD_PASSWORD=my pass`, not
`DASHBOARD_PASSWORD="my pass"`, and keep comments on their own lines. The port is published on `127.0.0.1` only, so
the dashboard stays reachable from this machine alone. Use `make docker-run PORT=5200` for another port.

## Using it

- **Compose**: title, body, an optional screen to open on tap (only routes the app knows), optional JSON data,
  Android channel, sound and an expiry (default 7 days, at most 30). The preview shows roughly how it lands on
  Android and iOS. Pick an audience: **Everyone** (default) or **One device** for a test.
  Everyone writes a row to `broadcast_notifications`, which the app fetches on launch and on return to the
  foreground, so it reaches people with push off or who swiped the push away. It also pushes to every enabled
  device with `data.notification_id` (the row id) and `data.expires_at`; the app uses `notification_id` so the
  push and the fetched row show up as one entry. Everyone asks for confirmation and shows the device count first.
  One device only pushes (with `expires_at`) and creates no row.
- **Devices**: counts by platform, app version and language, most recently seen devices, a **Test** button that
  fills the token into Compose, and **Switch off** for a token.
- **History**: every send with ticket results; **Check receipts** asks Expo whether Apple/Google accepted them.

Test on your own phone first: open a development build, turn notifications on, find your device under Devices
(newest first), press **Test**, and send.

## Send to everyone (no token needed)

A broadcast goes to every user of the app. You never paste a device token: the server reads every enabled token
from `push_tokens` itself, and the in-app inbox picks the message up from `broadcast_notifications` even on devices
with push switched off.

Once per Supabase project, apply `push_notifications.sql` and then `broadcast_notifications.sql`, and ship an app
build that includes the inbox broadcast fetch.

### From the dashboard

1. `make dev` and open http://127.0.0.1:5178 → **Compose** (pick the app in the masthead if there is more than one).
2. Write the title and message. Optionally pick a screen to open on tap and add JSON data.
3. Under **Delivery**, set **Expires** (default 7 days, at least 1 hour, at most 30 days).
4. Leave the audience on **Everyone** (the default) and press **Send to everyone**.
5. Check the device count and expiry in the dialog and confirm.

Users with push on get it straight away. Everyone else sees it in the bell list the next time they open the app or
bring it to the foreground (the app fetches at most every 5 minutes). It stops showing as new after the expiry, and
read copies are removed from the inbox a week after they were read.

### From the API

The same send works with `curl` against the running server. The API answers only on localhost and needs the
`x-dashboard-request: 1` header; add `x-dashboard-password` only when `DASHBOARD_PASSWORD` is set. `project` is the
app id from the `apps` table (for example `2`).

```sh
curl -s 'http://127.0.0.1:5178/api/send?project=2' \
  -H 'content-type: application/json' \
  -H 'x-dashboard-request: 1' \
  -H "x-dashboard-password: $DASHBOARD_PASSWORD" \
  -d '{
    "title": "Happy weekend",
    "body": "Plan something small for the two of you.",
    "route": "/couple-calendar",
    "data": null,
    "channelId": "updates",
    "sound": true,
    "target": { "type": "all" },
    "confirmAll": true,
    "expiresAt": "2026-11-01T00:00:00Z"
  }'
```

- `target` must be `{ "type": "all" }` and `confirmAll` must be `true`, or the server refuses to send.
- `expiresAt` is an ISO-8601 time between 1 hour and 30 days from now.
- `route` is optional (`null` for none) and must be a screen the app knows. `data` cannot use the reserved keys
  `url`, `momentId`, `notification_id`, `expires_at` or `expiresAt`.
- The response has `broadcastId` (the `broadcast_notifications` row) and the push counts. `sent: 0` with a
  `broadcastId` means no device had push on, so it reached the in-app inbox only.

To check the audience first: `curl -s 'http://127.0.0.1:5178/api/audience?project=2&type=all' -H 'x-dashboard-request: 1'`.

## How sending works

Messages go to `https://exp.host/--/api/v2/push/send` in chunks of 100. Each message returns a ticket. Tickets with
`DeviceNotRegistered` switch that token off right away. Receipts are fetched from `/--/api/v2/push/getReceipts`
(checked automatically 15 s after a send, or on demand); `DeviceNotRegistered` receipts also switch tokens off.
The Expo request and response shapes were written without live docs: verify them with a real test send.

## Cost

Everything here is free: Expo Push Service has no charge, FCM is free, the Supabase free tier is enough for token
storage, and the dashboard runs locally. Free Supabase projects pause after a period of inactivity; if the
dashboard says it can't reach Supabase, restore the project from the Supabase dashboard. Expo applies per-project
rate limits (on the order of hundreds of notifications per second; not verified here); the client retries
`429` and `5xx` responses with backoff.

iOS delivery needs an APNs key, which requires a paid Apple Developer Program membership.
