import assert from "node:assert/strict"
import test from "node:test"
import { getRemainingTimeParts } from "./offerExpiry.mjs"

const now = new Date("2026-11-22T00:00:00.000Z").getTime()

test("returns every remaining time unit", () => {
  const expireDate = new Date("2026-11-24T03:04:05.000Z")

  assert.deepEqual(getRemainingTimeParts(expireDate, now), [
    { value: 2, unit: "day" },
    { value: 3, unit: "hour" },
    { value: 4, unit: "minute" },
    { value: 5, unit: "second" },
  ])
})

test("hides zero time units", () => {
  const expireDate = new Date("2026-11-22T03:00:05.000Z")

  assert.deepEqual(getRemainingTimeParts(expireDate, now), [
    { value: 3, unit: "hour" },
    { value: 5, unit: "second" },
  ])
})

test("returns no units when expired or invalid", () => {
  assert.deepEqual(getRemainingTimeParts(new Date(now), now), [])
  assert.deepEqual(getRemainingTimeParts(new Date("invalid"), now), [])
})
