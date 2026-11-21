/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { Accordion } from "react-bootstrap"
import { useRouter } from "next/router"
import { useSelector } from "react-redux"
import { toast } from "react-toastify"
import {
  FiCamera,
  FiCheckCircle,
  FiChevronUp,
  FiDownload,
  FiExternalLink,
  FiFileText,
  FiGrid,
  FiMail,
  FiPhone,
  FiShield,
  FiUser,
} from "react-icons/fi"
import translations from "../../../translations.json"
import { userImg } from "../../../constants"
import editAccountFacebook from "../../../assets/images/edit-account-facebook.svg"
import editAccountInstagram from "../../../assets/images/edit-account-instagram.svg"
import editAccountLinkedin from "../../../assets/images/edit-account-linkedin.svg"
import editAccountSnapchat from "../../../assets/images/edit-account-snapchat.svg"
import editAccountTiktok from "../../../assets/images/edit-account-tiktok.svg"
import editAccountTwitter from "../../../assets/images/edit-account-twitter.svg"
import editAccountWebsite from "../../../assets/images/edit-account-website.svg"
import editAccountYoutube from "../../../assets/images/edit-account-youtube.svg"
import BusinessAddress from "./BusinessAddress"
import ContactVerification from "./ContactVerification"
import { getAccount, getCategories, getCountries, saveAccount } from "./api"
import {
  accountErrorMessage,
  contactChanges,
  OTP_TYPES,
  phoneTargetType,
  selectedCategoryLabels,
  toFormValues,
} from "./accountUtils.mjs"
import styles from "./editAccount.module.css"

const PANELS = ["0", "1", "2", "3", "4"]
const dateOnly = (value) => (value ? String(value).split("T")[0] : "")
const same = (left, right) => String(left || "").trim() === String(right || "").trim()

const DocumentCards = ({ documents, copy, types, extra = false }) => {
  const selected = (Array.isArray(documents) ? documents : []).filter((document) =>
    extra ? !types.includes(Number(document.documentType)) : types.includes(Number(document.documentType)),
  )
  if (!selected.length) return <p className={styles.empty}>{copy("noDocuments")}</p>
  return (
    <div className={styles.documents}>
      {selected.map((document, index) => {
        const url = /^https?:\/\//i.test(document.certificate || "") ? document.certificate : null
        const type = Number(document.documentType)
        const label = copy(type >= 1 && type <= 8 ? `document${type}` : "documentUnknown")
        const isImage = url && /\.(png|jpe?g|gif|webp)(?:[?#]|$)/i.test(url)
        return (
          <div className={styles.documentCard} key={document.id ?? `${type}-${index}`}>
            <div className={styles.documentThumbnail}>
              {isImage ? <img src={url} alt="" loading="lazy" /> : <FiFileText aria-hidden="true" />}
            </div>
            <div className={styles.documentInfo}>
              <span>{label}</span>
            </div>
            {url && (
              <div className={styles.documentActions}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${copy("preview")}: ${label}`}
                  title={copy("preview")}
                >
                  <FiExternalLink />
                </a>
                <a
                  href={url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${copy("download")}: ${label}`}
                  title={copy("download")}
                >
                  <FiDownload />
                </a>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const EditBussinessAccount = () => {
  const { locale = "ar", push } = useRouter()
  const businessId = useSelector((state) => state.authSlice.buisnessId)
  const activeAccount = useRef(businessId)
  activeAccount.current = businessId
  const copy = useCallback(
    (key) => translations[locale]?.BusinessAccountEdit?.[key] || translations.en.BusinessAccountEdit?.[key] || key,
    [locale],
  )
  const [account, setAccount] = useState(null)
  const [countries, setCountries] = useState([])
  const [categoryOptions, setCategoryOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [lookupError, setLookupError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [lookupRetry, setLookupRetry] = useState(0)
  const [serverError, setServerError] = useState("")
  const [target, setTarget] = useState(null)
  const [verifiedContacts, setVerifiedContacts] = useState({})
  const [openPanels, setOpenPanels] = useState(PANELS)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState("")
  const imageInput = useRef(null)
  const {
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    setValue,
    setError,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm()
  const busy = isSubmitting || Boolean(target)
  const freelance =
    account?.registrationDocumentType === "FreelanceCertificate" || Number(account?.registrationDocumentType) === 2
  const email = watch("businessAccountEmail")
  const phone = watch("businessAccountPhoneNumber")
  const phoneCode = watch("phoneCountryCode")

  useEffect(
    () => () => {
      if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview)
    },
    [imagePreview],
  )

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError(false)
    setAccount(null)
    setTarget(null)
    setVerifiedContacts({})
    setSelectedImage(null)
    setImagePreview("")
    setServerError("")
    if (!businessId)
      return () => {
        active = false
      }
    getAccount(businessId)
      .then((data) => {
        if (!data?.id) throw new Error("Account unavailable")
        if (!active) return
        setAccount(data)
        setImagePreview(/^https?:\/\//i.test(data.businessAccountImage || "") ? data.businessAccountImage : userImg)
        reset(toFormValues(data))
      })
      .catch(() => {
        if (active) setLoadError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [businessId, retry, reset])

  useEffect(() => {
    let active = true
    setLookupError(false)
    setCategoryOptions([])
    getCountries(locale)
      .then((data) => {
        if (active) setCountries(data)
      })
      .catch(() => {
        if (active) setLookupError(true)
      })
    getCategories(locale)
      .then((data) => {
        if (active) setCategoryOptions(data)
      })
      .catch(() => {
        if (active) setLookupError(true)
      })
    return () => {
      active = false
    }
  }, [locale, lookupRetry])

  const beginVerification = async (kind) => {
    const names = kind === "email" ? ["businessAccountEmail"] : ["businessAccountPhoneNumber", "phoneCountryCode"]
    const values = getValues()
    const changes = contactChanges(values, account)
    if (!changes[`${kind}Changed`]) {
      toast.error(copy(kind === "email" ? "emailUnchanged" : "phoneUnchanged"))
      return
    }
    if (!(await trigger(names))) return
    setServerError("")
    setTarget({
      targetType: kind === "email" ? OTP_TYPES.email : phoneTargetType(values.phoneCountryCode),
      email: values.businessAccountEmail?.trim() || "",
      phoneNumber: values.businessAccountPhoneNumber?.trim() || "",
      phoneCountryCode: values.phoneCountryCode?.trim() || "",
    })
  }

  const changeImage = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error(copy("invalidImage"))
      return
    }
    setSelectedImage(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const contactSaved = (contact) => {
    if (String(activeAccount.current) !== String(account.id)) return
    const patch =
      contact.targetType === OTP_TYPES.email
        ? { businessAccountEmail: contact.email }
        : { businessAccountPhoneNumber: contact.phoneNumber, phoneCountryCode: contact.phoneCountryCode }
    setAccount((current) => ({ ...current, ...patch }))
    setVerifiedContacts((current) => ({ ...current, ...patch }))
    Object.entries(patch).forEach(([key, value]) => setValue(key, value, { shouldDirty: false, shouldValidate: true }))
    setTarget(null)
    toast.success(copy("contactSaved"))
  }

  const submit = async (values) => {
    setServerError("")
    const { emailChanged, phoneChanged } = contactChanges(values, account)
    if (emailChanged || phoneChanged) {
      const message = copy("verifyContactsFirst")
      setOpenPanels(PANELS)
      if (emailChanged) setError("businessAccountEmail", { type: "verification", message })
      if (phoneChanged) setError("businessAccountPhoneNumber", { type: "verification", message })
      setServerError(message)
      return
    }
    try {
      await saveAccount(account, values, { image: selectedImage })
      if (String(activeAccount.current) !== String(account.id)) return
      setAccount((current) => ({ ...current, businessAccountImage: imagePreview }))
      setSelectedImage(null)
      toast.success(copy("saved"))
    } catch (error) {
      if (String(activeAccount.current) === String(account.id))
        toast.error(accountErrorMessage(error, copy("saveError")))
    }
  }

  const section = (key, label, children) => (
    <Accordion.Item eventKey={key} className={styles.card}>
      <Accordion.Button className={styles.cardHeader}>
        <span className={styles.sectionNumber}>{Number(key) + 1}</span>
        {copy(label)}
        <span className={styles.chevron}>
          <FiChevronUp aria-hidden="true" />
        </span>
      </Accordion.Button>
      <Accordion.Body
        className={`${styles.cardBody} ${key === "3" ? styles.addressBody : ""} ${
          key === "4" ? styles.socialBody : ""
        }`}
      >
        {children}
      </Accordion.Body>
    </Accordion.Item>
  )
  const categoryText = selectedCategoryLabels(account?.categoryIds, categoryOptions, copy("categoryFallback")).join(
    locale === "ar" ? "، " : ", ",
  )
  const isEmailVerified = verifiedContacts.businessAccountEmail && same(email, verifiedContacts.businessAccountEmail)
  const isPhoneVerified =
    verifiedContacts.businessAccountPhoneNumber &&
    same(phone, verifiedContacts.businessAccountPhoneNumber) &&
    same(phoneCode, verifiedContacts.phoneCountryCode)
  const activation = (kind, verified) => (
    <button
      className={styles.inputAction}
      type="button"
      disabled={busy || Boolean(verified)}
      onClick={() => beginVerification(kind)}
    >
      {verified ? (
        <>
          <FiCheckCircle aria-hidden="true" /> {copy("verified")}
        </>
      ) : (
        copy("activate")
      )}
    </button>
  )
  return (
    <div className={styles.page} dir={locale === "ar" ? "rtl" : "ltr"}>
      <h1 className={styles.pageTitle}>{copy("pageTitle")}</h1>
      {loading && (
        <div className={styles.loading} role="status">
          {copy("loading")}
        </div>
      )}
      {loadError && (
        <div className={styles.errorBanner} role="alert">
          {copy("loadError")}{" "}
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            {copy("retry")}
          </button>
        </div>
      )}
      {!loading && account && (
        <>
          {lookupError && (
            <div className={styles.errorBanner} role="alert">
              {copy("loadError")}{" "}
              <button type="button" onClick={() => setLookupRetry((value) => value + 1)}>
                {copy("retry")}
              </button>
            </div>
          )}
          {serverError && (
            <div className={styles.errorBanner} role="alert">
              {serverError}
            </div>
          )}
          <form className={styles.form} noValidate onSubmit={handleSubmit(submit, () => setOpenPanels(PANELS))}>
            <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <Accordion alwaysOpen activeKey={openPanels} onSelect={(keys) => setOpenPanels(keys || [])}>
                {section(
                  "0",
                  "accountInfo",
                  <>
                    <div className={styles.logo}>
                      <button
                        type="button"
                        className={styles.logoButton}
                        aria-label={copy("changeImage")}
                        title={copy("changeImage")}
                        onClick={() => imageInput.current?.click()}
                      >
                        <img
                          className={styles.logoImage}
                          src={imagePreview || userImg}
                          alt={account.businessAccountName || copy("accountInfo")}
                        />
                        <span className={styles.logoOverlay}>
                          <FiCamera aria-hidden="true" />
                        </span>
                      </button>
                      <input
                        ref={imageInput}
                        type="file"
                        accept="image/*"
                        className="visually-hidden"
                        aria-label={copy("changeImage")}
                        onChange={changeImage}
                      />
                    </div>
                    <div className={styles.grid}>
                      <div className={styles.field}>
                        <div>
                          <label className={styles.label} htmlFor="businessAccountNameAr">
                            {copy("nameAr")}
                            <span style={{ color: "red", fontSize: "1.3rem" }}>*</span>
                          </label>
                          <input
                            id="businessAccountNameAr"
                            type="text"
                            dir="rtl"
                            className={styles.input}
                            aria-invalid={Boolean(errors.businessAccountNameAr)}
                            {...register("businessAccountNameAr", {
                              required: copy("required"),
                              validate: (value) => Boolean(value?.trim()) || copy("required"),
                            })}
                          />
                          {errors.businessAccountNameAr && (
                            <span className={styles.fieldError} role="alert">
                              {errors.businessAccountNameAr.message}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.field}>
                        <div>
                          <label className={styles.label} htmlFor="businessAccountNameEn">
                            {copy("nameEn")}
                            <span style={{ color: "red", fontSize: "1.3rem" }}>*</span>
                          </label>
                          <input
                            id="businessAccountNameEn"
                            type="text"
                            dir="ltr"
                            className={styles.input}
                            aria-invalid={Boolean(errors.businessAccountNameEn)}
                            {...register("businessAccountNameEn", {
                              required: copy("required"),
                              validate: (value) => Boolean(value?.trim()) || copy("required"),
                            })}
                          />
                          {errors.businessAccountNameEn && (
                            <span className={styles.fieldError} role="alert">
                              {errors.businessAccountNameEn.message}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.field}>
                        <div>
                          <label className={styles.label} htmlFor="businessAccountUserName">
                            {copy("username")}
                          </label>
                          <div className={styles.inputGroup}>
                            <span className={styles.inputIcon} aria-hidden="true">
                              <FiUser />
                            </span>
                            <input
                              id="businessAccountUserName"
                              type="text"
                              className={styles.input}
                              value={account.businessAccountUserName || ""}
                              readOnly
                            />
                          </div>
                        </div>
                      </div>
                      <div className={styles.field}>
                        <div>
                          <label className={styles.label} htmlFor="businessAccountEmail">
                            {copy("email")}
                            <span style={{ color: "red", fontSize: "1.3rem" }}>*</span>
                          </label>
                          <div className={styles.inputGroup}>
                            <span className={styles.inputIcon} aria-hidden="true">
                              <FiMail />
                            </span>
                            <input
                              id="businessAccountEmail"
                              type="email"
                              dir="ltr"
                              className={styles.input}
                              aria-invalid={Boolean(errors.businessAccountEmail)}
                              {...register("businessAccountEmail", {
                                required: copy("required"),
                                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: copy("invalidEmail") },
                              })}
                            />
                            {activation("email", isEmailVerified)}
                          </div>
                          {errors.businessAccountEmail && (
                            <span className={styles.fieldError} role="alert">
                              {errors.businessAccountEmail.message}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.field}>
                        <div>
                          <label className={styles.label} htmlFor="businessAccountPhoneNumber">
                            {copy("phone")}
                            <span style={{ color: "red", fontSize: "1.3rem" }}>*</span>
                          </label>
                          <div className={`${styles.inputGroup} ${styles.phoneGroup}`}>
                            <span className={styles.inputIcon} aria-hidden="true">
                              <FiPhone />
                            </span>
                            <input
                              className={`${styles.input} ${styles.countryCode}`}
                              type="tel"
                              aria-label={copy("countryCode")}
                              aria-invalid={Boolean(errors.phoneCountryCode)}
                              {...register("phoneCountryCode", {
                                required: copy("required"),
                                pattern: { value: /^\+?\d{1,4}$/, message: copy("invalidPhone") },
                              })}
                            />
                            <input
                              id="businessAccountPhoneNumber"
                              className={`${styles.input} ${styles.phoneNumber}`}
                              type="tel"
                              aria-invalid={Boolean(errors.businessAccountPhoneNumber)}
                              {...register("businessAccountPhoneNumber", {
                                required: copy("required"),
                                validate: (value) =>
                                  /^\d{4,15}$/.test(String(value || "").replace(/[\s()-]/g, "")) ||
                                  copy("invalidPhone"),
                              })}
                            />
                            {activation("phone", isPhoneVerified)}
                          </div>
                          {(errors.businessAccountPhoneNumber || errors.phoneCountryCode) && (
                            <span className={styles.fieldError} role="alert">
                              {errors.businessAccountPhoneNumber?.message || errors.phoneCountryCode?.message}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.field}>
                        <div>
                          <label className={styles.label} htmlFor="accountCategories">
                            {copy("categories")}
                          </label>
                          <div className={styles.inputGroup}>
                            <span className={styles.inputIcon} aria-hidden="true">
                              <FiGrid />
                            </span>
                            <input
                              id="accountCategories"
                              type="text"
                              className={styles.input}
                              value={categoryText}
                              readOnly
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>,
                )}
                {/* Second Step */}
                {section(
                  "1",
                  "verification",
                  <>
                    <div className={styles.grid}>
                      <div className={`${styles.field} ${styles.fullWidth}`}>
                        <div>
                          <label className={styles.label} htmlFor="registrationDocumentType">
                            {copy("documentType")}
                          </label>
                          <div className={styles.inputGroup}>
                            <span className={styles.inputIcon} aria-hidden="true">
                              <FiShield />
                            </span>
                            <input
                              id="registrationDocumentType"
                              type="text"
                              className={styles.input}
                              value={copy(freelance ? "freelance" : "commercial")}
                              readOnly
                            />
                          </div>
                        </div>
                      </div>
                      {freelance ? (
                        <>
                          <div className={`${styles.field} ${styles.fullWidth}`}>
                            <div>
                              <label className={styles.label} htmlFor="freelanceCertificateId">
                                {copy("freelanceCertificateId")}
                              </label>
                              <input
                                id="freelanceCertificateId"
                                type="text"
                                className={styles.input}
                                value={account.freelanceCertificateId || ""}
                                readOnly
                              />
                            </div>
                          </div>
                          <div className={styles.field}>
                            <div>
                              <label className={styles.label} htmlFor="freelanceCertificateNationalIdNumber">
                                {copy("freelanceNationalId")}
                              </label>
                              <input
                                id="freelanceCertificateNationalIdNumber"
                                type="text"
                                className={styles.input}
                                value={account.freelanceCertificateNationalIdNumber || ""}
                                readOnly
                              />
                            </div>
                          </div>
                          <div className={styles.field}>
                            <div>
                              <label className={styles.label} htmlFor="freelanceExpiryDate">
                                {copy("freelanceExpiry")}
                              </label>
                              <input
                                id="freelanceExpiryDate"
                                type="date"
                                className={styles.input}
                                value={dateOnly(account.freelanceExpiryDate)}
                                readOnly
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className={`${styles.field} ${styles.fullWidth}`}>
                            <div>
                              <label className={styles.label} htmlFor="detailRegistrationNumber">
                                {copy("registrationNumber")}
                              </label>
                              <input
                                id="detailRegistrationNumber"
                                type="text"
                                className={styles.input}
                                value={account.detailRegistrationNumber || ""}
                                readOnly
                              />
                            </div>
                          </div>
                          <div className={`${styles.field} ${styles.fullWidth}`}>
                            <div>
                              <label className={styles.label} htmlFor="commercialRegistrationName">
                                {copy("commercialName")}
                              </label>
                              <input
                                id="commercialRegistrationName"
                                type="text"
                                className={styles.input}
                                value={account.commercialRegistrationName || ""}
                                readOnly
                              />
                            </div>
                          </div>
                          <div className={styles.field}>
                            <div>
                              <label className={styles.label} htmlFor="unifiedNationalEstablishmentNumber">
                                {copy("establishmentNumber")}
                              </label>
                              <input
                                id="unifiedNationalEstablishmentNumber"
                                type="text"
                                className={styles.input}
                                value={account.unifiedNationalEstablishmentNumber || ""}
                                readOnly
                              />
                            </div>
                          </div>
                          <div className={styles.field}>
                            <div>
                              <label className={styles.label} htmlFor="commercialRegistrationAnnualConfirmationDate">
                                {copy("annualConfirmation")}
                              </label>
                              <input
                                id="commercialRegistrationAnnualConfirmationDate"
                                type="date"
                                className={styles.input}
                                value={dateOnly(account.commercialRegistrationAnnualConfirmationDate)}
                                readOnly
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    {!freelance && (
                      <>
                        <h3 className={styles.subheading}>{copy("document2")}</h3>
                        <DocumentCards documents={account.businessAccountCertificates} types={[2]} copy={copy} />
                        <h3 className={styles.subheading} style={{ color: "var(--account-coral)" }}>
                          {copy("representativeInfo")}
                        </h3>
                        <div className={styles.grid}>
                          <div className={styles.field}>
                            <div>
                              <label className={styles.label} htmlFor="representativeFullName">
                                {copy("representativeName")}
                              </label>
                              <input
                                id="representativeFullName"
                                type="text"
                                className={styles.input}
                                value={account.representativeFullName || ""}
                                readOnly
                              />
                            </div>
                          </div>
                          <div className={styles.field}>
                            <div>
                              <label className={styles.label} htmlFor="representativeNationalIdNumber">
                                {copy("nationalId")}
                              </label>
                              <input
                                id="representativeNationalIdNumber"
                                type="text"
                                className={styles.input}
                                value={account.representativeNationalIdNumber || ""}
                                readOnly
                              />
                            </div>
                          </div>
                          <div className={styles.field}>
                            <div>
                              <label className={styles.label} htmlFor="representativeNationalIdExpiryDate">
                                {copy("nationalIdExpiry")}
                              </label>
                              <input
                                id="representativeNationalIdExpiryDate"
                                type="date"
                                className={styles.input}
                                value={dateOnly(account.representativeNationalIdExpiryDate)}
                                readOnly
                              />
                            </div>
                          </div>
                          <div className={`${styles.field} ${styles.fullWidth}`}>
                            <div>
                              <label className={styles.label} htmlFor="representativeRelationshipToBusiness">
                                {copy("relationship")}
                              </label>
                              <input
                                id="representativeRelationshipToBusiness"
                                type="text"
                                className={styles.input}
                                value={account.representativeRelationshipToBusiness || ""}
                                readOnly
                              />
                            </div>
                          </div>
                        </div>
                        <DocumentCards documents={account.businessAccountCertificates} types={[3, 4]} copy={copy} />
                      </>
                    )}
                    {freelance && (
                      <DocumentCards documents={account.businessAccountCertificates} types={[5, 6]} copy={copy} />
                    )}
                    <h3 className={styles.subheading}>{copy("additionalDocuments")}</h3>
                    <DocumentCards
                      documents={account.businessAccountCertificates}
                      types={freelance ? [5, 6, 7] : [2, 3, 4, 7]}
                      extra
                      copy={copy}
                    />
                  </>,
                )}
                {/* Third/last Step */}
                {section(
                  "2",
                  "vat",
                  <>
                    <div className={styles.field}>
                      <span className={styles.label} id="vat-registered-label">
                        {copy("vatRegistered")}
                      </span>
                      <div
                        className={styles.radioRow}
                        role="radiogroup"
                        aria-labelledby="vat-registered-label"
                        aria-readonly="true"
                      >
                        {[true, false].map((value) => (
                          <label className={styles.radioChoice} key={String(value)}>
                            <input
                              type="radio"
                              name="readonlyVat"
                              checked={Boolean(account.isVatRegistered) === value}
                              disabled
                              readOnly
                            />
                            {copy(value ? "yes" : "no")}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className={styles.grid}>
                      <div className={styles.field}>
                        <div>
                          <label className={styles.label} htmlFor="vatNumber">
                            {copy("vatNumber")}
                          </label>
                          <input
                            id="vatNumber"
                            type="text"
                            className={styles.input}
                            value={account.vatNumber || ""}
                            readOnly
                          />
                        </div>
                      </div>
                      <div className={styles.field}>
                        <div>
                          <span className="d-block f-b mb-2">{copy("document7")}</span>
                          <DocumentCards documents={account.businessAccountCertificates} types={[7]} copy={copy} />
                        </div>
                      </div>
                    </div>
                  </>,
                )}
                {section(
                  "3",
                  "address",
                  <>
                    {/* <option disabled value={0}>
                              {pathOr("", [locale, "Settings", "selectCountry"], t)}
                            </option> */}
                    <BusinessAddress
                      register={register}
                      watch={watch}
                      setValue={setValue}
                      countries={countries}
                      locale={locale}
                      copy={copy}
                      disabled={busy}
                      errors={errors}
                    />
                  </>,
                )}
                {section(
                  "4",
                  "social",
                  <div className={`${styles.grid} ${styles.socialGrid}`}>
                    <div className={styles.field}>
                      <div>
                        <label className={styles.label} htmlFor="businessAccountWebsite">
                          {copy("website")}
                        </label>
                        <div className={styles.inputGroup}>
                          <span className={styles.inputIcon} aria-hidden="true">
                            <img src={editAccountWebsite.src} alt="" />
                          </span>
                          <input
                            id="businessAccountWebsite"
                            type="text"
                            dir="ltr"
                            className={styles.input}
                            {...register("businessAccountWebsite")}
                          />
                        </div>
                      </div>
                    </div>
                    <div className={styles.field}>
                      <div>
                        <label className={styles.label} htmlFor="businessAccountFaceBook">
                          {copy("facebook")}
                        </label>
                        <div className={styles.inputGroup}>
                          <span className={styles.inputIcon} aria-hidden="true">
                            <img src={editAccountFacebook.src} alt="" />
                          </span>
                          <input
                            id="businessAccountFaceBook"
                            type="text"
                            dir="ltr"
                            className={styles.input}
                            {...register("businessAccountFaceBook")}
                          />
                        </div>
                      </div>
                    </div>
                    <div className={styles.field}>
                      <div>
                        <label className={styles.label} htmlFor="businessAccountSnapchat">
                          {copy("snapchat")}
                        </label>
                        <div className={styles.inputGroup}>
                          <span className={styles.inputIcon} aria-hidden="true">
                            <img src={editAccountSnapchat.src} alt="" />
                          </span>
                          <input
                            id="businessAccountSnapchat"
                            type="text"
                            dir="ltr"
                            className={styles.input}
                            {...register("businessAccountSnapchat")}
                          />
                        </div>
                      </div>
                    </div>
                    <div className={styles.field}>
                      <div>
                        <label className={styles.label} htmlFor="businessAccountYouTube">
                          {copy("youtube")}
                        </label>
                        <div className={styles.inputGroup}>
                          <span className={styles.inputIcon} aria-hidden="true">
                            <img src={editAccountYoutube.src} alt="" style={{ width: 28, height: 20 }} />
                          </span>
                          <input
                            id="businessAccountYouTube"
                            type="text"
                            dir="ltr"
                            className={styles.input}
                            {...register("businessAccountYouTube")}
                          />
                        </div>
                      </div>
                    </div>
                    <div className={styles.field}>
                      <div>
                        <label className={styles.label} htmlFor="businessAccountTikTok">
                          {copy("tiktok")}
                        </label>
                        <div className={styles.inputGroup}>
                          <span className={styles.inputIcon} aria-hidden="true">
                            <img src={editAccountTiktok.src} alt="" style={{ width: 21, height: 24 }} />
                          </span>
                          <input
                            id="businessAccountTikTok"
                            type="text"
                            dir="ltr"
                            className={styles.input}
                            {...register("businessAccountTikTok")}
                          />
                        </div>
                      </div>
                    </div>
                    <div className={styles.field}>
                      <div>
                        <label className={styles.label} htmlFor="businessAccountInstagram">
                          {copy("instagram")}
                        </label>
                        <div className={styles.inputGroup}>
                          <span className={styles.inputIcon} aria-hidden="true">
                            <img src={editAccountInstagram.src} alt="" />
                          </span>
                          <input
                            id="businessAccountInstagram"
                            type="text"
                            dir="ltr"
                            className={styles.input}
                            {...register("businessAccountInstagram")}
                          />
                        </div>
                      </div>
                    </div>
                    <div className={styles.field}>
                      <div>
                        <label className={styles.label} htmlFor="businessAccountTwitter">
                          {copy("twitter")}
                        </label>
                        <div className={styles.inputGroup}>
                          <span className={styles.inputIcon} aria-hidden="true">
                            <img src={editAccountTwitter.src} alt="" />
                          </span>
                          <input
                            id="businessAccountTwitter"
                            type="text"
                            dir="ltr"
                            className={styles.input}
                            {...register("businessAccountTwitter")}
                          />
                        </div>
                      </div>
                    </div>
                    <div className={styles.field}>
                      <div>
                        <label className={styles.label} htmlFor="businessAccountLinkedIn">
                          {copy("linkedin")}
                        </label>
                        <div className={styles.inputGroup}>
                          <span className={styles.inputIcon} aria-hidden="true">
                            <img src={editAccountLinkedin.src} alt="" />
                          </span>
                          <input
                            id="businessAccountLinkedIn"
                            type="text"
                            dir="ltr"
                            className={styles.input}
                            {...register("businessAccountLinkedIn")}
                          />
                        </div>
                      </div>
                    </div>
                  </div>,
                )}
              </Accordion>
              <div className={styles.actions}>
                <button className={styles.saveButton} type="submit">
                  {isSubmitting ? copy("loading") : copy("save")}
                </button>
                <button className={styles.cancelButton} type="button" onClick={() => push("/settings")}>
                  {copy("cancel")}
                </button>
              </div>
            </fieldset>
          </form>
          {target && (
            <ContactVerification
              key={account.id}
              target={target}
              baseline={account}
              copy={copy}
              locale={locale}
              onClose={() => setTarget(null)}
              onSaved={contactSaved}
            />
          )}
        </>
      )}
    </div>
  )
}

export default EditBussinessAccount
