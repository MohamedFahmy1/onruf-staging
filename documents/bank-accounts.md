# Bank accounts and payout verification

## Scope and implementation

The `/settings` bank-account panel supports bank accounts only. Visa, Mastercard, Mada, and expiry-date controls are not part of this panel. Wallet and product payment flows have their own implementations and are outside this feature.

This document replaces the temporary planning requirements and design exports. The current implementation and the confirmed rules below take precedence over older planning text: **Add/Edit always submit `PaymentAccountType=3`**, not the original proposed value `4`.

Main implementation files:

- `src/modules/settings/index.jsx` supplies the currently selected business account's saved contacts to the panel. It keys the panel by business account ID and does not pass a stale account response belonging to another business.
- `src/modules/settings/payment/index.jsx` owns the bank list, forms, confirmation, OTP gating, and mutation lifecycle. `bankAccounts.mjs` owns bank requests and multipart payloads. `DeleteModal.jsx` handles removal.
- `BankVerification.jsx`, `BankVerification.module.css`, and `bankVerification.mjs` provide bank verification UI, API adapters, and draft verification matching. The panel styles are in `BankAccounts.module.css`.
- The shared `src/modules/settings/editAccount/ContactVerification.jsx` supplies channel selection, code entry, timers, and verified-save retries. Bank callbacks replace its contact-saving behavior; bank verification must never call `/AddEditBusinessAccount`.
- Arabic and English text lives in `src/translations.json`, primarily under `BankAccounts`, with shared OTP copy under `BusinessAccountEdit`.

On Windows, retain the explicit `./BankVerification.jsx` component import. An extensionless import can resolve to `bankVerification.mjs` instead.

## Cards, forms, and assets

- Alternate the same teal and blue card designs for any number of accounts. Cards retain their width and scroll horizontally within the panel. Only the selected payout account has the tilted backing.
- Display the saved bank name, the account number masked to its last four characters, and the account holder. Keep account identifiers in left-to-right order in both languages.
- Provide Add, Edit, Delete, and a native payout-account checkbox with accessible names, visible keyboard focus, and a tooltip on hover/focus. Support Arabic/English and desktop/mobile without page overflow.
- The checkbox label is `حساب المستحقات`; its tooltip is `الحساب المستخدم لاستلام تحويلات مستحقات مبيعاتك.`. The form checkbox is `تعيين كحساب الاستحقاق الافتراضي`.
- Require bank name, holder name, an account number containing 16–17 digits, an alphanumeric IBAN, and an IBAN certificate. SWIFT is optional. Keep identifiers as strings to preserve leading zeros.
- The certificate picker accepts PNG, JPG/JPEG, and PDF. Existing certificates satisfy Edit validation without a replacement. Preserve their URL and upload only a real replacement file; never fabricate a file for an existing certificate.

Runtime artwork is stored centrally:

| File                                         | Use                                                                                           |
| -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `public/images/bank-account-backgrounds.png` | Shared source artwork for the teal/blue backgrounds; retain the CSS crop positions and sizes. |
| `public/images/bank-account-icon.svg`        | Decorative bank symbol; the saved bank name identifies the account.                           |

The feature has no runtime dependency on the removed planning folder or its design exports.

## Default payout account rules

`isMyFatoorahDepositAccount` identifies the account used to receive MyFatoorah payouts.

- The first bank account must be the default. Its form checkbox is checked and locked.
- When existing accounts have no default, prompt the user to choose one. Do not silently assign an existing account. A form save in that state must select a default.
- Prevent deleting or unchecking the current default. The user must designate another account first. Nondefault accounts retain the ordinary deletion confirmation; deletion does not use the bank OTP flow.
- Selecting a different default from a card opens confirmation, then verification. In a form, selecting the default checkbox opens confirmation if another default exists, then verification. With no competing default, checking it goes directly to verification.
- Confirming and verifying the form checkbox changes the draft only. It must not save the bank account or show the completed-change popup before Save.
- The backend clears the former default when another account is saved with the flag set to `true`. The frontend never sends a separate request setting the former account to `false`.
- After a successful save, reload the authoritative list. For a requested default change, verify that the selected account is the sole default before showing success. Do not infer success from a successful HTTP status or locally checked checkbox.
- Match an edited account by its saved ID. For Add, match the sole default by the submitted account number and IBAN; the API may reuse an existing account ID and its success response does not document a returned ID.

Use this protected-account message verbatim in Arabic:

> لا يمكنك حذف هذا الحساب البنكي لأنه الحساب المعتمد لاستلام المستحقات. يرجى إضافة حساب بنكي آخر وتعيينه لاستلام المستحقات أولا ثم إعادة المحاولة

English equivalent:

> You cannot delete this bank account because it is the designated account for receiving payouts. Please add another bank account, set it to receive payouts, and then try again.

The default-change confirmation explains that the new account applies only to new transfers. Transfers created or submitted before the change continue to the previous account. Its Arabic body is:

> سيتم اعتماد الحساب الجديد للتحويلات الجديدة فقط، أما أي تحويل تم إنشاؤه أو رفعه قبل تغيير الحساب فسيستمر تحويله إلى الحساب السابق.

## Bank API contract

Use the configured axios base URL and existing authorization, provider, business-account, language, and application-source headers. Paths below are relative to that base URL; do not add a second `/api/v1` prefix.

Before changing requests, inspect the [Swagger UI](https://onruf.shop/swagger/index.html), [Payment schema](https://onruf.shop/swagger/Payment/swagger.json), and [BusinessAccount schema](https://onruf.shop/swagger/BusinessAccount/swagger.json). Shared account-verification context is in [edit-account.md](edit-account.md).

| Method | Relative endpoint      | Request                                                                                                                                  |
| ------ | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/BankTransfersList`   | Current implementation sends no type filter. Response data must be an array with a boolean `isMyFatoorahDepositAccount` on each account. |
| GET    | `/GetBankTransferById` | Query `id`. Retain the selected list ID when assembling the edit payload; details need not include it.                                   |
| POST   | `/AddBankTransfer`     | Multipart bank payload below.                                                                                                            |
| PUT    | `/EditBankTransfer`    | Same multipart payload plus `Id`; also used to change the default from cards.                                                            |
| DELETE | `/RemoveBankTransfer`  | Query `id`; reject protected accounts before requesting removal.                                                                         |

The shared multipart builder explicitly allows these fields:

| Form field                                                               | Source/rule                                                                         |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `Id`                                                                     | Existing account ID; omitted for Add.                                               |
| `AccountNumber`, `BankName`, `BankHolderName`, `IbanNumber`, `SwiftCode` | Captured bank fields; optional null fields are omitted.                             |
| `IbanCertificate`                                                        | Existing certificate URL, when present.                                             |
| `IbanCertificateFile`                                                    | Real replacement file only.                                                         |
| `PaymentAccountType`                                                     | Always `3`, serialized as a multipart string. Ignore any form-supplied alternative. |
| `IsMyFatoorahDepositAccount`                                             | Required explicit boolean, serialized as `true` or `false`.                         |
| `SaveForLaterUse`                                                        | Always `true`.                                                                      |

Do not serialize card expiry, unrelated response metadata, or arbitrary form keys. For card default changes, obtain full account details, retain its ID and saved certificate, then submit the full bank payload with the default flag set.

## OTP channels and request bodies

Verify using the **saved business-account mobile**, not an editable bank field or a separately entered recipient. Capture the saved username, email, phone, country code, selected business account, and intended bank payload before sending. If required saved contact data is unavailable, show an error instead of sending an OTP or saving.

| Channel  | Enum value | JSON `targetType`                   | Availability                                                           |
| -------- | ---------- | ----------------------------------- | ---------------------------------------------------------------------- |
| SMS      | `7`        | `BusinessBankAccountChangeSms`      | Saudi phone code `+966` only; default for Saudi numbers.               |
| WhatsApp | `8`        | `BusinessBankAccountChangeWhatsApp` | All supported phone codes, including Saudi; default for other numbers. |

Send enum **names** in JSON. Keep the account-contact registration types separate: existing `otpRequestBody` validation intentionally rejects bank types. The bank adapter reuses its contact validation while substituting the bank target type.

POST `/ValidateBusinessUserAndGenerateOtp` uses an application/json body:

```json
{
  "userName": "saved-business-username",
  "targetType": "BusinessBankAccountChangeSms",
  "email": "saved@example.com",
  "phoneNumber": "566666666",
  "phoneCountryCode": "+966"
}
```

POST `/VerifyBusinessAccountOtp` uses the same captured contacts and target type:

```json
{
  "targetType": "BusinessBankAccountChangeSms",
  "otpCode": "0123",
  "email": "saved@example.com",
  "phoneNumber": "566666666",
  "phoneCountryCode": "+966"
}
```

Trim contact values and use `null` for absent optional contacts. Keep the phone and country code separate. Include the captured email, phone, and country code in generation, resend, and verification bodies; do not put contacts in query parameters. `userName` is required for generation and is not part of verification.

## Verification lifecycle and failure handling

1. Add/Edit Save validates the form, then opens channel selection unless the exact draft already has usable verification. A card default change first confirms the change, then opens channel selection.
2. Opening or cancelling channel selection sends nothing. Send only on `Send OTP`; generation failure keeps the dialog available for retry.
3. Use **four digits**, including leading zeros. The user explicitly chose four despite the six-box mockup. Codes expire five minutes after successful generation; bank resend cooldown is 30 seconds. Use elapsed-time deadlines and reset only after successful generation/resend. Ordinary account-contact verification retains its own ten-second cooldown.
4. Support paste, Arabic/Persian digit normalization, backspace, keyboard focus, loading states, and left-to-right digit ordering. Show a masked recipient. `Change number` navigates to the saved business account's edit screen and preserves locale; it does not substitute an unverified recipient.
5. Require explicit verification success. Invalid/expired codes and HTTP-200 error bodies must not authorize a mutation.
6. Checkbox verification returns to the form with its default flag checked. Save may reuse that verification only for the same bank fields, replacement File object, saved account/contact identity, and original OTP deadline. Edits, changing the selected business or contacts, closing the form, or expiry invalidate reuse.
7. Save/card verification automatically submits the captured bank payload. On a save failure, retain the verified retry path while it remains usable. Recheck the deadline before retrying. Cancel preserves the unsaved form and selected certificate.
8. Show the green completed-change dialog only after the bank mutation and authoritative refresh/default assertion succeed. Checkbox-only verification is not a completed bank change.

Inspect HTTP failures and supported response-envelope failure statuses even when HTTP is 200. OTP errors stay in the dialog; save errors use localized toasts with backend messages when available. A synchronous save lock prevents duplicate mutations. Mounted/request guards prevent stale asynchronous work from continuing a bank write after switching context.

If list responses omit default flags, or a requested default is not confirmed, show a contract error and block further changes until refresh/retry. If a mutation succeeds but list refresh fails, report that the change was saved but the list could not refresh; do not show success or allow duplicate resubmission of that Add.

## Validation and integration limits

Focused tests:

```powershell
node --test src/modules/settings/payment/bankAccounts.test.mjs src/modules/settings/payment/bankVerification.test.mjs
node --test src/modules/settings/editAccount/api.test.mjs src/modules/settings/editAccount/accountUtils.test.mjs
npm run lint
```

Browser regression cases should cover Add/Edit and both default selectors; SMS/WhatsApp eligibility; cancellation and file preservation; invalid codes and HTTP-200 errors; verified retries and expiry; unchanged-draft reuse and invalidation; duplicate submits; missing flags and failed refresh; Arabic/English desktop/mobile; and the existing account-contact flow. Verify both central image URLs load and that no application asset reference depends on a planning folder.

Prior validation covered 46 focused tests, lint, a production build, 12 bank browser scenario groups, and four account-contact browser regressions with mocked APIs. This is not evidence of live OTP delivery or live MyFatoorah persistence.

Published schemas do not establish an OTP-token field on bank saves or the server's verification binding/reuse lifetime. Client gating is not a substitute for backend enforcement. Confirm those server guarantees separately; do not invent extra payload fields or claim live enforcement based on mocked tests.
