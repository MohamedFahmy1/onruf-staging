import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import axios from "axios"
import { generateOtp, verifyOtp } from "./api.js"
import { OTP_TYPES } from "./accountUtils.mjs"

const originalAdapter = axios.defaults.adapter
const contacts = { email: "user@example.com", phoneNumber: "566666666", phoneCountryCode: "+966" }

afterEach(() => {
  axios.defaults.adapter = originalAdapter
})

for (const [channel, targetType, phoneCountryCode, expectedType] of [
  ["email", OTP_TYPES.email, "+966", "BusinessUserEmailRegistration"],
  ["SMS", OTP_TYPES.sms, "+966", "BusinessUserSmsRegistration"],
  ["Saudi WhatsApp", OTP_TYPES.whatsapp, "+966", "BusinessUserWhatsAppRegistration"],
  ["international WhatsApp", OTP_TYPES.whatsapp, "+20", "BusinessUserWhatsAppRegistration"],
]) {
  test(`${channel} send, resend, and verification serialize the documented JSON body without query parameters`, async () => {
    const requests = []
    axios.defaults.adapter = async (config) => {
      assert.equal(config.method, "post")
      assert.equal(config.params, undefined)
      assert.equal(config.headers["Content-Type"], "application/json")
      requests.push({ url: config.url, body: JSON.parse(config.data) })
      return { status: 200, data: { status: "Success", data: true } }
    }
    const target = { ...contacts, targetType, phoneCountryCode: ` ${phoneCountryCode} ` }
    await generateOtp(target, " store ")
    await generateOtp(target, "store")
    await verifyOtp(target, "0123")

    const body = { ...contacts, phoneCountryCode, targetType: expectedType }
    assert.deepEqual(requests, [
      { url: "/ValidateBusinessUserAndGenerateOtp", body: { userName: "store", ...body } },
      { url: "/ValidateBusinessUserAndGenerateOtp", body: { userName: "store", ...body } },
      { url: "/VerifyBusinessAccountOtp", body: { ...body, otpCode: "0123" } },
    ])
  })
}

test("invalid targets and verification codes fail before sending a request", async () => {
  let requests = 0
  axios.defaults.adapter = async () => {
    requests += 1
    return { status: 200, data: true }
  }
  for (const userName of [undefined, "", " "]) {
    await assert.rejects(generateOtp({ ...contacts, targetType: OTP_TYPES.email }, userName), /username/)
  }
  for (const target of [
    { ...contacts, targetType: OTP_TYPES.email, email: "invalid" },
    { ...contacts, targetType: OTP_TYPES.whatsapp, phoneNumber: "" },
    { ...contacts, targetType: OTP_TYPES.sms, phoneCountryCode: "+20" },
    ...[1, 2, 3, 7, 8, "IndividualUserRegistration", "BusinessBankAccountChangeSms"].map((targetType) => ({
      ...contacts,
      targetType,
    })),
  ]) {
    await assert.rejects(generateOtp(target, "store"))
    await assert.rejects(verifyOtp(target, "0123"))
  }
  for (const otpCode of ["", "123", "12345", "abcd"]) {
    await assert.rejects(verifyOtp({ ...contacts, targetType: OTP_TYPES.email }, otpCode), /four-digit/)
  }
  assert.equal(requests, 0)
})

test("OTP APIs retain body-level errors and require verification success", async () => {
  const target = { ...contacts, targetType: OTP_TYPES.email }
  axios.defaults.adapter = async () => ({ status: 200, data: { status_code: 400, message: "OTP rejected" } })
  await assert.rejects(generateOtp(target, "store"), /OTP rejected/)
  await assert.rejects(verifyOtp(target, "0123"), /OTP rejected/)

  axios.defaults.adapter = async () => ({ status: 200, data: "Invalid OTP code" })
  await assert.rejects(verifyOtp(target, "0123"), /Invalid OTP code/)
  axios.defaults.adapter = async () => ({ status: 200, data: "" })
  await assert.rejects(verifyOtp(target, "0123"), /did not confirm success/)
  axios.defaults.adapter = async () => ({ status: 200, data: "OTP verified successfully" })
  assert.equal(await verifyOtp(target, "0123"), "OTP verified successfully")
})

test("OTP APIs preserve HTTP and network failures", async () => {
  const target = { ...contacts, targetType: OTP_TYPES.email }
  for (const failure of [
    new Error("Network Error"),
    ...[400, 500].map((status) =>
      Object.assign(new Error(`Request failed with status code ${status}`), { response: { status } }),
    ),
  ]) {
    axios.defaults.adapter = async () => {
      throw failure
    }
    await assert.rejects(generateOtp(target, "store"), (error) => error === failure)
    await assert.rejects(verifyOtp(target, "0123"), (error) => error === failure)
  }
})
