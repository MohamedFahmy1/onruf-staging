import axios from "axios"

const contractError = (message, code = "BANK_DEFAULT_CONTRACT") => Object.assign(new Error(message), { code })

const requireDefaultFlag = (account) => {
  if (typeof account?.isMyFatoorahDepositAccount !== "boolean") {
    throw contractError("The bank account response must include its MyFatoorah default status.")
  }
}

const requireAccountId = (id) => {
  if (!["string", "number"].includes(typeof id) || id === "" || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
    throw new Error("A valid bank account ID is required.")
  }
}

export const unwrapBankResponse = (response) => {
  const payload = response?.data
  const status = payload?.status ?? payload?.Status
  const statusCode = payload?.status_code ?? payload?.statusCode ?? payload?.StatusCode
  if (Number(response?.status) >= 400 || Number(statusCode) >= 400 || Number(status) >= 400 || status === false) {
    const error = new Error(
      (typeof payload === "string" ? payload : payload?.message || payload?.Message || payload?.title) ||
        "The bank account request failed.",
    )
    error.response = response
    throw error
  }
  const data =
    payload && typeof payload === "object"
      ? Object.hasOwn(payload, "data")
        ? payload.data
        : Object.hasOwn(payload, "Data")
        ? payload.Data
        : payload
      : payload
  if (data === false) throw new Error(payload?.message || "The bank account request failed.")
  return data
}

export const listBankAccounts = async () => {
  const accounts = unwrapBankResponse(await axios.get("/BankTransfersList"))
  if (!Array.isArray(accounts)) throw contractError("The bank account list response is invalid.")
  accounts.forEach(requireDefaultFlag)
  return accounts
}

export const getBankAccount = async (id) => {
  requireAccountId(id)
  const account = unwrapBankResponse(await axios.get("/GetBankTransferById", { params: { id } }))
  if (!account || typeof account !== "object" || Array.isArray(account)) {
    throw contractError("The bank account detail response is invalid.", "BANK_ACCOUNT_CONTRACT")
  }
  return { ...account, id }
}

export const buildBankAccountFormData = (values) => {
  requireDefaultFlag(values)
  const form = new FormData()
  if (values.id != null && values.id !== "") {
    requireAccountId(values.id)
    form.append("Id", values.id)
  }
  for (const [field, key] of Object.entries({
    accountNumber: "AccountNumber",
    bankName: "BankName",
    bankHolderName: "BankHolderName",
    ibanNumber: "IbanNumber",
    swiftCode: "SwiftCode",
    ibanCertificate: "IbanCertificate",
  })) {
    if (values[field] != null) form.append(key, values[field])
  }
  const file = values.ibanCertificateFile
  if (file != null) {
    if (!(file instanceof Blob) || file.fake) throw new Error("Select a valid IBAN certificate file.")
    form.append("IbanCertificateFile", file, file.name || "certificate")
  }
  form.append("PaymentAccountType", "3")
  form.append("IsMyFatoorahDepositAccount", String(values.isMyFatoorahDepositAccount))
  form.append("SaveForLaterUse", "true")
  return form
}

export const saveBankAccount = async (values) => {
  const form = buildBankAccountFormData(values)
  const config = { headers: { "Content-Type": "multipart/form-data" } }
  const response = form.has("Id")
    ? await axios.put("/EditBankTransfer", form, config)
    : await axios.post("/AddBankTransfer", form, config)
  return unwrapBankResponse(response)
}

export const removeBankAccount = async (id) => {
  requireAccountId(id)
  return unwrapBankResponse(await axios.delete("/RemoveBankTransfer", { params: { id } }))
}

export const hasDefaultAccount = (accounts) => {
  accounts.forEach(requireDefaultFlag)
  return accounts.some((account) => account.isMyFatoorahDepositAccount)
}

export const assertBankAccountIsDefault = (accounts, values) => {
  accounts.forEach(requireDefaultFlag)
  const defaults = accounts.filter((account) => account.isMyFatoorahDepositAccount)
  const selected = defaults[0]
  const matches =
    values?.id != null
      ? selected && String(selected.id) === String(values.id)
      : values?.accountNumber &&
        values?.ibanNumber &&
        selected?.accountNumber === values.accountNumber &&
        selected?.ibanNumber?.toUpperCase() === values.ibanNumber.toUpperCase()
  if (defaults.length !== 1 || !matches) {
    throw contractError("The server did not confirm the selected payout account.")
  }
}

export const assertCanRemoveBankAccount = (account) => {
  requireDefaultFlag(account)
  if (account.isMyFatoorahDepositAccount) {
    throw contractError(
      "Select another MyFatoorah default account before removing this account.",
      "BANK_DEFAULT_PROTECTED",
    )
  }
}
