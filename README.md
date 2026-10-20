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

1. Apply the app's `scripts/sql/push_notifications.sql` (for Years of Us: `../concept1/scripts/sql/push_notifications.sql`) once in the Supabase SQL editor.
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

Every app needs `push_notifications.sql` (from the Years of Us repo) applied to its Supabase project and must register tokens with
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
  Android channel and sound. The preview shows roughly how it lands on Android and iOS. Pick an audience: one
  token, all Android, all iOS, or everyone. Broadcasts ask for confirmation and show the device count first.
- **Devices**: counts by platform, app version and language, most recently seen devices, a **Test** button that
  fills the token into Compose, and **Switch off** for a token.
- **History**: every send with ticket results; **Check receipts** asks Expo whether Apple/Google accepted them.

Test on your own phone first: open a development build, turn notifications on, find your device under Devices
(newest first), press **Test**, and send.

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
