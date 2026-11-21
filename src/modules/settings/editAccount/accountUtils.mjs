export const EDITABLE_FIELDS = [
  "businessAccountNameAr",
  "businessAccountNameEn",
  "businessAccountWebsite",
  "businessAccountFaceBook",
  "businessAccountInstagram",
  "businessAccountTwitter",
  "businessAccountYouTube",
  "businessAccountLinkedIn",
  "businessAccountSnapchat",
  "businessAccountTikTok",
  "businessAccountEmail",
  "businessAccountPhoneNumber",
  "phoneCountryCode",
  "lat",
  "lon",
  "country",
  "countryId",
  "regionId",
  "region",
  "neighborhood",
  "neighborhoodId",
  "zipCode",
  "street",
  "shortAddress",
  "isSaudiLocation",
  "buildingNumber",
]

const CONTACT_FIELDS = ["businessAccountEmail", "businessAccountPhoneNumber", "phoneCountryCode"]
const SCALAR_FIELDS = [
  "id",
  "businessAccountUserName",
  "providerId",
  ...EDITABLE_FIELDS,
  "registrationDocumentType",
  "detailRegistrationNumber",
  "registrationNumberExpiryDate",
  "unifiedNationalEstablishmentNumber",
  "vatNumber",
  "maroof",
  "district",
  "trade15Years",
  "registrationStatus",
  "commercialRegistrationAnnualConfirmationDate",
  "commercialRegistrationName",
  "representativeFullName",
  "representativeNationalIdNumber",
  "representativeNationalIdExpiryDate",
  "representativeRelationshipToBusiness",
  "freelanceCertificateNationalIdNumber",
  "isVatRegistered",
  "fetchFromSpl",
]

const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key)
const inputValue = (value) => (value == null || value === "null" ? "" : value)
const contactValue = (value) => String(inputValue(value)).trim()

export const OTP_TYPES = {
  email: "BusinessUserEmailRegistration",
  sms: "BusinessUserSmsRegistration",
  whatsapp: "BusinessUserWhatsAppRegistration",
}

export const toFormValues = (account) =>
  Object.fromEntries(Object.entries(account || {}).map(([key, value]) => [key, inputValue(value)]))

export const contactChanges = (values = {}, baseline = {}) => ({
  emailChanged: contactValue(values.businessAccountEmail) !== contactValue(baseline.businessAccountEmail),
  phoneChanged:
    contactValue(values.businessAccountPhoneNumber) !== contactValue(baseline.businessAccountPhoneNumber) ||
    contactValue(values.phoneCountryCode) !== contactValue(baseline.phoneCountryCode),
})

export const selectedCategoryLabels = (categoryIds, categories, fallbackLabel) => {
  const names = new Map(
    (Array.isArray(categories) ? categories : [])
      .filter((category) => category?.id != null && typeof category.name === "string")
      .map((category) => [String(category.id), category.name.trim()]),
  )
  return (Array.isArray(categoryIds) ? categoryIds : []).map((id) => names.get(String(id)) || `${fallbackLabel} ${id}`)
}

export const phoneTargetType = (countryCode) =>
  String(countryCode || "")
    .replace(/\D/g, "")
    .replace(/^00/, "") === "966"
    ? OTP_TYPES.sms
    : OTP_TYPES.whatsapp

export const isSaudiCountryCode = (countryCode) =>
  String(countryCode || "")
    .replace(/\D/g, "")
    .includes("966")

export const isSaudiCountry = (country) => isSaudiCountryCode(country?.countryCode)

export const isPhoneChannelAvailable = (countryCode, targetType) =>
  targetType === OTP_TYPES.whatsapp || (targetType === OTP_TYPES.sms && phoneTargetType(countryCode) === OTP_TYPES.sms)

export const fullPhoneNumber = (countryCode, phoneNumber) => {
  const code = String(countryCode || "")
    .replace(/\D/g, "")
    .replace(/^00/, "")
  const number = String(phoneNumber || "").replace(/[\s().-]/g, "")
  if (!code || !/^\+?\d+$/.test(number)) throw new Error("Enter a valid phone number and country code")
  const full = number.startsWith("+") ? number : number.startsWith("00") ? `+${number.slice(2)}` : `+${code}${number}`
  if (!full.startsWith(`+${code}`) || !/^\+\d{5,15}$/.test(full)) {
    throw new Error("The phone number must match its country code")
  }
  return full
}

export const otpRequestBody = (target) => {
  const targetType = target?.targetType
  const email = contactValue(target?.email)
  const phoneCountryCode = contactValue(target?.phoneCountryCode)
  const phoneNumber = contactValue(target?.phoneNumber)
  if (targetType === OTP_TYPES.email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address")
  } else if ([OTP_TYPES.sms, OTP_TYPES.whatsapp].includes(targetType)) {
    if (!isPhoneChannelAvailable(phoneCountryCode, targetType))
      throw new Error("This channel is unavailable for this phone number")
    fullPhoneNumber(phoneCountryCode, phoneNumber)
  } else {
    throw new Error("Choose a verification channel")
  }
  return {
    targetType,
    email: email || null,
    phoneNumber: phoneNumber || null,
    phoneCountryCode: phoneCountryCode || null,
  }
}

export const buildAccountFormData = (baseline, values = {}, { contact, image } = {}) => {
  if (!baseline?.id) throw new Error("A business account is required")
  const account = { ...baseline }
  if (contact) {
    if (contact.targetType === OTP_TYPES.email) {
      account.businessAccountEmail = contactValue(contact.email)
    } else if ([OTP_TYPES.sms, OTP_TYPES.whatsapp].includes(contact.targetType)) {
      account.businessAccountPhoneNumber = contactValue(contact.phoneNumber)
      account.phoneCountryCode = contactValue(contact.phoneCountryCode)
    } else {
      throw new Error("Choose a verification channel")
    }
  } else {
    if (CONTACT_FIELDS.some((key) => has(values, key) && contactValue(values[key]) !== contactValue(baseline[key]))) {
      throw new Error("Verify and save changed contact details first")
    }
    EDITABLE_FIELDS.filter((key) => !CONTACT_FIELDS.includes(key)).forEach((key) => {
      if (has(values, key)) account[key] = values[key]
    })
    if (has(values, "addressCountryCode")) {
      account.isSaudiLocation = isSaudiCountryCode(values.addressCountryCode)
    }
  }

  const form = new FormData()
  SCALAR_FIELDS.forEach((key) => {
    const value = account[key]
    if (value == null || value === "null") return
    if (!["string", "number", "boolean"].includes(typeof value)) {
      throw new Error(`Invalid account field: ${key}`)
    }
    form.append(key[0].toUpperCase() + key.slice(1), String(value))
  })
  ;(Array.isArray(baseline.categoryIds) ? baseline.categoryIds : []).forEach((id, index) => {
    if (!/^\d+$/.test(String(id))) throw new Error("Invalid business category")
    form.append(`CategoryIds[${index}]`, String(id))
  })
  if (image) {
    if (!(image instanceof Blob)) throw new Error("Invalid account image")
    form.append("BusinessAccountImage", image)
  }
  return form
}

const failureText =
  /\b(error|failed|failure|invalid|incorrect|expired|unauthori[sz]ed|forbidden|exception|unsuccessful(?:ly)?|not verified|not valid|does not match)\b|فشل|خطأ|غير صحيح|غير صالح|منتهي|لم يتم/i

export const accountErrorMessage = (error, fallback) => {
  const body = error?.response?.data
  const message = body?.message || body?.Message || (typeof body === "string" ? body : error?.message)
  return typeof message === "string" && message && !/^Request failed with status code|<(!DOCTYPE|html)/i.test(message)
    ? message
    : fallback
}

const responseError = (response, payload) => {
  const error = new Error(
    typeof payload === "string"
      ? payload
      : payload?.message || payload?.Message || "The request could not be completed",
  )
  error.response = response
  return error
}

export const unwrapResponse = (response) => {
  const payload = response?.data
  const status = payload?.status ?? payload?.Status
  const statusCode = payload?.status_code ?? payload?.statusCode ?? payload?.StatusCode
  const failed =
    Number(response?.status) >= 400 ||
    Number(statusCode) >= 400 ||
    status === false ||
    /^(error|fail(?:ed|ure)?|exception|exeption|unauthorized|forbidden|invalid)$/i.test(String(status || "")) ||
    payload?.success === false ||
    payload?.Success === false ||
    payload?.isSuccess === false ||
    payload?.IsSuccess === false ||
    payload?.succeeded === false ||
    payload?.Succeeded === false ||
    payload?.isValid === false ||
    payload?.verified === false ||
    payload === false ||
    (typeof payload === "string" && (payload.trim().toLowerCase() === "false" || failureText.test(payload)))
  if (failed) throw responseError(response, payload)
  const data =
    payload && typeof payload === "object"
      ? has(payload, "data")
        ? payload.data
        : has(payload, "Data")
        ? payload.Data
        : payload
      : payload
  if (data === false) throw responseError(response, payload)
  return data
}

export const confirmOtpVerification = (response) => {
  const data = unwrapResponse(response)
  const payload = response?.data
  unwrapResponse({ data })
  const confirmed =
    data === true ||
    data?.isValid === true ||
    data?.verified === true ||
    payload?.Succeeded === true ||
    payload?.success === true ||
    /^success$/i.test(String(payload?.status ?? payload?.Status ?? "")) ||
    (typeof data === "string" &&
      /^(?:(?:otp |code |email |phone(?: number)? |mobile(?: number)? |account )?(?:verified|activated|confirmed)(?: successfully)?|verification successful|true|ok|success)[.!]?$|^تم (?:التحقق|التفعيل|التأكيد) بنجاح[.!]?$/i.test(
        data.trim(),
      ))
  if (!confirmed) throw new Error("The verification response did not confirm success")
  return data
}

export const extractGoogleShortAddress = (results = []) => {
  const hasType = (component, type) => Array.isArray(component.types) && component.types.includes(type)
  const componentCodes = (components) =>
    components
      .flatMap((component) => [component.short_name, component.shortText, component.long_name, component.longText])
      .filter((value) => typeof value === "string" && /^[A-Z]{4}\d{4}$/i.test(value.trim()))
      .map((value) => value.trim().toUpperCase())

  for (const result of Array.isArray(results) ? results : []) {
    if (!result || typeof result !== "object") continue
    const components = (
      Array.isArray(result.address_components)
        ? result.address_components
        : Array.isArray(result.addressComponents)
        ? result.addressComponents
        : []
    ).filter((component) => component && typeof component === "object")
    const country = components.find((component) => hasType(component, "country"))
    const countryCode = String(country?.short_name || country?.shortText || "")
      .trim()
      .toUpperCase()
    if (countryCode && countryCode !== "SA") continue

    // shortcut: Google text is unstable; validate with SPL and revisit if a dedicated SPL field becomes available.
    const formatted = result.formatted_address || result.formattedAddress || ""
    const textCodes =
      typeof formatted === "string"
        ? [...formatted.matchAll(/(?:^|[^A-Z0-9+])([A-Z]{4}\d{4})(?=$|[^A-Z0-9+])/gi)].map((match) =>
            match[1].toUpperCase(),
          )
        : []
    for (const candidates of [
      componentCodes(components.filter((component) => hasType(component, "premise"))),
      componentCodes(components),
      textCodes,
    ]) {
      const codes = [...new Set(candidates)]
      if (codes.length) return codes.length === 1 ? codes[0] : ""
    }
  }
  return ""
}

export const normalizeSplAddress = (payload) => {
  let data = payload
  for (let depth = 0; depth < 3; depth += 1) {
    const unwrapped = unwrapResponse({ data })
    if (unwrapped === data) break
    data = unwrapped
  }
  if (data && has(data, "NationalAddress")) data = data.NationalAddress
  if (Array.isArray(data?.Addresses)) data = data.Addresses[0]
  if (Array.isArray(data)) data = data[0]
  return data && typeof data === "object" && (data.ShortAddress || (data.Latitude != null && data.Longitude != null))
    ? data
    : null
}

export const mapSplAddress = (address) => {
  if (!address) throw new Error("No address was found")
  const fields = {
    Latitude: "lat",
    Longitude: "lon",
    ShortAddress: "shortAddress",
    RegionId: "regionId",
    RegionName: "region",
    CityId: "neighborhoodId",
    District: "neighborhood",
    PostCode: "zipCode",
    BuildingNumber: "buildingNumber",
    Street: "street",
  }
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([key]) => address[key] != null)
      .map(([key, field]) => [field, String(address[key])]),
  )
}
