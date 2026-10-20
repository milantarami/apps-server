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
2. `cp .env.example .env` and fill in:
   - `SUPABASE_URL`: the project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: the **secret** key (`sb_secret_…`) or the legacy `service_role` key. Not the
     publishable key. This key bypasses row level security, so it stays in `.env` (gitignored) and is only read by
     the dashboard's server code; it never reaches the browser bundle.
   - `EXPO_ACCESS_TOKEN` (optional): only if you turn on "Enhanced push security" for the Expo project.
   - `DASHBOARD_PASSWORD` (optional): asks for a password before the dashboard reads devices or sends.
   - `APP_ID` (default `2`, matches the app's `shared/appConfig.ts`), `PROJECT_NAME` and `DASHBOARD_PORT` (default `5178`).
3. `pnpm install` (or `make install`).

### More than one project

Set `PROJECTS` to a comma-separated list of ids and the masthead gets a **Project** picker; Compose, Devices and
History all follow it, and the choice is remembered in the browser. Each id reads `<ID>_NAME`, `<ID>_APP_ID`,
`<ID>_SUPABASE_URL`, `<ID>_SUPABASE_SERVICE_ROLE_KEY` and `<ID>_EXPO_ACCESS_TOKEN`, with the id upper-cased and
dashes turned into underscores. Anything left out falls back to the shared unprefixed value, so apps that share one
Supabase project only need a name and an app id:

```sh
PROJECTS=years-of-us,other-app
YEARS_OF_US_NAME=Years of Us
YEARS_OF_US_APP_ID=2
OTHER_APP_NAME=Other App
OTHER_APP_APP_ID=3
```

Every app needs `push_notifications.sql` and `broadcast_notifications.sql` (from the Years of Us repo) applied to its Supabase project and must register tokens with
its own app id. Without `PROJECTS` the dashboard runs a single project from the unprefixed values.

## Run

```sh
pnpm dev          # http://127.0.0.1:5178, with hot reload
pnpm build        # type-check and build the UI into dist/
pnpm start        # serve dist/ and the API with plain Node (needs Node 24+)
```

Restart after editing `.env`. `make help` lists the same commands plus the Docker ones.

### Docker

```sh
make docker-build   # build the image (about 195 MB, most of it the Node binary)
make docker-run     # run it on http://127.0.0.1:5178 with your .env
make docker-logs    # follow logs
make docker-stop    # stop and remove the container
make docker-clean   # also remove the image
```

The image holds only the Node binary, the built UI and the server bundled into one file: no `node_modules`, npm
or pnpm. `.env` is never copied into the image; `docker-run` passes it in with `--env-file`, so restart the
container after editing it. Docker reads that file literally: write `PROJECT_NAME=Years of Us`, not
`PROJECT_NAME="Years of Us"`, and keep comments on their own lines. The port is published on `127.0.0.1` only, so
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

1. `pnpm dev` and open http://127.0.0.1:5178 → **Compose** (pick the project in the masthead if you use `PROJECTS`).
2. Write the title and message. Optionally pick a screen to open on tap and add JSON data.
3. Under **Delivery**, set **Expires** (default 7 days, at least 1 hour, at most 30 days).
4. Leave the audience on **Everyone** (the default) and press **Send to everyone**.
5. Check the device count and expiry in the dialog and confirm.

Users with push on get it straight away. Everyone else sees it in the bell list the next time they open the app or
bring it to the foreground (the app fetches at most every 5 minutes). It stops showing as new after the expiry, and
read copies are removed from the inbox a week after they were read.

### From the API

The same send works with `curl` against the running server. The API answers only on localhost and needs the
`x-dashboard-request: 1` header; add `x-dashboard-password` only when `DASHBOARD_PASSWORD` is set. `project` is
`default` without `PROJECTS`, otherwise one of its ids.

```sh
curl -s 'http://127.0.0.1:5178/api/send?project=default' \
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

To check the audience first: `curl -s 'http://127.0.0.1:5178/api/audience?project=default&type=all' -H 'x-dashboard-request: 1'`.

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
