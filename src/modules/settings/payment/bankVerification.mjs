import axios from "axios"
import { confirmOtpVerification, OTP_TYPES, otpRequestBody, unwrapResponse } from "../editAccount/accountUtils.mjs"

export const BANK_OTP_TYPES = {
  sms: "BusinessBankAccountChangeSms",
  whatsapp: "BusinessBankAccountChangeWhatsApp",
}

const bankOtpBody = (target) => {
  const type =
    target?.targetType === BANK_OTP_TYPES.sms
      ? OTP_TYPES.sms
      : target?.targetType === BANK_OTP_TYPES.whatsapp
      ? OTP_TYPES.whatsapp
      : null
  if (!type) throw new Error("Choose a bank verification channel")
  return { ...otpRequestBody({ ...target, targetType: type }), targetType: target.targetType }
}

export const generateBankOtp = async (target, userName) => {
  if (typeof userName !== "string" || !userName.trim()) throw new Error("A business username is required")
  return unwrapResponse(
    await axios.post("/ValidateBusinessUserAndGenerateOtp", {
      userName: userName.trim(),
      ...bankOtpBody(target),
    }),
  )
}

export const verifyBankOtp = async (target, otpCode) => {
  if (typeof otpCode !== "string" || !/^\d{4}$/.test(otpCode)) throw new Error("Enter the four-digit verification code")
  return confirmOtpVerification(
    await axios.post("/VerifyBusinessAccountOtp", {
      ...bankOtpBody(target),
      otpCode,
    }),
  )
}

const bankFields = [
  "id",
  "bankName",
  "accountNumber",
  "bankHolderName",
  "ibanNumber",
  "swiftCode",
  "ibanCertificate",
  "isMyFatoorahDepositAccount",
]
const accountFields = [
  "id",
  "businessAccountUserName",
  "businessAccountEmail",
  "businessAccountPhoneNumber",
  "phoneCountryCode",
]
const fingerprint = (values, account) =>
  JSON.stringify([bankFields.map((field) => values[field]), accountFields.map((field) => account[field])])

export const createBankVerification = (values, account, expiresAt) => ({
  fingerprint: fingerprint(values, account),
  file: values.ibanCertificateFile || null,
  expiresAt,
})

export const isBankVerificationCurrent = (proof, values, account, now = Date.now()) =>
  !!proof &&
  Number.isFinite(proof.expiresAt) &&
  now < proof.expiresAt &&
  proof.fingerprint === fingerprint(values, account) &&
  proof.file === (values.ibanCertificateFile || null)
