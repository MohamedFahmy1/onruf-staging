import { useEffect, useRef, useState } from "react"
import { Modal } from "react-bootstrap"
import { toast } from "react-toastify"
import { FaExclamationCircle, FaSms, FaTimes, FaWhatsapp } from "react-icons/fa"
import { generateOtp, saveAccount, verifyOtp } from "./api"
import { accountErrorMessage, isPhoneChannelAvailable, phoneTargetType } from "./accountUtils.mjs"
import styles from "./editAccount.module.css"

const numbersOnly = (value) =>
  value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
    .replace(/\D/g, "")

const ContactVerification = ({ target, baseline, copy, locale, onClose, onSaved }) => {
  const isEmail = Number(target.targetType) === 1
  const defaultType = isEmail ? 1 : phoneTargetType(target.phoneCountryCode)
  const [selectedType, setSelectedType] = useState(defaultType)
  const [phase, setPhase] = useState(isEmail ? "otp" : "channel")
  const [digits, setDigits] = useState(["", "", "", ""])
  const [busy, setBusy] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState("")
  const [status, setStatus] = useState("")
  const [expiresAt, setExpiresAt] = useState(0)
  const [resendAt, setResendAt] = useState(0)
  const [now, setNow] = useState(Date.now())
  const alive = useRef(true)
  const operation = useRef(false)
  const inputs = useRef([])
  const started = useRef(false)
  const contact = { ...target, targetType: selectedType }
  const hasSent = expiresAt > 0
  const secondsLeft = hasSent ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : 0
  const resendSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000))
  const expired = hasSent && secondsLeft === 0

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    if (!expiresAt || verified) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [expiresAt, verified])

  useEffect(() => {
    if (phase === "otp" && hasSent && !busy && !verified) inputs.current[0]?.focus()
  }, [phase, hasSent, busy, verified])

  const sendCode = async () => {
    if (operation.current || (hasSent && Date.now() < resendAt)) return
    operation.current = true
    setBusy(true)
    setError("")
    setStatus("")
    try {
      await generateOtp(contact, baseline.businessAccountUserName)
      if (!alive.current) return
      const sentAt = Date.now()
      setExpiresAt(sentAt + 5 * 60 * 1000)
      setResendAt(sentAt + 10 * 1000)
      setNow(sentAt)
      setDigits(["", "", "", ""])
      setVerified(false)
      setPhase("otp")
      setStatus(copy("otpSent"))
    } catch (failure) {
      if (alive.current) setError(accountErrorMessage(failure, copy("otpError")))
    } finally {
      operation.current = false
      if (alive.current) setBusy(false)
    }
  }

  useEffect(() => {
    if (isEmail && !started.current) {
      started.current = true
      sendCode()
    }
  }, [])

  const activate = async (event) => {
    event.preventDefault()
    if (operation.current) return
    if (!verified && (!hasSent || Date.now() >= expiresAt)) {
      setError(copy("expired"))
      return
    }
    if (!verified && !/^\d{4}$/.test(digits.join(""))) {
      setError(copy("invalidOtp"))
      return
    }
    operation.current = true
    setBusy(true)
    setError("")
    setStatus("")
    let hasVerified = verified
    try {
      if (!hasVerified) {
        await verifyOtp(contact, digits.join(""))
        if (!alive.current) return
        hasVerified = true
        setVerified(true)
      }
      await saveAccount(baseline, {}, { contact })
      if (alive.current) onSaved(contact)
    } catch (failure) {
      if (alive.current) {
        const message = accountErrorMessage(failure, copy(hasVerified ? "saveError" : "otpError"))
        if (hasVerified) toast.error(message)
        else setError(message)
      }
    } finally {
      operation.current = false
      if (alive.current) setBusy(false)
    }
  }

  const enterDigits = (value, index) => {
    const numeric = numbersOnly(value).slice(0, 4)
    const start = numeric.length === 4 ? 0 : index
    setDigits((previous) => {
      const next = [...previous]
      next[start] = ""
      numeric.split("").forEach((digit, offset) => {
        if (start + offset < 4) next[start + offset] = digit
      })
      return next
    })
    setError("")
    if (numeric.length) inputs.current[Math.min(start + numeric.length, 3)]?.focus()
  }

  const moveFocus = (event, index) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault()
      setDigits((previous) => previous.map((digit, position) => (position === index - 1 ? "" : digit)))
      inputs.current[index - 1]?.focus()
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault()
      inputs.current[index - 1]?.focus()
    } else if (event.key === "ArrowRight" && index < 3) {
      event.preventDefault()
      inputs.current[index + 1]?.focus()
    }
  }

  const close = () => {
    if (!operation.current) onClose()
  }

  return (
    <Modal
      show
      centered
      onHide={close}
      keyboard={!busy}
      backdrop={busy ? "static" : true}
      className={styles.verificationOverlay}
      backdropClassName={styles.verificationBackdrop}
      dialogClassName={phase === "channel" ? styles.channelModal : styles.otpModal}
      contentClassName={styles.modal}
      aria-labelledby="account-verification-title"
      aria-describedby="account-verification-description"
    >
      <div dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className={styles.modalHeader}>
          <button
            type="button"
            className={styles.modalClose}
            aria-label={copy("close")}
            disabled={busy}
            onClick={close}
          >
            <FaTimes aria-hidden="true" />
          </button>
          <h2 id="account-verification-title" className={styles.modalTitle}>
            {copy(phase === "channel" ? "selectChannel" : "otpTitle")}
          </h2>
        </div>
        <p id="account-verification-description" className={styles.modalDescription}>
          {copy(phase === "channel" ? "channelDescription" : "otpDescription")}
          {phase === "otp" && (
            <>
              {" "}
              <bdi dir="ltr">{isEmail ? target.email : `${target.phoneCountryCode} ${target.phoneNumber}`}</bdi>
            </>
          )}
        </p>
        {phase === "channel" ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              sendCode()
            }}
          >
            <div className={styles.channelGrid} role="group" aria-label={copy("channelLabel")}>
              {[
                { type: 3, key: "whatsapp", Icon: FaWhatsapp },
                { type: 2, key: "sms", Icon: FaSms },
              ].map(({ type, key, Icon }) => {
                const unavailable = type === 2 && !isPhoneChannelAvailable(target.phoneCountryCode, type)
                return (
                  <label
                    key={type}
                    className={`${styles.channelCard} ${selectedType === type ? styles.channelSelected : ""} ${
                      unavailable ? styles.channelDisabled : ""
                    }`}
                  >
                    <span
                      className={styles.channelIcon}
                      style={{ backgroundColor: type === 3 ? "#30c95a" : "#00a6e5" }}
                    >
                      <Icon aria-hidden="true" />
                    </span>
                    <span>{copy(key)}</span>
                    <input
                      type="radio"
                      name="business-verification-channel"
                      value={type}
                      checked={selectedType === type}
                      disabled={unavailable || busy}
                      onChange={() => setSelectedType(type)}
                    />
                  </label>
                )
              })}
            </div>
            <p className={styles.channelNotice}>
              <FaExclamationCircle aria-hidden="true" /> {copy("channelNotice")}
            </p>
            {error && (
              <p className={styles.modalError} role="alert">
                {error}
              </p>
            )}
            <button type="submit" className={styles.sendOtpButton} disabled={busy}>
              {copy("sendOtp")}
            </button>
          </form>
        ) : (
          <form onSubmit={activate}>
            <div className={styles.otpDigits} dir="ltr" role="group" aria-label={copy("otpTitle")}>
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputs.current[index] = element
                  }}
                  className={styles.otpDigit}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  aria-label={`${copy("otpTitle")} ${index + 1}`}
                  value={digit}
                  disabled={busy || !hasSent || verified || expired}
                  onFocus={(event) => event.target.select()}
                  onChange={(event) => enterDigits(event.target.value, index)}
                  onKeyDown={(event) => moveFocus(event, index)}
                  onPaste={(event) => {
                    event.preventDefault()
                    enterDigits(event.clipboardData.getData("text"), index)
                  }}
                />
              ))}
            </div>
            {!verified && (
              <>
                <div className={styles.resendRow}>
                  <span>{copy("notReceived")}</span>
                  <button
                    type="button"
                    className={styles.resendButton}
                    disabled={busy || resendSeconds > 0}
                    onClick={sendCode}
                  >
                    {copy(hasSent ? "resend" : "sendOtp")}
                    {resendSeconds > 0 ? ` (${resendSeconds})` : ""}
                  </button>
                </div>
                {hasSent && (
                  <p className={styles.countdown} aria-live="off">
                    {expired
                      ? copy("expired")
                      : `${copy("expiresIn")} ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(
                          2,
                          "0",
                        )}`}
                  </p>
                )}
              </>
            )}
            {error && (
              <p className={styles.modalError} role="alert">
                {error}
              </p>
            )}
            {status && !error && (
              <p className={styles.modalSuccess} role="status">
                {status}
              </p>
            )}
            <button
              type="submit"
              className={styles.sendOtpButton}
              disabled={busy || (!verified && (!hasSent || expired || digits.some((digit) => !digit)))}
            >
              {copy(verified ? "trySaveAgain" : "verify")}
            </button>
          </form>
        )}
      </div>
    </Modal>
  )
}

export default ContactVerification
