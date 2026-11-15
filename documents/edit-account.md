# Edit Business Account

## Summary

We need to change business account form that is in route /settings/editAccount/3 completly and have different fields & methods.

The references are public\edit-account\commercial.svg and public\edit-account\freelance.svg. Render the commercial or freelance mode from the account's saved `registrationDocumentType`. The `نوع وسيلة التحقق` field is read-only. Match the form in both SVGs, excluding the header and sidebar, which must retain the shared application styling.

We will get data and submit using the same apis but nows we added more fields will talk about that in details in the apis section.

We will do this screen in both arabic and english.

Not all things will be changed in that form and can be submitted, the things that can be are businessAccountNameAr, businessAccountNameEn, all social media links like businessAccountFaceBook...etc, phoneCountryCode, businessAccountPhoneNumber, businessAccountEmail (after validation with otp will talk about that in apis section), and address values updated by the country selection, map, and SPL lookup (lat, lon, country, countryId, regionId, region, neighborhood, neighborhoodId, zipCode, street, shortAddress, isSaudiLocation & buildingNumber). These API values do not each require a visible editor; display only the controls shown in the SVGs.

Other fields shown in the SVGs remain read-only. Keep response fields absent from the SVGs internal rather than adding visible editors. Existing attachments must not show deletion controls.

Confirmed editing rules:

- The editable field list above takes priority over editable-looking controls in the SVGs. Logo, username, categories, VAT, verification type, identity information, and existing attachments remain read-only, except fields explicitly allowed above.
- Show only fields present in the corresponding SVG. Do not add a `registrationNumberExpiryDate` editor; preserve its saved value unchanged, including expired dates. Keep the commercial annual confirmation date, freelance expiry, and representative identity expiry visible and read-only as drawn.
- Saudi address UI contains the country selector, map search and map, short-address copy badge, four compact summary cells (postcode, building number, street, combined city/neighborhood), and a full-address row. Summary values are display-only. Coordinates, region/neighborhood IDs, and other lookup metadata remain internal; do not add latitude, longitude, region, neighborhood, street, building, or short-address editor fields. For non-Saudi countries retain the existing region/neighborhood dropdowns.
- Match the SVG address row alignment, spacing, panel dimensions, and card order. Use the exact social-link icon artwork from the SVGs, preserving brand colors; website and X/Twitter remain black as drawn.
- Keep input borders grey on focus and use a visible grey keyboard-focus outline; do not introduce orange field-focus styles.
- Existing documents can be previewed or downloaded, but cannot be uploaded, replaced, or deleted from this screen.
- The intended editable address field is `shortAddress`, containing an SPL national short address such as `DMAC3768`. Its earlier identification as `unifiedNationalEstablishmentNumber` was a mistake.
- `unifiedNationalEstablishmentNumber` is a separate business identifier. Display it read-only in commercial verification, exclude it from editable fields, and preserve its saved baseline value in both main and contact-only submissions. Never populate it from a map pin, an SPL address, or an edited `shortAddress`.

## APIS

### Swagger and request contracts

Swagger is available for inspecting endpoint paths, query parameters, multipart fields, enums, and response schemas:

- UI: https://onruf.shop/swagger/index.html
- Business account schema: https://onruf.shop/swagger/BusinessAccount/swagger.json
- Business OTP schema: https://onruf.shop/swagger/BusinessAccount/swagger.json
- SPL/common services schema: https://onruf.shop/swagger/CommonService/swagger.json

Use the application's configured API base URL and existing axios authentication/language headers. Do not hardcode the sample credentials in application code or switch the user's environment files.

### Category names and saved selection

Load the category lookup with GET `/api/v1/ListAllCategory?User-Language=ar`, using the current locale for `User-Language` and retaining the application's existing authentication and language headers. The response envelope's `data` is an array of category objects with `id` and localized `name` fields.

Display only the names matching the account GET response's saved `categoryIds`, in their saved order. Match numeric and string forms of the same ID. Keep the category field read-only, leave it empty for an empty selection, and retain a localized category/ID fallback for IDs absent from the lookup. Reload names when the language changes without resetting pending form edits. Lookup failures must offer retry without preventing country data from loading. Preserve the original `categoryIds` array unchanged in main and contact-only submissions; category names are display values only.

1. We will use the same get & submit apis but now they have additionl fields, their data will look like this:

```js
{
    "id": 3,
    "businessAccountUserName": "hadeer",
    "providerId": "1afa3389-236e-4f8b-bb41-e95cfa9da9ae",
    "businessAccountNameAr": "شركه الاصيل ",
    "businessAccountNameEn": "elaseel company",
    "businessAccountName": "elaseel company",
    "businessAccountEmail": "hadeerabelenien@gmail.com",
    "businessAccountPhoneNumber": "566666666",
    "businessAccountImage": "https://onruf.shop/FilesUpload/BusinessAccount/011caf334f6a4d029ebe3ace81f93727.jpg",
    "businessAccountWebsite": null,
    "businessAccountFaceBook": null,
    "businessAccountInstagram": null,
    "businessAccountTwitter": null,
    "businessAccountYouTube": null,
    "businessAccountLinkedIn": null,
    "businessAccountSnapchat": null,
    "businessAccountTikTok": null,
    "registrationDocumentType": "CommercialRegister",
    "detailRegistrationNumber": "6666666",
    "registrationNumberExpiryDate": "2026-07-25",
    "commercialRegistrationName": null,
    "unifiedNationalEstablishmentNumber": null,
    "commercialRegistrationAnnualConfirmationDate": null,
    "representativeFullName": null,
    "representativeNationalIdNumber": null,
    "representativeNationalIdExpiryDate": null,
    "representativeRelationshipToBusiness": null,
    "freelanceCertificateNationalIdNumber": null,
    "freelanceCertificateId": null,
    "freelanceExpiryDate": null,
    "isVatRegistered": false,
    "vatNumber": "66666",
    "maroof": null,
    "trade15Years": true,
    "businessAccountCertificates": [
        {
            "id": 1,
            "certificate": "https://onruf.shop/images/BusinessAccountCertificates/5af75b8b54bc46b69650bb6912988c96.jpg",
            "documentType": 0
        }
    ],
    "categoryIds": [],
    "country": "Saudi Arabia",
    "region": "Madinah",
    "neighborhood": "Madinah",
    "countryId": 1,
    "regionId": 3,
    "neighborhoodId": 4,
    "district": null,
    "street": null,
    "buildingNumber": null,
    "zipCode": "555",
    "shortAddress": null,
    "lat": null,
    "lon": null,
    "isSaudiLocation": false,
    "isDeleted": false,
    "isActive": true,
    "createdBy": null,
    "createdAt": "2026-07-24T00:09:40.6015849",
    "updatedBy": null,
    "updatedByAt": null,
    "rate": 3,
    "defaultLanguage": "ar",
    "phoneCountryCode": "+966",
    "fieldStatuses": [],
    "registrationStatus": 5,
    "generalComment": null,
    "fetchFromSpl": false
}
```

2. APIs to verify email and mobile phone with OTP

The required target types and channel eligibility are:

| Channel | `targetType` | Availability |
| --- | --- | --- |
| Email | `1` | Email activation |
| SMS | `2` | Saudi phone numbers only (`+966`) |
| WhatsApp | `3` | All phone numbers, including Saudi numbers (`+966`) |

The phone country code determines SMS eligibility, independently of the business address's country. WhatsApp is available for all phone numbers, including Saudi numbers; SMS is available only for Saudi numbers (`+966`).

#### Mobile verification channel popup

Before sending a mobile OTP, show the channel-selection popup supplied in the conversation. Match its white rounded modal, close control, heading, description, WhatsApp/SMS cards with radio controls and icons, availability notice, and coral `Send OTP` button. Localize it into Arabic and English.

- Show both channel cards. Enable both WhatsApp and SMS for `+966`, with SMS selected by default. For other country codes, enable/select WhatsApp and disable SMS.
- The availability notice must explain the same rule. Do not enable an unavailable channel.
- Opening or cancelling this popup must not send an OTP. Send only after the user presses `Send OTP`.
- After a successful send, open the four-digit OTP popup. If sending fails, show the error and keep the channel popup available for retry.
- Email activation skips channel selection and sends with `targetType: 1`.
- Generation, verification, and resend must use the same target type and exact target contact. If the phone number or country code changes, invalidate the pending verification and re-evaluate channel eligibility.

POST
/api/v1/ValidateBusinessUserAndGenerateOtp

This sends an OTP through the applicable email, SMS, or WhatsApp channel.

use these as query params not payload:

```js
{
  userName: '', // existing businessAccountUserName; query parameter documented by Swagger
  targetType: '', // 1 = email, 2 = SMS (+966 only), 3 = WhatsApp (all phone numbers)
  // Email activation includes only email; omit phoneNumber and phoneCountryCode.
  // Mobile activation includes only phoneNumber and phoneCountryCode; omit email.
}
```

POST
/api/v1/VerifyBusinessAccountOtp

This verifies the OTP for the same contact and target type used to generate it.

The updated Swagger contract accepts `phoneNumber` and `PhoneCountryCode` separately. Although the contact parameters are optional in Swagger, temporarily send `email`, `phoneNumber`, and `PhoneCountryCode` together for every verification request, using the captured form contacts. Generation and resend still include only the selected contact. Generation uses the lowercase `phoneCountryCode` query key; verification uses `PhoneCountryCode`.

use these as query params not payload:

```js
{
  targetType: '', // same target type as generation: 1 = email, 2 = SMS, 3 = WhatsApp
  otpCode: '',
  email: '',
  phoneNumber: '',
  PhoneCountryCode: '',
  // Temporarily include all three contact fields for verification only.
  // Keep the country code separate from phoneNumber.
}
```

After successful OTP verification, automatically call `/AddEditBusinessAccount` to save only the verified email or phone/country-code pair. Use saved baseline values for all other fields. Do not save another unverified contact or unrelated pending edits.

Keep other pending form edits and stay on this page after contact-only saving. Update the saved baseline only after the save succeeds. If verification succeeds but saving fails, allow retrying that save without claiming the contact was saved. Changing the contact invalidates that verification.

Show `/AddEditBusinessAccount` failures in the existing error toast for both main Save and automatic contact-only saves. Use the API's error message when available, with a localized fallback. Preserve pending edits and verified-contact retry state after a save failure.

Match public\edit-account\image.png for the OTP popup. Handle success, invalid codes, expired codes, and request errors. The OTP has four digits, expires after five minutes, and can be resent every ten seconds. Start/reset these deadlines only after successful generation or resend; calculate the timers from elapsed time. Resend uses the same generation API and chosen target type. Support paste, backspace, keyboard focus, loading states, and left-to-right digit ordering in both languages.

The main Save button submits the remaining permitted edits after changed contacts have been verified and saved. Cancel discards pending edits; contact changes already saved through OTP remain persisted.

### Existing document types

Use this `BusinessAccountDocumentType` mapping for read-only document cards:

| Value | Enum member | Display group |
| --- | --- | --- |
| `1` | `OtherCertificate` | General / additional certificates |
| `2` | `CommercialRegistrationDocument` | Commercial registration document |
| `3` | `ProofOfAuthorization` | Proof of authorization |
| `4` | `RepresentativeNationalId` | Representative / business owner's national ID |
| `5` | `FreelanceCertificate` | Freelance certificate |
| `6` | `FreelanceId` | Freelance certificate holder's national ID |
| `7` | `VatRegistrationCertificate` | VAT certificate |
| `8` | `BankIbanCertificate` | Bank IBAN certificate |

Show every returned document, including multiple documents of one type. Place verification documents in their matching commercial/freelance groups and type `7` in VAT. Place type `8` in additional documents with its bank certificate label; do not introduce a settlement editor. Keep documents from another mode visible in additional documents. Existing type `0` and unknown types use generic additional-document cards without guessing a category.

Swagger defines submitted certificate items as a required binary `file` and a `documentType`. Do not serialize existing certificate URLs as new uploads.

## Address

Previously we used 3 select fields country, region & neighborhood now as you see in the UI we will have the country select field returning from this api /ListCountryDDL and will return an array of countries like this :

```json
[
  {
    "id": 1,
    "name": "Saudi Arabia",
    "countryCode": "+966",
    "countryFlag": "https://onruf.shop/",
    "isActive": true,
    "createdAt": "2024-10-29T12:54:09.0263466",
    "updatedAt": null,
    "totalRecords": 0,
    "regions": null
  }
]
```

If the selected country's code does not contain `966`, set `isSaudiLocation` to `false` and show the existing region and neighborhood dropdowns. If the selected country is Saudi Arabia, set it to `true` and show Google Maps, address search, and editable address details.

A map pin supplies latitude/longitude. An SPL code such as `MAJA7522` or `DMAC3768` belongs in the editable `shortAddress` field. It must not populate or overwrite the read-only business identifier `unifiedNationalEstablishmentNumber`. Google Plus Codes are a separate format and must not be submitted as SPL short addresses.

When loading a Saudi business account, use its saved `shortAddress` to fetch complete SPL short-address details, including the coordinates that position the map. Populate the address summary and matching form fields from that response even if the account's saved latitude/longitude differ. If no short address is saved, initialize the map from the account's saved latitude/longitude without an automatic SPL lookup. Hydrate address fields without resetting unrelated edits, and ignore an older initialization response after a new selection or country change.

Use the method in the supplied `google-maps.service.ts`: reverse-geocode a map pin through Google's JavaScript `Geocoder`, inspect the first returned address and then later results for an SPL code, and prefer `premise` components before other components or formatted address text. Check both short and long values, accept a complete four-Latin-letter/four-digit code, and reject Plus Code fragments or ambiguous matches. For an ordinary text search, keep the selected first result's coordinates and extract the code from that same result.

For a code obtained from Google, or a known/entered national short address, call:

GET `/api/v1/spl-integration/address/short-address/MAJA7522?lang=ar`

When Google returns a location without a usable short code, call the SPL coordinate endpoint with that location's exact decimal latitude/longitude instead of showing the missing-short-code message:

GET `/api/v1/spl-integration/address/geocode?lat=24.713740961404046&lng=46.674835039214585&lang=E`

Geocode returns an envelope whose `data.NationalAddress` contains the detected address, including `ShortAddress`; its latitude/longitude can be null. Extract and validate that short code, then call the short-address endpoint with the same language to retrieve the complete address details. Apply only the final short-address response to the address summary and account fields. Live geocode and short-address requests for `24.46663456,39.60021155` now succeed and resolve `DMAC3768`.

An HTTP 200 response and `data.success: true` do not guarantee a building address. The following response has no usable short code. Do not call short-address lookup or replace existing address details; show the localized instruction to select a building and try again.

```json
{
  "status_code": 200,
  "message": "Success",
  "status": "Success",
  "data": {
    "NationalAddress": null,
    "success": true,
    "Message": {
      "MessageCode": "MSG005",
      "MessageDescriptionEn": "The selected location does not refer to a building, please try again",
      "MessageDescriptionAr": "الموقع المحدد لا يشير الي مبني، الرجاء إعادة المحاولة",
      "description": null
    }
  },
  "numberOfPages": null
}
```

For a map pin, the selected coordinates are already known, so use this fallback if Google reverse-geocoding fails as well. For a text search, Google must first resolve the selected result's coordinates; never fall back using an older pin or the default map center when the search itself fails. If a short code is available, keep using the short-address endpoint. If the chosen SPL lookup fails, show its lookup error and keep manual short-code entry available.

An explicitly entered SPL code goes directly to this endpoint without a Google lookup. Confirm that the SPL response contains the requested code before applying its address fields and identifiers. Never invent an SPL code from coordinates or a Plus Code. Preserve selected decimal coordinates and manual details when lookups fail. Ignore stale responses from earlier pin selections, searches, manual edits, locale changes, or country changes. Google code extraction is a best-effort interpretation of address data and requires a working Google Geocoding API key.

Use Arabic results for Arabic and `lang=E` for English. `User-Language` remains an existing request header. The application's configured base URL already includes `/api/v1`, so use relative endpoint paths without duplicating that prefix.

### Supplied SPL address response

The backend supplied the following address object for frontend mapping and fixture-based checks. The same shape was observed from the live short-address endpoint inside `data.Addresses[]`. Apply this mapping to short-address details, whether the code came from Google, manual entry, or SPL geocode.

```json
{
  "Latitude": "24.46663456",
  "Longitude": "39.60021155",
  "Title": null,
  "ShortAddress": "DMAC3768",
  "Address1": "3768 جعفر ابن عون - حي السقيا",
  "Address2": "المدينة المنورة 42315 - 9345",
  "BuildingNumber": "3768",
  "PostCode": "42315",
  "AdditionalNumber": "9345",
  "UnitNumber": null,
  "Street": "جعفر ابن عون",
  "District": "حي السقيا",
  "City": "المدينة المنورة",
  "RegionName": "منطقة المدينة المنورة",
  "Street_L2": "Jafar Ibn Awn",
  "District_L2": "As Suqya Dist.",
  "City_L2": "MADINAH",
  "RegionName_L2": "Madinah",
  "PKAddressID": "4231537689345",
  "DistrictID": "10300014079",
  "CityId": "14",
  "RegionId": "3",
  "IsPrimaryAddress": null
}
```

The short-address endpoint was previously observed returning this same address shape inside the application's response envelope at `data.Addresses[]`. Accept a direct address object or that documented wrapper, use the first returned address, and treat missing addresses or a failed response as lookup failure. The published SPL Swagger operations currently omit response schemas, so the supplied object and observed wrapper are the mapping references.

### Address mapping

| SPL field | Account field / use |
| --- | --- |
| `Latitude` | `lat` |
| `Longitude` | `lon` |
| `ShortAddress` | `shortAddress` |
| `RegionId` | `regionId` |
| `RegionName` | `region` |
| `CityId` | `neighborhoodId` |
| `District` | `neighborhood` |
| `PostCode` | `zipCode` |
| `BuildingNumber` | `buildingNumber` |
| `Street` | `street` |
| `City`, `Address1`, `Address2` | Derived address summary; no new account fields |

Use the country name and ID from the selected country. Submit SPL IDs directly, without resolving or replacing them through internal region/neighborhood lists. Map `CityId` to `neighborhoodId` (`14` in the supplied fixture). `District` still supplies the neighborhood display name. Keep latitude/longitude as decimal values without integer truncation; Swagger declares multipart `Lat` and `Lon` as strings.

Keep address coordinates, identifiers, and lookup values in form state for submission without displaying extra editors. Manual short-code entry remains available through the map search box if map loading or SPL lookup fails; retain selected coordinates and existing details and show the error. Match the SVG's four-cell address summary and full-address row. Do not save a default map center as a selected location. Ignore stale lookup responses after another selection, and clear dependent location values when changing country without resetting other form edits.

## Published Swagger gaps to resolve with the backend

These are observed schema discrepancies, not changes to the agreed behavior:

1. `OtpTargetType` currently lists only `1` and `2`; the required WhatsApp value `3` is missing. The backend must support `3` for generation, verification, and resend, and publish the updated enum.
2. The published multipart submit schema omits the requested writable `BuildingNumber`, `Country`, `Region`, and `Neighborhood` fields. Confirm/add their save support. GET-only presence does not prove that submission persists them.
3. The published submit schema also omits `FreelanceCertificateId` and `FreelanceExpiryDate`; these remain read-only and must not be invented as editable fields.
4. OTP generation documents an HTTP 200 `ProviderInfoDto`; OTP verification documents a string, and account saving has no HTTP 200 response schema. Do not assume every success is a `{ status_code, status, data }` envelope. Handle documented string responses and recognized envelopes, reject HTTP/body errors, and confirm actual mutation responses during integration without replacing the signed-in session from OTP generation data.

Frontend work can proceed using the supplied SPL fixture. WhatsApp and address persistence need backend contract confirmation and live integration checks before claiming end-to-end completion.

## Updated implementation plan

1. **Form and localization:** Replace the old three-step form with the five SVG sections, using saved commercial/freelance mode, scoped styling, existing fonts/icons, Arabic/English translations, and responsive layouts. Preserve the shared shell, read-only restrictions, date rules, and complete labeled document display.
2. **API and save flow:** Reuse global axios headers, React Hook Form, multipart configuration, and existing feedback patterns. Initialize the form once; prevent lookup responses from resetting unrelated edits. Build multipart fields from the saved baseline plus allowed changes, using Swagger's field names, preserving arrays, required names/username, and the read-only `unifiedNationalEstablishmentNumber`, avoiding duplicate keys and file-URL uploads. Allow address changes through `shortAddress` without changing the establishment number. Check HTTP and supported body-level failure statuses. Keep the selected-account Redux context used by the existing screen.
3. **Contact verification:** Implement the mobile channel popup before sending, with SMS only for Saudi numbers and WhatsApp for all phone numbers, including Saudi; email uses type `1` directly. Omit non-applicable contact query parameters from generation and resend; temporarily send email, phoneNumber, and PhoneCountryCode together for verification only. Add the four-digit OTP popup, fixed-target/channel generation/verification/resend, five-minute expiry, ten-second cooldown, and contact-only automatic saving. Preserve unrelated pending edits and prevent unverified contact persistence. Successful main Save returns to settings.
4. **Address integration:** Extend the existing shared map through optional selection/sizing/error callbacks without breaking current callers. Use the working existing `NEXT_PUBLIC_MAPS_API_KEY` and the supplied Google service's extraction method to obtain a short code from Google pin/search results, then use SPL short-address lookup when a code exists. Otherwise use SPL coordinate lookup with the selected pin's or resolved search result's latitude/longitude, extract `data.NationalAddress.ShortAddress`, and fetch details through short-address lookup. Handle `MSG005` or missing addresses without sending an invalid short-code request or replacing existing details. Keep typed codes direct, use the supplied response fixture and exact mapping above, preserve manual entry and existing non-Saudi dropdowns, and show lookup errors only when resolution fails.
5. **Verification and backend follow-up:** Add focused checks for payload preservation, document groups, both contact channels and country-code changes, OTP timing/failures, contact-only saves, SPL object/wrapper mapping, CityId-to-neighborhoodId mapping, stale responses, and manual fallback. Browser-check both account modes and languages on desktop/mobile against both popup references and SVGs. Run focused lint, translation parity, and production build. Use mocked mutation responses until backend gaps are resolved; then verify real persistence and rerun live SPL lookup. Keep existing environment changes intact and add no dependencies.

## Final Notes:

1. Try using the apis before building so that you have a clear picture of how data is sent to us to make proper mapping using those fixed headers
   `?businessAccountId=3&&ProviderId=1afa3389-236e-4f8b-bb41-e95cfa9da9ae&&UserId=1afa3389-236e-4f8b-bb41-e95cfa9da9ae&&Token=Bearer%20eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJoYWRlZXJhYm9lbGVuaWVuQGdtYWlsLmNvbSIsInVzZXJfaWQiOiIxYWZhMzM4OS0yMzZlLTRmOGItYmI0MS1lOTVjZmE5ZGE5YWUiLCJ0eXBlX3VzZXIiOiIxIiwiZXhwIjoxODIxMDA5NjM2LCJpc3MiOiJodHRwOi8vd3d3LnNlY3VyaXR5Lm9yZyIsImF1ZCI6Imh0dHA6Ly93d3cuc2VjdXJpdHkub3JnIn0.Ee17Gk2R-SbbDUPikL7EL2NyrlU5mSjRfOspiv2BuJc`.

2. Let me know if you have any questions or found any business gaps to discuss during planing.

3. use same methods we use in the code (don't reinvent the wheel), check how we call apis and do the same, style the UI...etc
