---
name: dashboard-architecture
description: Layering, conventions and verification for this push dashboard (React 19 + Vite UI, Hono API, Supabase, Expo Push). Invoke proactively before adding or changing an API endpoint, a shared contract type, a server repository/service, a client API call, a feature hook, or a screen; before touching config/.env handling, the localhost/password guards, or the Docker/Vite build; and before reviewing any change here.
---

# Dashboard architecture

One pnpm package, three source roots, one type contract. No tests exist: correctness is held by strict types,
validation on both sides of the contract, and a real smoke run.

```
shared/   contract.ts (every request/response type, ApiErrorCode)  compose.ts (validation, payload helpers)  routes.ts (app deep-link routes)
server/   app.ts (Hono routes, input parsing) → pushService.ts (orchestration) → tokenRepository.ts / logRepository.ts (Supabase) + expoPush.ts (HTTP)
          guard.ts (localOnly, passwordGate)  config.ts (.env, multi-project)  errors.ts (ApiError)  index.ts (prod entry)
src/      api/dashboardApi.ts → features/<name>/use<Name>.ts (state) → features/<name>/view/*.tsx + *.module.css
          features/<name>/service/*.ts (pure logic)  ui/ (shared primitives, useLoader)  styles/tokens.css
```

`shared/` is imported by both sides, so it must stay free of Node and DOM APIs.

## Rules

- **Contract first.** A new or changed endpoint starts in `shared/contract.ts`. Server responses use
  `satisfies <Type>`; the client method is typed with the same type. Never redeclare a response shape locally.
- **Validate on the server even when the UI already does.** Shared validators live in `shared/compose.ts` and run
  in both places. `app.ts` turns untyped JSON into typed requests field by field (see `toSendRequest`); never cast
  the body straight to the type.
- **Errors.** Server code throws `new ApiError(status, code, message)`; `code` must be an `ApiErrorCode`. Messages are
  user-facing sentences, shown as-is in the UI. Unknown errors become a 502 `upstream` in `onError`; don't leak
  Supabase/Expo internals in messages. Path ids are checked with `UUID_PATTERN` before they reach Supabase.
- **Project scoping.** Every data route calls `requireProject(c)` and passes `config.appId` into every query. A
  Supabase query without `.eq("app_id", appId)` is a cross-project data leak.
- **Supabase** is reached only through `getSupabase(config)` inside repositories (`*Repository.ts`). Tables:
  `push_tokens`, `push_notifications_log` (schema lives in the app repo: `scripts/sql/push_notifications.sql`).
- **Client data flow.** Components never call `fetch` or `dashboardApi` directly; a feature hook does. Reads use
  `useLoader((signal) => dashboardApi.x(project, signal))` so requests abort on unmount/reload. Every read
  method in `dashboardApi` takes an optional `AbortSignal`; treat `isAbortError` as non-errors.
- **Pure logic** (draft → request, preview models) goes in `features/<name>/service/` as plain functions.
- **Style.** TypeScript strict with `erasableSyntaxOnly` (no enums, no parameter properties, no namespaces),
  `verbatimModuleSyntax` (`import type`), imports end in `.ts`/`.tsx`. `readonly` on props/interfaces. No new
  dependencies unless clearly required: the runtime image ships only Node and one bundled file.
- **Secrets.** `SUPABASE_SERVICE_ROLE_KEY` and `EXPO_ACCESS_TOKEN` are read only in `server/`. Nothing under `src/` or
  `shared/` may import `server/` code or read `process.env`; Vite exposes only `VITE_*` vars, keep it that way.
  Never read or print `.env`; use `.env.example` to learn the keys and add new ones there with a comment.
- **Guards.** `localOnly()` runs before everything (host allowlist, Origin/Sec-Fetch-Site checks, required
  `x-dashboard-request: 1` header, JSON-only writes); `passwordGate` runs after `/status`. New routes go after the
  gate unless they must work before login. Don't loosen either guard.
- **Mirrors of the app.** `shared/routes.ts` mirrors `PUSH_ROUTES` in the app; the app ignores unknown paths. Change
  both together and say so.

## Adding an endpoint (checklist)

1. Types in `shared/contract.ts` (and validator in `shared/compose.ts` if the input is shared with the UI).
2. Repository function (Supabase, scoped by `appId`) or service function.
3. Route in `server/app.ts`: `requireProject`, parse/validate input, `c.json(x satisfies Type)`.
4. Method in `src/api/dashboardApi.ts` (signal for GETs, `body: {}` for bodiless POSTs so the JSON check passes).
5. Feature hook, then view. Loading, error (`Notice`), empty (`StateBlock`) states all handled.
6. Update `README.md` if setup, env vars, or user-visible behavior changed.

## Verify

```sh
pnpm typecheck                     # must be clean
pnpm build                         # UI build
pnpm exec vite build --config vite.server.config.ts   # server bundle (what Docker runs)
```

Smoke the API against `pnpm dev` (port from `DASHBOARD_PORT`, default 5178):

```sh
curl -s -H 'x-dashboard-request: 1' http://127.0.0.1:5178/api/status
```

Don't send real pushes to "all" / platform audiences while testing; use a single token you own.
