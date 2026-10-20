import type { MiddlewareHandler } from "hono";
import { createHash, timingSafeEqual } from "node:crypto";
import type { ApiErrorBody } from "../shared/contract.ts";

export const REQUEST_HEADER = "x-dashboard-request";
export const PASSWORD_HEADER = "x-dashboard-password";

const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "localhost", "[::1]"]);

function hostnameOf(hostHeader: string): string {
  if (hostHeader.startsWith("[")) return hostHeader.slice(0, hostHeader.indexOf("]") + 1);
  return hostHeader.split(":")[0];
}

function isLocalOrigin(origin: string): boolean {
  try {
    return LOCAL_HOSTNAMES.has(new URL(origin).hostname);
  } catch {
    return false;
  }
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function passwordMatches(expected: string, given: string | undefined): boolean {
  if (!given) return false;
  return timingSafeEqual(digest(expected), digest(given));
}

function deny(status: 401 | 403, code: ApiErrorBody["code"], error: string): Response {
  return Response.json({ error, code } satisfies ApiErrorBody, { status });
}

// Blocks DNS-rebinding and cross-site requests: a page on another origin cannot set the custom header without CORS.
export function localOnly(): MiddlewareHandler {
  return async (c, next) => {
    const host = c.req.header("host");
    if (!host || !LOCAL_HOSTNAMES.has(hostnameOf(host)))
      return deny(403, "forbidden", "Dashboard only answers on localhost.");
    const origin = c.req.header("origin");
    if (origin && !isLocalOrigin(origin)) return deny(403, "forbidden", "Cross-origin requests are not allowed.");
    const fetchSite = c.req.header("sec-fetch-site");
    if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
      return deny(403, "forbidden", "Cross-site requests are not allowed.");
    }
    if (c.req.header(REQUEST_HEADER) !== "1") return deny(403, "forbidden", "Missing dashboard request header.");
    if (c.req.method !== "GET" && !c.req.header("content-type")?.startsWith("application/json")) {
      return deny(403, "forbidden", "Requests must be JSON.");
    }
    await next();
  };
}

export function passwordGate(getPassword: () => string | null): MiddlewareHandler {
  return async (c, next) => {
    const expected = getPassword();
    if (expected && !passwordMatches(expected, c.req.header(PASSWORD_HEADER))) {
      return deny(401, "unauthorized", "Enter the dashboard password.");
    }
    await next();
  };
}
