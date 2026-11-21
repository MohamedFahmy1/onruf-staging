import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  accountErrorMessage,
  buildAccountFormData,
  confirmOtpVerification,
  contactChanges,
  extractGoogleShortAddress,
  fullPhoneNumber,
  isPhoneChannelAvailable,
  isSaudiCountry,
  isSaudiCountryCode,
  mapSplAddress,
  normalizeSplAddress,
  OTP_TYPES,
  otpRequestBody,
  phoneTargetType,
  selectedCategoryLabels,
  toFormValues,
  unwrapResponse,
} from "./accountUtils.mjs"

const baseline = {
  id: 3,
  providerId: "provider",
  businessAccountUserName: "store",
  businessAccountNameAr: "المتجر",
  businessAccountNameEn: "Store",
  businessAccountEmail: "saved@example.com",
  businessAccountPhoneNumber: "566666666",
  phoneCountryCode: "+966",
  registrationDocumentType: "CommercialRegister",
  registrationNumberExpiryDate: "2026-07-25",
  vatNumber: "310123456700003",
  isVatRegistered: false,
  categoryIds: [4, 7],
  businessAccountImage: "https://example.com/logo.jpg",
  businessAccountCertificates: [{ id: 1, certificate: "https://example.com/document.pdf", documentType: 2 }],
  fieldStatuses: [{ field: "name", status: "Approved" }],
  createdBy: "admin",
  shortAddress: null,
}

test("category labels match saved numeric/string IDs in order without selecting the full lookup list", () => {
  const ids = ["287", 275, 999]
  const categories = [
    { id: 275, name: " Listing " },
    { id: "287", name: "Real estate" },
    { id: 300, name: "Unselected category" },
  ]
  assert.deepEqual(selectedCategoryLabels(ids, categories, "Category"), ["Real estate", "Listing", "Category 999"])
  assert.deepEqual(ids, ["287", 275, 999])
  assert.deepEqual(selectedCategoryLabels([], categories, "Category"), [])
  assert.deepEqual(selectedCategoryLabels(null, categories, "Category"), [])
  assert.deepEqual(selectedCategoryLabels([275], [], "الفئة"), ["الفئة 275"])
})

test("main submission preserves protected values, serializes categories, and excludes response/files", () => {
  const form = buildAccountFormData(baseline, {
    businessAccountNameEn: "Updated store",
    registrationNumberExpiryDate: "2028-01-01",
    registrationDocumentType: "FreelanceCertificate",
    isVatRegistered: true,
    categoryIds: [9],
    id: 99,
    neighborhoodId: "14",
    lat: "24.46663456",
    isSaudiLocation: true,
    businessAccountWebsite: "",
  })
  assert.equal(form.get("Id"), "3")
  assert.equal(form.getAll("BusinessAccountNameEn").length, 1)
  assert.equal(form.get("BusinessAccountNameEn"), "Updated store")
  assert.equal(form.get("BusinessAccountNameAr"), "المتجر")
  assert.equal(form.get("RegistrationDocumentType"), "CommercialRegister")
  assert.equal(form.get("IsVatRegistered"), "false")
  assert.equal(form.get("NeighborhoodId"), "14")
  assert.equal(form.get("Lat"), "24.46663456")
  assert.equal(form.get("IsSaudiLocation"), "true")
  assert.equal(form.get("BusinessAccountWebsite"), "")
  assert.deepEqual(
    [...form.entries()].filter(([key]) => key.startsWith("CategoryIds")),
    [
      ["CategoryIds[0]", "4"],
      ["CategoryIds[1]", "7"],
    ],
  )
  for (const key of [
    "BusinessAccountImage",
    "BusinessAccountCertificates",
    "FieldStatuses",
    "CreatedBy",
    "ShortAddress",
  ]) {
    assert.equal(form.has(key), false)
  }
  assert.equal(form.get("RegistrationNumberExpiryDate"), "2026-07-25")
  assert.throws(() => buildAccountFormData({ ...baseline, categoryIds: [{ id: 1 }] }), /Invalid business category/)
})

test("Saudi location is derived from the selected country code instead of the saved false default", () => {
  const saudi = buildAccountFormData({ ...baseline, isSaudiLocation: false }, { addressCountryCode: "+966" })
  const egypt = buildAccountFormData({ ...baseline, isSaudiLocation: true }, { addressCountryCode: "+20" })
  assert.equal(saudi.get("IsSaudiLocation"), "true")
  assert.equal(egypt.get("IsSaudiLocation"), "false")
  assert.equal(saudi.has("AddressCountryCode"), false)
})

test("main save appends a selected account image while contact-only save ignores it", () => {
  const image = new Blob(["image"], { type: "image/png" })
  const form = buildAccountFormData(baseline, {}, { image })
  const contactForm = buildAccountFormData(
    baseline,
    {},
    { contact: { targetType: OTP_TYPES.email, email: "verified@example.com" } },
  )
  assert.ok(form.get("BusinessAccountImage") instanceof Blob)
  assert.equal(contactForm.has("BusinessAccountImage"), false)
})

test("contact-only save cannot persist unrelated edits or another unverified contact", () => {
  const pending = {
    businessAccountNameEn: "Pending",
    businessAccountPhoneNumber: "511111111",
    shortAddress: "DMAC3768",
  }
  const emailForm = buildAccountFormData(baseline, pending, {
    contact: { targetType: OTP_TYPES.email, email: "verified@example.com" },
  })
  assert.equal(emailForm.get("BusinessAccountEmail"), "verified@example.com")
  assert.equal(emailForm.get("BusinessAccountPhoneNumber"), baseline.businessAccountPhoneNumber)
  assert.equal(emailForm.get("BusinessAccountNameEn"), baseline.businessAccountNameEn)
  assert.equal(emailForm.has("ShortAddress"), false)
  for (const targetType of [OTP_TYPES.sms, OTP_TYPES.whatsapp]) {
    const phoneForm = buildAccountFormData(
      baseline,
      { businessAccountEmail: "unverified@example.com" },
      {
        contact: { targetType, phoneCountryCode: "+966", phoneNumber: "511111111" },
      },
    )
    assert.equal(phoneForm.get("BusinessAccountEmail"), baseline.businessAccountEmail)
    assert.equal(phoneForm.get("PhoneCountryCode"), "+966")
    assert.equal(phoneForm.get("BusinessAccountPhoneNumber"), "511111111")
  }
  assert.equal(baseline.businessAccountEmail, "saved@example.com")
})

test("contact change detection ignores surrounding whitespace and tracks phone country codes", () => {
  assert.deepEqual(contactChanges({ ...baseline }, baseline), { emailChanged: false, phoneChanged: false })
  assert.deepEqual(
    contactChanges(
      {
        businessAccountEmail: " saved@example.com ",
        businessAccountPhoneNumber: "566666666",
        phoneCountryCode: " +966 ",
      },
      baseline,
    ),
    { emailChanged: false, phoneChanged: false },
  )
  assert.deepEqual(
    contactChanges(
      {
        businessAccountEmail: "new@example.com",
        businessAccountPhoneNumber: "566666666",
        phoneCountryCode: "+20",
      },
      baseline,
    ),
    { emailChanged: true, phoneChanged: true },
  )
})

test("address edits update the short address while preserving the saved establishment number", () => {
  const saved = { ...baseline, unifiedNationalEstablishmentNumber: "7001234567", shortAddress: "MAJA7522" }
  const changes = { shortAddress: "DMAC3768", unifiedNationalEstablishmentNumber: "DMAC3768" }
  const form = buildAccountFormData(saved, changes)
  assert.equal(form.get("ShortAddress"), "DMAC3768")
  assert.deepEqual(form.getAll("UnifiedNationalEstablishmentNumber"), ["7001234567"])
  assert.equal(saved.shortAddress, "MAJA7522")

  const contactForm = buildAccountFormData(saved, changes, {
    contact: { targetType: OTP_TYPES.email, email: "verified@example.com" },
  })
  assert.equal(contactForm.get("ShortAddress"), "MAJA7522")
  assert.equal(contactForm.get("UnifiedNationalEstablishmentNumber"), "7001234567")
  assert.equal(
    buildAccountFormData({ ...saved, unifiedNationalEstablishmentNumber: null }, changes).has(
      "UnifiedNationalEstablishmentNumber",
    ),
    false,
  )
})

test("main save rejects changed contacts instead of sending an unverified value", () => {
  for (const values of [
    { businessAccountEmail: "changed@example.com" },
    { businessAccountPhoneNumber: "511111111" },
    { phoneCountryCode: "+20" },
  ])
    assert.throws(() => buildAccountFormData(baseline, values), /Verify and save/)
})

test("form normalization does not modify the server baseline or readonly values", () => {
  const source = { ...baseline, commercialRegistrationName: null, street: "null", freelanceExpiryDate: "2027-01-01" }
  const values = toFormValues(source)
  assert.equal(values.commercialRegistrationName, "")
  assert.equal(values.street, "")
  assert.equal(values.freelanceExpiryDate, "2027-01-01")
  assert.equal(source.commercialRegistrationName, null)
  assert.equal(source.street, "null")
  const dated = { ...baseline, registrationNumberExpiryDate: "2026-07-25T00:00:00" }
  const datedValues = toFormValues(dated)
  assert.equal(datedValues.registrationNumberExpiryDate, "2026-07-25T00:00:00")
  assert.equal(
    buildAccountFormData(dated, datedValues).get("RegistrationNumberExpiryDate"),
    dated.registrationNumberExpiryDate,
  )
  assert.equal(
    buildAccountFormData(dated, { registrationNumberExpiryDate: "2028-01-01" }).get("RegistrationNumberExpiryDate"),
    dated.registrationNumberExpiryDate,
  )
})

test("SPL fixture supports address wrappers and maps CityId to neighborhoodId", () => {
  const requirements = readFileSync(new URL("../../../../documents/edit-account.md", import.meta.url), "utf8")
  const address = [...requirements.matchAll(/```json\r?\n([\s\S]*?)\r?\n```/g)]
    .map((match) => JSON.parse(match[1]))
    .find((value) => value.ShortAddress === "DMAC3768")
  assert.ok(address)
  for (const response of [
    address,
    { data: address },
    { Data: address },
    { data: { Addresses: [address] } },
    { data: { NationalAddress: address, success: true, Message: null } },
  ]) {
    const patch = mapSplAddress(normalizeSplAddress(response))
    assert.equal(patch.neighborhoodId, "14")
    assert.equal(patch.neighborhood, "حي السقيا")
    assert.equal(patch.regionId, "3")
    assert.equal(patch.region, "منطقة المدينة المنورة")
    assert.equal(patch.lat, "24.46663456")
    assert.equal(patch.lon, "39.60021155")
    assert.equal(patch.buildingNumber, "3768")
    assert.equal(patch.zipCode, "42315")
    assert.equal(patch.shortAddress, "DMAC3768")
    assert.equal(Object.hasOwn(patch, "unifiedNationalEstablishmentNumber"), false)
  }
  assert.equal(normalizeSplAddress({ data: { Addresses: [] } }), null)
  assert.equal(normalizeSplAddress({}), null)
  assert.throws(() => normalizeSplAddress({ data: { success: false, statusdescription: "No results" } }))
  assert.equal(Object.hasOwn(mapSplAddress({ DistrictID: "10300014079" }), "neighborhoodId"), false)
  assert.equal(mapSplAddress({ CityId: 14, DistrictID: "10300014079" }).neighborhoodId, "14")
})

test("SPL geocode with no building has no address even when success is true", () => {
  assert.equal(
    normalizeSplAddress({
      status_code: 200,
      status: "Success",
      data: { NationalAddress: null, success: true, Message: { MessageCode: "MSG005" } },
    }),
    null,
  )
  assert.equal(
    normalizeSplAddress({ data: { NationalAddress: { ShortAddress: "DMAC3768", Latitude: null, Longitude: null } } })
      .ShortAddress,
    "DMAC3768",
  )
})

test("Google SPL candidates prefer premise and inspect both short and long legacy/modern values", () => {
  assert.equal(
    extractGoogleShortAddress([
      {
        address_components: [
          { types: ["route"], short_name: "MAJA7522" },
          { types: ["premise"], short_name: "Building", long_name: " dmac3768 " },
        ],
      },
    ]),
    "DMAC3768",
  )
  assert.equal(
    extractGoogleShortAddress([
      { addressComponents: [{ types: ["premise"], shortText: "Building", longText: "DMAC3768" }] },
    ]),
    "DMAC3768",
  )
  assert.equal(
    extractGoogleShortAddress([{ address_components: [{ types: ["street_address"], long_name: "DMAC3768" }] }]),
    "DMAC3768",
  )
})

test("Google reverse results preserve first-result preference and inspect later results when needed", () => {
  const later = { address_components: [{ types: ["premise"], short_name: "MAJA7522" }] }
  assert.equal(extractGoogleShortAddress([{ formatted_address: "DMAC3768, Madinah" }, later]), "DMAC3768")
  assert.equal(extractGoogleShortAddress([{ formatted_address: "Madinah, Saudi Arabia" }, later]), "MAJA7522")
})

test("Google formatted text can contain an SPL candidate but Plus Code fragments are rejected", () => {
  assert.equal(extractGoogleShortAddress([{ formatted_address: "DMAC3768، 3768 جعفر ابن عون" }]), "DMAC3768")
  assert.equal(extractGoogleShortAddress([{ formattedAddress: "3768 Street, dmac3768, Madinah" }]), "DMAC3768")
  for (const formatted_address of ["CFGH2345+67, Madinah", "+DMAC3768", "XDMAC3768", "DMAC37689", "MAJA 7522"]) {
    assert.equal(extractGoogleShortAddress([{ formatted_address }]), "")
  }
  assert.equal(extractGoogleShortAddress([{ plus_code: { global_code: "CFGH2345+67" } }]), "")
})

test("Google extraction rejects ambiguous, non-Saudi, and malformed candidates", () => {
  assert.equal(extractGoogleShortAddress([{ formatted_address: "DMAC3768 or MAJA7522" }]), "")
  assert.equal(
    extractGoogleShortAddress([
      {
        address_components: [
          { types: ["premise"], long_name: "DMAC3768" },
          { types: ["premise"], long_name: "MAJA7522" },
        ],
      },
    ]),
    "",
  )
  assert.equal(
    extractGoogleShortAddress([
      { address_components: [{ types: ["country"], short_name: "EG" }], formatted_address: "DMAC3768" },
    ]),
    "",
  )
  for (const results of [undefined, null, {}, "DMAC3768", [null, false, {}], [{ address_components: {} }]]) {
    assert.equal(extractGoogleShortAddress(results), "")
  }
  assert.equal(
    extractGoogleShortAddress([{ address_components: [null, { types: {}, long_name: "DMAC3768" }] }]),
    "DMAC3768",
  )
})

test("API errors are rejected even when HTTP is 200; documented string successes remain supported", () => {
  for (const data of [
    { status_code: 400, message: "Invalid" },
    { Status: "Error", Message: "Invalid" },
    { Succeeded: false, Message: "Invalid" },
    { success: false },
    { IsSuccess: false },
    { status: "Success", data: false },
    "Invalid OTP code",
    "رمز التحقق غير صحيح",
    false,
  ])
    assert.throws(() => unwrapResponse({ status: 200, data }))
  assert.throws(() => unwrapResponse({ status: 500, data: "Request failed" }))
  assert.equal(unwrapResponse({ status: 200, data: "OTP verified successfully" }), "OTP verified successfully")
  assert.equal(unwrapResponse({ status: 200, data: { status: "Success", data: 5 } }), 5)
  assert.deepEqual(unwrapResponse({ status: 200, data: { Data: { id: 3 } } }), { id: 3 })
})

test("WhatsApp supports all phone codes while SMS remains Saudi-only and defaults stay consistent", () => {
  assert.equal(isPhoneChannelAvailable("+966", OTP_TYPES.whatsapp), true)
  assert.equal(isPhoneChannelAvailable("00966", OTP_TYPES.whatsapp), true)
  assert.equal(isPhoneChannelAvailable("+20", OTP_TYPES.whatsapp), true)
  assert.equal(isPhoneChannelAvailable("+966", OTP_TYPES.sms), true)
  assert.equal(isPhoneChannelAvailable("00966", OTP_TYPES.sms), true)
  assert.equal(isPhoneChannelAvailable("+20", OTP_TYPES.sms), false)
  assert.equal(isPhoneChannelAvailable("+966", OTP_TYPES.email), false)
  assert.equal(isPhoneChannelAvailable("+966", 99), false)
})

test("Saudi location detection accepts country codes containing 966", () => {
  for (const countryCode of ["+966", "00966", "966", " +966 "]) {
    assert.equal(isSaudiCountryCode(countryCode), true)
    assert.equal(isSaudiCountry({ countryCode }), true)
  }
  for (const countryCode of ["+20", "00971", "", null, undefined]) {
    assert.equal(isSaudiCountryCode(countryCode), false)
    assert.equal(isSaudiCountry({ countryCode }), false)
  }
})

test("email OTP JSON bodies include captured contacts and use nullable fields when a contact is absent", () => {
  assert.deepEqual(
    otpRequestBody({
      targetType: OTP_TYPES.email,
      email: " user@example.com ",
      phoneCountryCode: "+966",
      phoneNumber: "566666666",
    }),
    {
      targetType: "BusinessUserEmailRegistration",
      email: "user@example.com",
      phoneNumber: "566666666",
      phoneCountryCode: "+966",
    },
  )
  assert.deepEqual(otpRequestBody({ targetType: OTP_TYPES.email, email: "user@example.com" }), {
    targetType: "BusinessUserEmailRegistration",
    email: "user@example.com",
    phoneNumber: null,
    phoneCountryCode: null,
  })
  for (const email of ["", "invalid", "invalid@example"]) {
    assert.throws(() => otpRequestBody({ targetType: OTP_TYPES.email, email }), /valid email/)
  }
})

test("mobile OTP JSON bodies include captured email and keep phone and country code separate", () => {
  assert.deepEqual(
    otpRequestBody({
      targetType: OTP_TYPES.whatsapp,
      email: " user@example.com ",
      phoneCountryCode: " +966 ",
      phoneNumber: " 566666666 ",
    }),
    {
      targetType: "BusinessUserWhatsAppRegistration",
      email: "user@example.com",
      phoneNumber: "566666666",
      phoneCountryCode: "+966",
    },
  )
  for (const [targetType, phoneCountryCode] of [
    [OTP_TYPES.sms, "+966"],
    [OTP_TYPES.whatsapp, "+20"],
  ]) {
    assert.deepEqual(
      otpRequestBody({ targetType, phoneCountryCode: ` ${phoneCountryCode} `, phoneNumber: " 1012345678 " }),
      { targetType, email: null, phoneNumber: "1012345678", phoneCountryCode },
    )
  }
  assert.throws(
    () =>
      otpRequestBody({
        targetType: OTP_TYPES.whatsapp,
        email: "user@example.com",
        phoneCountryCode: "+20",
        phoneNumber: "",
      }),
    /valid phone/,
  )
  assert.throws(() => otpRequestBody({ targetType: OTP_TYPES.sms, phoneNumber: "566666666" }), /unavailable/)
  assert.throws(
    () => otpRequestBody({ targetType: OTP_TYPES.sms, phoneCountryCode: "+20", phoneNumber: "1012345678" }),
    /unavailable/,
  )
})

test("account OTP requests reject individual, bank-account, and unknown types", () => {
  for (const targetType of [
    1,
    2,
    3,
    7,
    8,
    99,
    "IndividualUserRegistration",
    "IndividualForgetPassword",
    "IndividualUpdateMoileNumber",
    "BusinessBankAccountChangeSms",
    "BusinessBankAccountChangeWhatsApp",
    undefined,
  ]) {
    assert.throws(() => otpRequestBody({ targetType }), /verification channel/)
    assert.throws(() => buildAccountFormData(baseline, {}, { contact: { targetType } }), /verification channel/)
  }
})

test("default phone channel and full-number validation preserve country codes", () => {
  assert.equal(phoneTargetType("+966"), "BusinessUserSmsRegistration")
  assert.equal(phoneTargetType("00966"), "BusinessUserSmsRegistration")
  assert.equal(phoneTargetType("+20"), "BusinessUserWhatsAppRegistration")
  assert.equal(fullPhoneNumber("+966", "566 666 666"), "+966566666666")
  assert.equal(fullPhoneNumber("+20", "1012345678"), "+201012345678")
  assert.equal(fullPhoneNumber("+20", "+20 1012345678"), "+201012345678")
  assert.equal(fullPhoneNumber("+20", "00201012345678"), "+201012345678")
  assert.throws(() => fullPhoneNumber("+966", "+201012345678"))
  assert.throws(() => fullPhoneNumber("", "566666666"))
})

test("account save errors show server messages or a readable fallback", () => {
  const fallback = "Could not save account"
  for (const data of [{ message: "Save rejected" }, { Message: "Save rejected" }, "Save rejected"]) {
    assert.equal(
      accountErrorMessage({ response: { data }, message: "Request failed with status code 400" }, fallback),
      "Save rejected",
    )
  }
  assert.equal(accountErrorMessage(new Error("Save rejected"), fallback), "Save rejected")
  for (const error of [
    new Error("Request failed with status code 500"),
    { response: { data: "<!DOCTYPE html><html>Error</html>" } },
    { response: { data: { Message: { code: "failed" } } } },
    null,
  ]) {
    assert.equal(accountErrorMessage(error, fallback), fallback)
  }
})

test("OTP verification requires an explicit success before contact saving", () => {
  for (const data of [true, "OTP verified successfully", "تم التحقق بنجاح", { status: "Success", data: true }]) {
    assert.doesNotThrow(() => confirmOtpVerification({ status: 200, data }))
  }
  for (const data of [
    "The code does not match",
    "OTP not verified",
    "OTP verified unsuccessfully",
    "The code has not been verified",
    "OTP has never been verified",
    "",
    null,
    { message: "Check the code" },
    { status: "Success", data: { isValid: false } },
    { status: "Success", data: "Invalid OTP code" },
  ]) {
    assert.throws(() => confirmOtpVerification({ status: 200, data }))
  }
})
