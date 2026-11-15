import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import axios from "axios"
import { searchOrdersAndProductsById } from "./api.js"

const originalGet = axios.get
const order = { id: 322, type: "Order", name: "Order 322", createdAt: "2026-11-12T12:00:00Z" }
const product = { id: 322, type: "Product", name: "Product 322", createdAt: null }

afterEach(() => {
  axios.get = originalGet
})

test("requests the documented endpoint with an unchanged string ID and AbortSignal", async () => {
  const controller = new AbortController()
  axios.get = async (url, options) => {
    assert.equal(url, "/SearchOrdersAndProductsById")
    assert.deepEqual(options.params, { number: "00322" })
    assert.equal(options.signal, controller.signal)
    assert.deepEqual(Object.keys(options).sort(), ["params", "signal"])
    return { data: [order] }
  }
  assert.deepEqual(await searchOrdersAndProductsById("00322", controller.signal), [order])
})

test("accepts direct arrays and preserves API order and rows sharing a numeric ID", async () => {
  const items = [product, order]
  axios.get = async () => ({ data: items })
  assert.equal(await searchOrdersAndProductsById("322"), items)
})

test("accepts success envelopes and empty results", async () => {
  for (const payload of [[], { data: [] }, { status_code: 200, status: "Success", data: [order] }]) {
    axios.get = async () => ({ data: payload })
    assert.deepEqual(await searchOrdersAndProductsById("322"), Array.isArray(payload) ? payload : payload.data)
  }
})

test("accepts nullable fields, omitted optional fields, and unknown string types", async () => {
  const items = [
    { id: 1 },
    { id: 2, type: null, name: null, createdAt: null },
    { id: 3, type: "Other", name: "Unknown result", createdAt: "2026-11-12T12:00:00Z" },
  ]
  axios.get = async () => ({ data: items })
  assert.equal(await searchOrdersAndProductsById("3"), items)
})

test("rejects body errors even when HTTP status is 200 and data is an array", async () => {
  for (const payload of [
    { status_code: 400, message: "Invalid ID", data: [] },
    { status_code: "500", message: "Search unavailable", data: [] },
    { status: "Failed", message: "Access denied", data: [] },
    { status_code: 200, status: "Error", message: "Search failed", data: [] },
  ]) {
    const response = { status: 200, data: payload }
    axios.get = async () => response
    await assert.rejects(searchOrdersAndProductsById("322"), (error) => {
      assert.equal(error.message, payload.message)
      assert.equal(error.response, response)
      return true
    })
  }
})

test("rejects malformed payloads and rows instead of showing no results", async () => {
  for (const payload of [
    null,
    "unexpected response",
    {},
    { data: null },
    { data: {} },
    [null],
    [{}],
    [{ id: "322" }],
    [{ id: 1.5 }],
    [{ id: Number.MAX_SAFE_INTEGER + 1 }],
    [{ id: 322, type: {} }],
    [{ id: 322, name: [] }],
    [{ id: 322, createdAt: 123 }],
  ]) {
    const response = { data: payload }
    axios.get = async () => response
    await assert.rejects(searchOrdersAndProductsById("322"), (error) => {
      assert.equal(error.message, "Invalid search response")
      assert.equal(error.response, response)
      return true
    })
  }
})

test("preserves HTTP failures and cancellation errors", async () => {
  for (const error of [new Error("Network Error"), new axios.CanceledError("canceled")]) {
    axios.get = async () => {
      throw error
    }
    await assert.rejects(searchOrdersAndProductsById("322"), (received) => received === error)
  }
})
