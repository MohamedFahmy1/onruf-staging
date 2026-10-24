import { useCallback, useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/router"
import { useSelector } from "react-redux"
import Link from "next/link"
import axios from "axios"
import { toast } from "react-toastify"
import { pathOr } from "ramda"
import t from "../../translations.json"
import {
  FiCalendar,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiGrid,
  FiMail,
  FiPhone,
  FiUser,
} from "react-icons/fi"
import { BiSitemap } from "react-icons/bi"
import { HiOutlineCreditCard } from "react-icons/hi"
import { getContactUsLookups, getTicketDetails, listContactUs, saveContactUs } from "./api"
import { getApiError, getLookupLabel, getStatusLabel } from "./utils"
import AttachmentUpload from "./AttachmentUpload"
import styles from "./contact-us.module.css"

const emptyValues = {
  id: 0,
  typeOfCommunication: "",
  problemTitle: "",
  categoryId: "",
  subCategoryId: "",
  email: "",
  mobileNumber: "",
  meassageDetails: "",
}

const ContactUS = () => {
  const router = useRouter()
  const locale = router.locale || "ar"
  const english = locale === "en"
  const text = useCallback((key) => pathOr("", [locale, "ContactUs", key], t), [locale])
  const businessAccountId = useSelector((state) => state.authSlice.buisnessId)
  const [lookups, setLookups] = useState({ communicationTypes: [], categories: [], subCategories: [] })
  const [lookupsLoading, setLookupsLoading] = useState(true)
  const [lookupsError, setLookupsError] = useState("")
  const [tickets, setTickets] = useState([])
  const [ticketsLoading, setTicketsLoading] = useState(true)
  const [ticketsError, setTicketsError] = useState("")
  const [attachments, setAttachments] = useState([])
  const [savedAttachments, setSavedAttachments] = useState([])
  const [draftLoading, setDraftLoading] = useState(false)
  const [draftError, setDraftError] = useState("")
  const [profile, setProfile] = useState({ email: "", mobileNumber: "" })
  const draftContext = useRef(false)
  const {
    register,
    watch,
    reset,
    setValue,
    getValues,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: emptyValues })
  const categoryId = watch("categoryId")
  const selectedDraftId = watch("id")
  const subCategories = lookups.subCategories.filter((item) => String(item.categoryId) === String(categoryId))
  const required = text("formRequired")

  const fetchLookups = useCallback(async () => {
    setLookupsLoading(true)
    setLookupsError("")
    try {
      setLookups(await getContactUsLookups())
    } catch (error) {
      setLookupsError(getApiError(error, text("formFieldsError")))
    } finally {
      setLookupsLoading(false)
    }
  }, [text])

  const fetchTickets = useCallback(async () => {
    setTicketsLoading(true)
    setTicketsError("")
    try {
      const { tickets: items } = await listContactUs()
      setTickets(items)
    } catch (error) {
      setTicketsError(getApiError(error, text("formRequestsError")))
    } finally {
      setTicketsLoading(false)
    }
  }, [text])

  useEffect(() => {
    fetchLookups()
    fetchTickets()
  }, [fetchLookups, fetchTickets])

  useEffect(() => {
    if (!businessAccountId) return
    let active = true
    axios
      .get("/GetBusinessAccountById", { params: { businessAccountId } })
      .then(({ data }) => {
        if (!active) return
        const account = data?.data || {}
        const contacts = {
          email: account.businessAccountEmail || "",
          mobileNumber: account.businessAccountPhoneNumber || "",
        }
        setProfile(contacts)
        if (!getValues("email")) setValue("email", contacts.email)
        if (!getValues("mobileNumber")) setValue("mobileNumber", contacts.mobileNumber)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [businessAccountId, getValues, setValue])

  useEffect(() => {
    if (!router.isReady) return
    const draftId = Number(router.query.draft)
    if (!Number.isSafeInteger(draftId) || draftId <= 0) {
      setDraftLoading(false)
      setDraftError(router.query.draft ? text("formInvalidDraft") : "")
      if (draftContext.current) {
        reset({ ...emptyValues, ...profile })
        setAttachments([])
        setSavedAttachments([])
        draftContext.current = false
      }
      return
    }
    draftContext.current = true
    let active = true
    setDraftLoading(true)
    setDraftError("")
    getTicketDetails(draftId)
      .then((draft) => {
        if (!active) return
        if (draft?.status !== 9) throw new Error(text("formNotDraft"))
        reset({
          ...emptyValues,
          ...draft,
          typeOfCommunication: String(draft.typeOfCommunication ?? ""),
          categoryId: draft.categoryId ? String(draft.categoryId) : "",
          subCategoryId: draft.subCategoryId ? String(draft.subCategoryId) : "",
        })
        setAttachments([])
        setSavedAttachments(draft.attachments || [])
      })
      .catch((error) => {
        if (active) setDraftError(getApiError(error, text("formDraftError")))
      })
      .finally(() => {
        if (active) setDraftLoading(false)
      })
    return () => {
      active = false
    }
  }, [router.isReady, router.query.draft, text, reset, profile])

  const submitTicket = async (values) => {
    try {
      await saveContactUs({ ...values, attachments }, { saveAsDraft: false })
      toast.success(text("formSubmitSuccess"))
      reset({ ...emptyValues, ...profile })
      setAttachments([])
      setSavedAttachments([])
      if (router.query.draft) await router.replace("/contact-us", undefined, { shallow: true })
      await fetchTickets()
    } catch (error) {
      toast.error(getApiError(error, text("formSubmitError")))
    }
  }

  const field = ({ name, label, icon: Icon, options, inputType = "text", validation, placeholder, disabled }) => (
    <div className={styles.fieldGroup}>
      <div className={`${styles.field} ${errors[name] ? styles.invalid : ""} ${disabled ? styles.disabled : ""}`}>
        {Icon && (
          <span className={styles.fieldIcon}>
            <Icon aria-hidden="true" />
          </span>
        )}
        <div className={styles.fieldContent}>
          <label htmlFor={`support-${name}`}>{label}</label>
          {options ? (
            <select
              id={`support-${name}`}
              {...register(name, validation)}
              value={watch(name) ?? ""}
              disabled={disabled || isSubmitting || draftLoading}
              aria-invalid={!!errors[name]}
              aria-describedby={errors[name] ? `support-${name}-error` : undefined}
              onChange={(event) => {
                register(name, validation).onChange(event)
                if (name === "categoryId") setValue("subCategoryId", "")
              }}
            >
              <option value="">{placeholder || text("formSelect")}</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {getLookupLabel(option, locale)}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`support-${name}`}
              type={inputType}
              {...register(name, validation)}
              placeholder={placeholder}
              readOnly={isSubmitting || draftLoading}
              dir={inputType === "email" || inputType === "tel" ? "ltr" : undefined}
              aria-invalid={!!errors[name]}
              aria-describedby={errors[name] ? `support-${name}-error` : undefined}
            />
          )}
        </div>
        {options && <FiChevronDown className={styles.fieldChevron} aria-hidden="true" />}
      </div>
      {errors[name] && (
        <p className={styles.fieldError} id={`support-${name}-error`} role="alert">
          {errors[name].message}
        </p>
      )}
    </div>
  )

  return (
    <div className={styles.page} dir={english ? "ltr" : "rtl"}>
      <h1 className={styles.pageTitle}>{text("formTitle")}</h1>
      <section className={styles.formCard} aria-labelledby="support-welcome">
        <div className={styles.welcome}>
          <h2 id="support-welcome">{text("formWelcome")}</h2>
          <p>{text("formHelpPrompt")}</p>
        </div>
        {lookupsError && (
          <div className={styles.errorNotice} role="alert">
            {lookupsError}
            <button type="button" onClick={fetchLookups}>
              {text("formRetry")}
            </button>
          </div>
        )}
        {draftError && (
          <div className={styles.errorNotice} role="alert">
            {draftError}
          </div>
        )}
        {draftLoading && (
          <p className={styles.notice} role="status">
            {text("formLoadingDraft")}
          </p>
        )}
        {selectedDraftId > 0 && <p className={styles.notice}>{text("formDraftInstructions")}</p>}
        <form
          onSubmit={handleSubmit(submitTicket)}
          noValidate
          aria-busy={isSubmitting || lookupsLoading || draftLoading}
        >
          <div className={styles.fields}>
            {field({
              name: "typeOfCommunication",
              label: text("formCommunicationType"),
              options: lookups.communicationTypes,
              disabled: lookupsLoading || !!lookupsError,
              validation: { required },
              placeholder: lookupsLoading ? text("formLoading") : text("formSelectCommunicationType"),
            })}
            {field({
              name: "problemTitle",
              label: text("formProblemTitle"),
              validation: { required, validate: (value) => !!value.trim() || required },
              placeholder: text("formProblemTitlePlaceholder"),
            })}
            {field({
              name: "categoryId",
              label: text("formCategory"),
              icon: FiGrid,
              options: lookups.categories,
              disabled: lookupsLoading || !!lookupsError,
              placeholder: text("formSelectCategory"),
            })}
            {field({
              name: "subCategoryId",
              label: text("formSubcategory"),
              icon: BiSitemap,
              options: subCategories,
              disabled: !categoryId || !subCategories.length || lookupsLoading,
              placeholder: text("formSelectSubcategory"),
            })}
            {field({
              name: "email",
              label: text("formEmail"),
              icon: FiMail,
              inputType: "email",
              validation: {
                required,
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: text("formEmailInvalid"),
                },
              },
              placeholder: text("formEmailPlaceholder"),
            })}
            {field({
              name: "mobileNumber",
              label: text("formPhoneNumber"),
              icon: FiPhone,
              inputType: "tel",
              validation: { required, validate: (value) => !!value.trim() || required },
              placeholder: text("formPhonePlaceholder"),
            })}
          </div>
          <div className={styles.messageGroup}>
            <label htmlFor="support-message">{text("formMessage")}</label>
            <textarea
              id="support-message"
              {...register("meassageDetails", { required, validate: (value) => !!value.trim() || required })}
              placeholder={text("formMessagePlaceholder")}
              className={errors.meassageDetails ? styles.invalid : undefined}
              readOnly={isSubmitting || draftLoading}
              aria-invalid={!!errors.meassageDetails}
              aria-describedby={errors.meassageDetails ? "support-message-error" : undefined}
            />
            {errors.meassageDetails && (
              <p className={styles.fieldError} id="support-message-error" role="alert">
                {errors.meassageDetails.message}
              </p>
            )}
          </div>
          <AttachmentUpload
            files={attachments}
            onChange={setAttachments}
            locale={locale}
            disabled={isSubmitting || draftLoading}
            existingFiles={savedAttachments}
          />
          <button
            className={styles.submitButton}
            type="submit"
            disabled={isSubmitting || lookupsLoading || !!lookupsError || draftLoading || !!draftError}
          >
            {isSubmitting ? text("formSending") : text("formSend")}
          </button>
        </form>
      </section>
      <section className={styles.requestsCard} aria-labelledby="support-requests">
        <div className={styles.requestsHeader}>
          <h2 id="support-requests">{text("formSubmittedRequests")}</h2>
          <p>{text("formRequestsDescription")}</p>
        </div>
        <div className={styles.requestsList} aria-busy={ticketsLoading}>
          {ticketsLoading ? (
            <p className={styles.emptyState} role="status">
              {text("formLoadingRequests")}
            </p>
          ) : ticketsError ? (
            <div className={styles.errorNotice} role="alert">
              {ticketsError}
              <button type="button" onClick={fetchTickets}>
                {text("formRetry")}
              </button>
            </div>
          ) : !tickets.length ? (
            <p className={styles.emptyState}>{text("formRequestsEmpty")}</p>
          ) : (
            tickets.map((ticket) => {
              const resolved = ticket.status === 5 || ticket.status === 6
              const draft = ticket.status === 9
              const date = ticket.createdAt ? new Date(ticket.createdAt) : null
              return (
                <article key={ticket.id} className={styles.requestRow}>
                  <div className={styles.requestIdentity}>
                    <span className={`${styles.requestIcon} ${resolved ? styles.resolvedIcon : ""}`}>
                      {resolved ? <FiUser aria-hidden="true" /> : <HiOutlineCreditCard aria-hidden="true" />}
                    </span>
                    <div>
                      <span className={styles.reference} dir="ltr">
                        {ticket.referenceNumber
                          ? `#${String(ticket.referenceNumber).replace(/^#/, "")}`
                          : `#${ticket.id}`}
                      </span>
                      <p>{ticket.problemTitle}</p>
                    </div>
                  </div>
                  <div className={styles.requestStatus}>
                    <span className={`${styles.statusBadge} ${resolved ? styles.resolved : draft ? styles.draft : ""}`}>
                      {getStatusLabel(ticket.status, locale)}
                    </span>
                  </div>
                  <div className={styles.requestDate}>
                    <FiCalendar aria-hidden="true" />
                    <time dateTime={ticket.createdAt || undefined} dir="ltr">
                      {date && !Number.isNaN(date.getTime())
                        ? date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                        : text("formDateUnavailable")}
                    </time>
                  </div>
                  <Link href={draft ? `/contact-us?draft=${ticket.id}` : `/contact-us/${ticket.id}`}>
                    <a className={styles.detailsLink}>
                      {draft ? text("formContinueDraft") : text("formViewDetails")}
                      {english ? <FiChevronRight aria-hidden="true" /> : <FiChevronLeft aria-hidden="true" />}
                    </a>
                  </Link>
                </article>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}

export default ContactUS
