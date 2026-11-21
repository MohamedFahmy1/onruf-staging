import assert from "node:assert/strict"
import { File } from "node:buffer"
import { afterEach, test } from "node:test"
import axios from "axios"
import { otpRequestBody, OTP_TYPES } from "../editAccount/accountUtils.mjs"
import {
  BANK_OTP_TYPES,
  createBankVerification,
  generateBankOtp,
  isBankVerificationCurrent,
  verifyBankOtp,
} from "./bankVerification.mjs"

const originalAdapter = axios.defaults.adapter
afterEach(() => {
  axios.defaults.adapter = originalAdapter
})
const contacts = { email: "user@example.com", phoneNumber: "566666666", phoneCountryCode: "+966" }

for (const [channel, targetType, phoneCountryCode] of [
  ["SMS", BANK_OTP_TYPES.sms, "+966"],
  ["Saudi WhatsApp", BANK_OTP_TYPES.whatsapp, "+966"],
  ["international WhatsApp", BANK_OTP_TYPES.whatsapp, "+20"],
]) {
  test(`${channel} generates, resends, and verifies with bank enums and captured JSON contacts`, async () => {
    const requests = []
    axios.defaults.adapter = async (config) => {
      assert.equal(config.method, "post")
      assert.equal(config.params, undefined)
      assert.equal(config.headers["Content-Type"], "application/json")
      requests.push({ url: config.url, body: JSON.parse(config.data) })
      return { status: 200, data: { status: "Success", data: true } }
    }
    const target = {
      email: ` ${contacts.email} `,
      phoneNumber: ` ${contacts.phoneNumber} `,
      phoneCountryCode: ` ${phoneCountryCode} `,
      targetType,
    }
    await generateBankOtp(target, " store ")
    await generateBankOtp(target, "store")
    await verifyBankOtp(target, "0123")
    const body = { ...contacts, phoneCountryCode, targetType }
    assert.deepEqual(requests, [
      { url: "/ValidateBusinessUserAndGenerateOtp", body: { userName: "store", ...body } },
      { url: "/ValidateBusinessUserAndGenerateOtp", body: { userName: "store", ...body } },
      { url: "/VerifyBusinessAccountOtp", body: { ...body, otpCode: "0123" } },
    ])
  })
}

test("absent optional email is null and bank types remain rejected by account verification", async () => {
  axios.defaults.adapter = async (config) => {
    assert.deepEqual(JSON.parse(config.data), {
      userName: "store",
      targetType: BANK_OTP_TYPES.sms,
      email: null,
      phoneNumber: contacts.phoneNumber,
      phoneCountryCode: contacts.phoneCountryCode,
    })
    return { status: 200, data: true }
  }
  await generateBankOtp({ ...contacts, email: " ", targetType: BANK_OTP_TYPES.sms }, "store")
  for (const targetType of Object.values(BANK_OTP_TYPES)) {
    assert.throws(() => otpRequestBody({ ...contacts, targetType }), /verification channel/)
  }
})

test("invalid channels, non-Saudi SMS, contacts, usernames, and codes fail before any request", async () => {
  let requests = 0
  axios.defaults.adapter = async () => {
    requests += 1
    return { status: 200, data: true }
  }
  const validTarget = { ...contacts, targetType: BANK_OTP_TYPES.sms }
  for (const userName of [undefined, null, "", " ", 123]) {
    await assert.rejects(generateBankOtp(validTarget, userName), /username/)
  }
  for (const target of [
    { ...validTarget, phoneCountryCode: "+20" },
    { ...validTarget, phoneNumber: "" },
    { ...validTarget, phoneCountryCode: "" },
    ...[undefined, 7, 8, "unknown", OTP_TYPES.email, OTP_TYPES.sms, OTP_TYPES.whatsapp].map((targetType) => ({
      ...contacts,
      targetType,
    })),
  ]) {
    await assert.rejects(generateBankOtp(target, "store"))
    await assert.rejects(verifyBankOtp(target, "0123"))
  }
  for (const code of [undefined, "", "123", "12345", "123456", "abcd", 1234]) {
    await assert.rejects(verifyBankOtp(validTarget, code), /four-digit/)
  }
  assert.equal(requests, 0)
})

test("OTP APIs preserve transport/body failures and require explicit verification success", async () => {
  const target = { ...contacts, targetType: BANK_OTP_TYPES.sms }
  const failure = new Error("Network Error")
  axios.defaults.adapter = async () => {
    throw failure
  }
  await assert.rejects(generateBankOtp(target, "store"), (error) => error === failure)
  await assert.rejects(verifyBankOtp(target, "0123"), (error) => error === failure)
  axios.defaults.adapter = async () => ({ status: 200, data: { status_code: 400, message: "OTP rejected" } })
  await assert.rejects(generateBankOtp(target, "store"), /OTP rejected/)
  await assert.rejects(verifyBankOtp(target, "0123"), /OTP rejected/)
  axios.defaults.adapter = async () => ({ status: 200, data: "Invalid OTP code" })
  await assert.rejects(verifyBankOtp(target, "0123"), /Invalid OTP code/)
  axios.defaults.adapter = async () => ({ status: 200, data: "" })
  await assert.rejects(verifyBankOtp(target, "0123"), /did not confirm success/)
  axios.defaults.adapter = async () => ({ status: 200, data: "OTP verified successfully" })
  assert.equal(await verifyBankOtp(target, "0123"), "OTP verified successfully")
})

const account = {
  id: 3,
  businessAccountUserName: "store",
  businessAccountEmail: contacts.email,
  businessAccountPhoneNumber: contacts.phoneNumber,
  phoneCountryCode: contacts.phoneCountryCode,
}
const bank = {
  id: 7,
  bankName: "Bank",
  accountNumber: "0012345678901234",
  bankHolderName: "Holder",
  ibanNumber: "SA0012345678901234567890",
  swiftCode: "CODE",
  ibanCertificate: "https://example.com/iban.pdf",
  isMyFatoorahDepositAccount: true,
  ibanCertificateFile: null,
}

test("bank verification binds every bank field and captured account/contact identity", () => {
  for (const values of [bank, { ...bank, id: undefined }]) {
    const proof = createBankVerification(values, account, 2000)
    assert.equal(isBankVerificationCurrent(proof, { ...values }, { ...account }, 1000), true)
    for (const field of [
      "id",
      "bankName",
      "accountNumber",
      "bankHolderName",
      "ibanNumber",
      "swiftCode",
      "ibanCertificate",
      "isMyFatoorahDepositAccount",
    ]) {
      assert.equal(
        isBankVerificationCurrent(proof, { ...values, [field]: `changed-${field}` }, account, 1000),
        false,
        field,
      )
    }
    for (const field of Object.keys(account)) {
      assert.equal(
        isBankVerificationCurrent(proof, values, { ...account, [field]: `changed-${field}` }, 1000),
        false,
        field,
      )
    }
  }
})

test("bank verification expires at its deadline and replacement files require identical File identity", () => {
  const firstFile = new File(["iban"], "iban.pdf", { type: "application/pdf" })
  const differentFile = new File(["iban"], "iban.pdf", { type: "application/pdf" })
  const values = { ...bank, ibanCertificateFile: firstFile }
  const proof = createBankVerification(values, account, 2000)
  assert.equal(isBankVerificationCurrent(proof, values, account, 1999), true)
  assert.equal(isBankVerificationCurrent(proof, values, account, 2000), false)
  assert.equal(isBankVerificationCurrent(proof, values, account, 2001), false)
  assert.equal(isBankVerificationCurrent(null, values, account, 1000), false)
  assert.equal(
    isBankVerificationCurrent(proof, { ...values, ibanCertificateFile: differentFile }, account, 1000),
    false,
  )
  assert.equal(isBankVerificationCurrent(proof, { ...values, ibanCertificateFile: null }, account, 1000), false)
  assert.equal(isBankVerificationCurrent(createBankVerification(bank, account, 2000), values, account, 1000), false)
  assert.equal(isBankVerificationCurrent(createBankVerification(bank, account, undefined), bank, account, 1000), false)
})
