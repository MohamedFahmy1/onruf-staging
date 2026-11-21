import assert from "node:assert/strict"
import { File } from "node:buffer"
import test from "node:test"
import axios from "axios"
import {
  assertBankAccountIsDefault,
  assertCanRemoveBankAccount,
  buildBankAccountFormData,
  getBankAccount,
  hasDefaultAccount,
  listBankAccounts,
  removeBankAccount,
  saveBankAccount,
  unwrapBankResponse,
} from "./bankAccounts.mjs"

const account = {
  id: "7",
  accountNumber: "0012345678901234",
  bankName: "Bank",
  bankHolderName: "Account holder",
  ibanNumber: "SA0012345678901234567890",
  swiftCode: "CODE",
  ibanCertificate: "https://example.com/certificate.pdf",
  isMyFatoorahDepositAccount: false,
}

test("a payout switch succeeds only when the server confirms the selected account as the sole default", () => {
  assert.doesNotThrow(() => assertBankAccountIsDefault([{ ...account, isMyFatoorahDepositAccount: true }], account))
  for (const [accounts, values] of [
    [[account], account],
    [[{ ...account, isMyFatoorahDepositAccount: true }], { ...account, id: 8 }],
    [
      [
        { ...account, isMyFatoorahDepositAccount: true },
        { ...account, id: 8, isMyFatoorahDepositAccount: true },
      ],
      account,
    ],
    [[], undefined],
  ]) {
    assert.throws(() => assertBankAccountIsDefault(accounts, values), { code: "BANK_DEFAULT_CONTRACT" })
  }
})

test("a created payout account is confirmed by bank identifiers even when the server reuses an existing ID", () => {
  const accounts = [
    { ...account, id: 37, isMyFatoorahDepositAccount: true },
    { ...account, id: 36, accountNumber: "0012345678905678" },
    { ...account, id: 34, accountNumber: "0012345678904321" },
  ]
  const values = { ...account, id: undefined, isMyFatoorahDepositAccount: true }
  assert.doesNotThrow(() => assertBankAccountIsDefault(accounts, values))
  assert.doesNotThrow(() =>
    assertBankAccountIsDefault(accounts, { ...values, ibanNumber: values.ibanNumber.toLowerCase() }),
  )
  for (const changed of [
    { accountNumber: "0012345678909999" },
    { ibanNumber: "SA0099999999999999999999" },
    { id: 36 },
  ]) {
    assert.throws(() => assertBankAccountIsDefault(accounts, { ...values, ...changed }), {
      code: "BANK_DEFAULT_CONTRACT",
    })
  }
  assert.throws(() => assertBankAccountIsDefault(accounts, {}), { code: "BANK_DEFAULT_CONTRACT" })
  assert.throws(
    () => assertBankAccountIsDefault([accounts[0], { ...accounts[1], isMyFatoorahDepositAccount: true }], values),
    { code: "BANK_DEFAULT_CONTRACT" },
  )
})

test("multipart bank payload forces type 3, keeps strings and certificate, and excludes card/response fields", () => {
  const form = buildBankAccountFormData({
    ...account,
    paymentAccountType: 1,
    saveForLaterUse: false,
    expiaryDate: "10/2030",
    providerId: "provider",
    isActive: false,
  })
  assert.deepEqual(Object.fromEntries(form), {
    Id: "7",
    AccountNumber: account.accountNumber,
    BankName: account.bankName,
    BankHolderName: account.bankHolderName,
    IbanNumber: account.ibanNumber,
    SwiftCode: account.swiftCode,
    IbanCertificate: account.ibanCertificate,
    PaymentAccountType: "3",
    IsMyFatoorahDepositAccount: "false",
    SaveForLaterUse: "true",
  })
  const create = buildBankAccountFormData({ ...account, id: undefined, isMyFatoorahDepositAccount: true })
  assert.equal(create.has("Id"), false)
  assert.equal(create.get("PaymentAccountType"), "3")
  assert.equal(create.get("IsMyFatoorahDepositAccount"), "true")
})

test("certificate uploads accept real replacement files and reject fabricated files", async () => {
  const file = new File(["certificate data"], "iban.pdf", { type: "application/pdf" })
  const form = buildBankAccountFormData({ ...account, ibanCertificateFile: file })
  assert.equal(form.get("IbanCertificateFile").name, "iban.pdf")
  assert.equal(await form.get("IbanCertificateFile").text(), "certificate data")
  assert.equal(form.get("IbanCertificate"), account.ibanCertificate)
  file.fake = true
  assert.throws(() => buildBankAccountFormData({ ...account, ibanCertificateFile: file }), /valid IBAN/)
  assert.throws(() => buildBankAccountFormData({ ...account, ibanCertificateFile: { name: "iban.pdf" } }), /valid IBAN/)
})

test("default state must be explicit and the active default cannot be removed", () => {
  assert.equal(hasDefaultAccount([]), false)
  assert.equal(hasDefaultAccount([account]), false)
  const selected = { ...account, isMyFatoorahDepositAccount: true }
  assert.equal(hasDefaultAccount([account, selected]), true)
  assert.doesNotThrow(() => assertCanRemoveBankAccount(account))
  assert.throws(() => assertCanRemoveBankAccount(selected), { code: "BANK_DEFAULT_PROTECTED" })
  for (const flag of [undefined, null, "false", "true", 0, 1]) {
    const unknown = { ...account, isMyFatoorahDepositAccount: flag }
    assert.throws(() => hasDefaultAccount([unknown]), { code: "BANK_DEFAULT_CONTRACT" })
    assert.throws(() => assertCanRemoveBankAccount(unknown), { code: "BANK_DEFAULT_CONTRACT" })
    assert.throws(() => buildBankAccountFormData(unknown), { code: "BANK_DEFAULT_CONTRACT" })
  }
})

test("body errors never count as successful HTTP 200 mutations", () => {
  for (const data of [
    { status_code: 400, message: "Declined" },
    { StatusCode: "500", Message: "Declined" },
    { status: 400, title: "Invalid request" },
    { status: "Failure", message: "Declined" },
    { Status: "Error", Message: "Declined" },
    { success: false },
    { IsSuccess: false },
    { Succeeded: false },
    { status: "Success", data: false },
    false,
    "Error: declined",
    "false",
  ])
    assert.throws(() => unwrapBankResponse({ status: 200, data }))
  assert.throws(() => unwrapBankResponse({ status: 500, data: "Server failed" }), /Server failed/)
  assert.equal(unwrapBankResponse({ status: 204 }), undefined)
  assert.equal(unwrapBankResponse({ status: 200, data: "Saved successfully" }), "Saved successfully")
  assert.deepEqual(unwrapBankResponse({ status: 200, data: { Data: account } }), account)
  assert.deepEqual(unwrapBankResponse({ status: 200, data: account }), account)
})

test("API calls use existing endpoints; invalid responses and IDs fail closed", async (t) => {
  const requests = []
  t.mock.method(axios, "get", async (url, config) => {
    requests.push({ url, config })
    return {
      status: 200,
      data: { status: "Success", data: url === "/BankTransfersList" ? [account] : { bankName: "Detail" } },
    }
  })
  assert.deepEqual(await listBankAccounts(), [account])
  assert.deepEqual(requests[0], { url: "/BankTransfersList", config: undefined })
  assert.deepEqual(await getBankAccount("7"), { bankName: "Detail", id: "7" })
  assert.deepEqual(requests[1], { url: "/GetBankTransferById", config: { params: { id: "7" } } })
  for (const id of [undefined, null, "", 0, -1, "abc", "1.5", true, [7]]) {
    await assert.rejects(getBankAccount(id), /valid bank account ID/)
    await assert.rejects(removeBankAccount(id), /valid bank account ID/)
  }
  axios.get.mock.mockImplementation(async () => ({ status: 200, data: { data: [{ id: 7 }] } }))
  await assert.rejects(listBankAccounts(), { code: "BANK_DEFAULT_CONTRACT" })
  axios.get.mock.mockImplementation(async () => ({ status: 200, data: { data: null } }))
  await assert.rejects(listBankAccounts(), { code: "BANK_DEFAULT_CONTRACT" })
  await assert.rejects(getBankAccount(7), { code: "BANK_ACCOUNT_CONTRACT" })
})

test("create, edit, and delete inspect response envelopes without changing account state", async (t) => {
  const requests = []
  for (const method of ["post", "put", "delete"]) {
    t.mock.method(axios, method, async (...args) => {
      requests.push({ method, args })
      return { status: 200, data: { status: "Success", data: 7 } }
    })
  }
  assert.equal(await saveBankAccount({ ...account, id: undefined }), 7)
  assert.equal(requests[0].method, "post")
  assert.equal(requests[0].args[0], "/AddBankTransfer")
  assert.equal(requests[0].args[1].get("PaymentAccountType"), "3")
  assert.equal(await saveBankAccount({ ...account, isMyFatoorahDepositAccount: true }), 7)
  assert.equal(requests[1].method, "put")
  assert.equal(requests[1].args[0], "/EditBankTransfer")
  assert.equal(requests[1].args[1].get("Id"), "7")
  assert.equal(requests[1].args[1].get("PaymentAccountType"), "3")
  assert.equal(requests[1].args[1].get("IsMyFatoorahDepositAccount"), "true")
  assert.deepEqual(requests[1].args[2], { headers: { "Content-Type": "multipart/form-data" } })
  assert.equal(await removeBankAccount("7"), 7)
  assert.deepEqual(requests[2], { method: "delete", args: ["/RemoveBankTransfer", { params: { id: "7" } }] })
  axios.put.mock.mockImplementation(async () => ({ status: 200, data: { status_code: 400, message: "Rejected" } }))
  await assert.rejects(saveBankAccount(account), /Rejected/)
  assert.equal(account.isMyFatoorahDepositAccount, false)
})
