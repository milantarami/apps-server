---
name: expo-push-service
description: Expo Push Service contract and delivery semantics (send endpoint, tickets, receipts, error codes, limits, retries, FCM/APNs behavior). Use before changing server/expoPush.ts or server/pushService.ts, adding message fields (badge, ttl, subtitle, categoryId, mutableContent, etc.), handling DeviceNotRegistered/MessageRateExceeded, debugging "sent but never arrived", or answering questions about push delivery, receipts or token cleanup.
---

# Expo Push Service

`server/expoPush.ts` was written without live docs. When behavior is in doubt, check the current docs
(https://docs.expo.dev/push-notifications/sending-notifications/) with WebFetch before changing code, and prefer a
real single-token test send over assumptions.

## Endpoints

- `POST https://exp.host/--/api/v2/push/send`: body is one message or an array of **≤100** messages.
  Response `{ data: Ticket[] }` in the same order as the input, or `{ errors: [{ code, message }] }` for a
  request-level failure.
- `POST https://exp.host/--/api/v2/push/getReceipts`: body `{ ids: string[] }`, **≤1000** ids.
  Response `{ data: { [ticketId]: Receipt } }`. Missing ids mean "not ready yet" (pending), not failure.
- Headers: `Content-Type: application/json`, `Accept: application/json`, `Accept-Encoding: gzip, deflate`, and
  `Authorization: Bearer <EXPO_ACCESS_TOKEN>` only when the Expo project has enhanced push security on.

## Tickets vs receipts

- **Ticket** = Expo accepted the message: `{ status: "ok", id }` or `{ status: "error", message, details: { error } }`.
  An `ok` ticket does not mean the device got it.
- **Receipt** = what FCM/APNs said: `{ status: "ok" }` or error with `details.error`. Receipts appear after a short
  delay and are kept about a day, so check within that window. Expo recommends waiting ~15 minutes; this dashboard
  auto-checks after 15 s and offers a manual re-check, so "pending" is normal on the first check.
- An `ok` receipt still doesn't prove display: the OS can drop or hide it (channel muted, Focus, battery saver,
  notifications off).

## Error codes (details.error)

| Code | Where | Action |
| --- | --- | --- |
| `DeviceNotRegistered` | ticket or receipt | Disable the token (already done: `disableTokens`). Don't retry. |
| `MessageTooBig` | ticket | Payload > 4096 bytes. Shrink `data`; `validateMessage` caps it at `PAYLOAD_BUDGET_BYTES` (3800) in `shared/compose.ts`. |
| `MessageRateExceeded` | receipt | Too many to one device. Back off; don't resend immediately. |
| `MismatchSenderId` / `InvalidCredentials` | receipt | FCM/APNs credentials in the Expo project are wrong. Config issue, not code. |
| `RequestFailed` | ours | Synthetic code from `sendPushMessages` when a whole chunk failed (network, 5xx, bad response). |

Request-level `errors[].code` values include `TOO_MANY_REQUESTS` (429), `PUSH_TOO_MANY_EXPERIENCE_IDS` (tokens from
different Expo projects in one request: split by project), `PUSH_TOO_MANY_NOTIFICATIONS`, `PUSH_TOO_MANY_RECEIPTS`.

## Rules for changes

- Retry only 429 and 5xx/network, with backoff (current: 3 attempts, exponential). Never retry 4xx.
- Keep ticket ↔ token alignment by index; a whole failed chunk must still yield one ticket per message.
- Never resend automatically after a partial failure: a retry can double-deliver to the devices that succeeded.
- Map `details.expoPushToken` when present, else the token at that index, before disabling.
- Message fields in use: `to, title, body, data, sound ("default" | null), channelId, priority`. Android needs
  `channelId` to match a channel the app created (`ANDROID_CHANNELS` in `shared/compose.ts`); an unknown channel
  falls back to a default channel or is dropped depending on the OS version.
- Deep links ride in `data` (`buildPushData`); the app only opens routes in `shared/routes.ts`.
- Valid token shape: `ExponentPushToken[…]` or `ExpoPushToken[…]` (`isValidToken`).
