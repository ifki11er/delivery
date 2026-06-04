import assert from "node:assert/strict";
import test from "node:test";
import { checkRateLimit, resetRateLimit } from "../src/lib/rate-limit.ts";

test("allows requests until the bucket limit is reached", () => {
  resetRateLimit();

  assert.equal(checkRateLimit({ key: "login:a", limit: 2, windowMs: 1000, now: 0 }).allowed, true);
  assert.equal(checkRateLimit({ key: "login:a", limit: 2, windowMs: 1000, now: 1 }).allowed, true);
  assert.equal(checkRateLimit({ key: "login:a", limit: 2, windowMs: 1000, now: 2 }).allowed, false);
});

test("resets the bucket after the configured window", () => {
  resetRateLimit();

  assert.equal(checkRateLimit({ key: "reset:a", limit: 1, windowMs: 1000, now: 0 }).allowed, true);
  assert.equal(checkRateLimit({ key: "reset:a", limit: 1, windowMs: 1000, now: 999 }).allowed, false);
  assert.equal(checkRateLimit({ key: "reset:a", limit: 1, windowMs: 1000, now: 1000 }).allowed, true);
});

test("isolates buckets by key", () => {
  resetRateLimit();

  assert.equal(checkRateLimit({ key: "ip:1", limit: 1, windowMs: 1000, now: 0 }).allowed, true);
  assert.equal(checkRateLimit({ key: "ip:1", limit: 1, windowMs: 1000, now: 1 }).allowed, false);
  assert.equal(checkRateLimit({ key: "ip:2", limit: 1, windowMs: 1000, now: 1 }).allowed, true);
});
