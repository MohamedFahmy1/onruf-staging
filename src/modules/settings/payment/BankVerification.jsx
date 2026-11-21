import { Modal } from "react-bootstrap"
import { BsPatchCheck } from "react-icons/bs"
import { FiX } from "react-icons/fi"
import ContactVerification from "../editAccount/ContactVerification"
import { OTP_TYPES, phoneTargetType } from "../editAccount/accountUtils.mjs"
import { BANK_OTP_TYPES, generateBankOtp, verifyBankOtp } from "./bankVerification.mjs"
import translations from "../../../translations.json"
import styles from "./BankVerification.module.css"

const BankVerification = ({ request, success, copy, locale, onClose, onVerified }) => {
  const text = (key) => copy[key] ?? translations[locale === "en" ? "en" : "ar"].BusinessAccountEdit[key]
  if (success)
    return (
      <Modal
        show
        centered
        onHide={onClose}
        className={styles.overlay}
        dialogClassName={styles.successDialog}
        contentClassName={styles.successContent}
        backdropClassName={styles.backdrop}
        aria-labelledby="bank-success-title"
      >
        <button type="button" className={styles.close} onClick={onClose} aria-label={copy.close}>
          <FiX />
        </button>
        <BsPatchCheck className={styles.successIcon} aria-hidden="true" />
        <h2 id="bank-success-title" className={styles.successTitle}>
          {copy.verificationSuccessTitle}
        </h2>
        <p className={styles.successBody}>
          {success === "default" ? copy.verificationDefaultSaved : copy.verificationAccountSaved}
        </p>
      </Modal>
    )
  const account = request.businessAccount
  const phone = String(account.businessAccountPhoneNumber || "").trim()
  const target = {
    targetType:
      phoneTargetType(account.phoneCountryCode) === OTP_TYPES.sms ? BANK_OTP_TYPES.sms : BANK_OTP_TYPES.whatsapp,
    email: account.businessAccountEmail,
    phoneNumber: account.businessAccountPhoneNumber,
    phoneCountryCode: account.phoneCountryCode,
  }
  return (
    <ContactVerification
      target={target}
      baseline={account}
      copy={text}
      locale={locale}
      onClose={onClose}
      onSaved={onClose}
      channelTypes={BANK_OTP_TYPES}
      generateCode={generateBankOtp}
      verifyCode={verifyBankOtp}
      onVerified={onVerified}
      resendDelay={30}
      className={styles.overlay}
      showChannelLabel
      targetLabel={`${target.phoneCountryCode} ${"*".repeat(Math.max(0, phone.length - 3))}${phone.slice(-3)}`}
      changeContactHref={`${locale === "en" ? "/en" : ""}/settings/editAccount/${account.id}`}
    />
  )
}

export default BankVerification
