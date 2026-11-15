import axios from "axios"
import { multiFormData } from "../../../common/axiosHeaders"
import {
  buildAccountFormData,
  confirmOtpVerification,
  fullPhoneNumber,
  isPhoneChannelAvailable,
  normalizeSplAddress,
  otpQueryParams,
  unwrapResponse,
} from "./accountUtils.mjs"

export const getAccount = async (id) => {
  const data = unwrapResponse(await axios.get("/GetBusinessAccountById", { params: { businessAccountId: id } }))
  if (!data?.id) throw new Error("Account data is unavailable")
  return data
}

export const getCountries = async (locale) =>
  unwrapResponse(await axios.get("/ListCountryDDL", { params: { lang: locale } }))

export const getCategories = async (locale) => {
  const data = unwrapResponse(await axios.get("/ListAllCategory", { params: { "User-Language": locale } }))
  if (!Array.isArray(data)) throw new Error("Category data is unavailable")
  return data
}

export const getRegions = async (countryId, locale) =>
  unwrapResponse(
    await axios.get("/ListRegionsByCountryIdDDL", {
      params: { countriesIds: countryId, lang: locale, currentPage: 1 },
    }),
  )

export const getNeighborhoods = async (regionId, locale) =>
  unwrapResponse(
    await axios.get("/ListNeighborhoodByRegionIdDDL", {
      params: { regionsIds: regionId, lang: locale, currentPage: 1 },
    }),
  )

export const saveAccount = async (baseline, values, options) =>
  unwrapResponse(
    await axios.post("/AddEditBusinessAccount", buildAccountFormData(baseline, values, options), multiFormData),
  )

const validateTarget = (target) => {
  const type = Number(target?.targetType)
  if (type === 1) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target.email || "")) throw new Error("Enter a valid email address")
  } else if ([2, 3].includes(type)) {
    if (!isPhoneChannelAvailable(target.phoneCountryCode, type))
      throw new Error("This channel is unavailable for this phone number")
    fullPhoneNumber(target.phoneCountryCode, target.phoneNumber)
  } else {
    throw new Error("Choose a verification channel")
  }
  return type
}

export const generateOtp = async (target, userName) => {
  validateTarget(target)
  const contactParams = otpQueryParams(target)
  return unwrapResponse(
    await axios.post("/ValidateBusinessUserAndGenerateOtp", null, {
      params: { userName, ...contactParams },
    }),
  )
}

export const verifyOtp = async (target, otpCode) => {
  const targetType = validateTarget(target)
  if (!/^\d{4}$/.test(otpCode)) throw new Error("Enter the four-digit verification code")
  return confirmOtpVerification(
    await axios.post("/VerifyBusinessAccountOtp", null, {
      params: {
        targetType,
        email: target.email?.trim() || "",
        phoneNumber: target.phoneNumber?.trim() || "",
        PhoneCountryCode: target.phoneCountryCode?.trim() || "",
        otpCode,
      },
    }),
  )
}

export const lookupSpl = async ({ shortAddress, lat, lng, locale }) => {
  let code = String(shortAddress || "")
    .trim()
    .toUpperCase()
  const params = { lang: locale === "ar" ? "ar" : "E" }
  if (!code) {
    if (
      lat == null ||
      lng == null ||
      String(lat).trim() === "" ||
      String(lng).trim() === "" ||
      !Number.isFinite(Number(lat)) ||
      !Number.isFinite(Number(lng)) ||
      Math.abs(Number(lat)) > 90 ||
      Math.abs(Number(lng)) > 180
    )
      throw new Error("Select a valid location")
    const result = unwrapResponse(
      await axios.get("/spl-integration/address/geocode", { params: { ...params, lat, lng } }),
    )
    if (result?.Message?.MessageCode === "MSG005") throw new Error("noBuildingAddress")
    code = String(normalizeSplAddress(result)?.ShortAddress || "")
      .trim()
      .toUpperCase()
    if (!code) throw new Error("No address was found")
  }
  if (!/^[A-Z]{4}\d{4}$/.test(code)) throw new Error("Enter a valid national short address")
  const address = normalizeSplAddress(
    unwrapResponse(await axios.get(`/spl-integration/address/short-address/${encodeURIComponent(code)}`, { params })),
  )
  if (
    !address ||
    String(address.ShortAddress || "")
      .trim()
      .toUpperCase() !== code
  )
    throw new Error("No address was found")
  return address
}
