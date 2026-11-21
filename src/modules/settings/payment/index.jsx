import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/router"
import Image from "next/image"
import { Col, Modal, OverlayTrigger, Tooltip } from "react-bootstrap"
import { AiOutlinePlus } from "react-icons/ai"
import { BiEditAlt } from "react-icons/bi"
import { FiAlertTriangle, FiInfo, FiX } from "react-icons/fi"
import { useForm } from "react-hook-form"
import { toast } from "react-toastify"
import t from "../../../translations.json"
import RequiredSympol from "../../../common/RequiredSympol"
import DeleteModal from "./DeleteModal"
import BankVerification from "./BankVerification.jsx"
import { createBankVerification, isBankVerificationCurrent } from "./bankVerification.mjs"
import {
  assertBankAccountIsDefault,
  getBankAccount,
  hasDefaultAccount,
  listBankAccounts,
  saveBankAccount,
} from "./bankAccounts.mjs"
import styles from "./BankAccounts.module.css"

const PaymentCards = ({ businessAccount }) => {
  const { locale } = useRouter()
  const copy = t[locale === "en" ? "en" : "ar"].BankAccounts
  const [accounts, setAccounts] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState("")
  const [busy, setBusy] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmation, setConfirmation] = useState(null)
  const [fileName, setFileName] = useState("")
  const [verification, setVerification] = useState(null)
  const [verifiedDraft, setVerifiedDraft] = useState(null)
  const [success, setSuccess] = useState(null)
  const requestNumber = useRef(0)
  const mounted = useRef(true)
  const saving = useRef(false)
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm()
  const isDefault = watch("isMyFatoorahDepositAccount") === true
  const hasDefault = hasDefaultAccount(accounts)
  const firstAccount = !editing && accounts.length === 0
  const disabled = busy || listLoading || !!listError

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    setVerification(null)
    setVerifiedDraft(null)
  }, [
    businessAccount?.id,
    businessAccount?.businessAccountUserName,
    businessAccount?.businessAccountEmail,
    businessAccount?.businessAccountPhoneNumber,
    businessAccount?.phoneCountryCode,
  ])

  const errorMessage = (error, fallback) => {
    if (error?.code === "BANK_DEFAULT_CONTRACT") return copy.contractError
    if (error?.code === "BANK_DEFAULT_PROTECTED") return copy.defaultProtected
    const body = error?.response?.data
    return body?.message || body?.Message || body?.title || fallback
  }

  const refreshAccounts = useCallback(async () => {
    const request = ++requestNumber.current
    setListLoading(true)
    try {
      const data = await listBankAccounts()
      if (request === requestNumber.current) {
        setAccounts(data)
        setListError("")
      }
      return data
    } catch (error) {
      if (request === requestNumber.current) {
        setListError(error.code === "BANK_DEFAULT_CONTRACT" ? "contractError" : "loadError")
      }
      throw error
    } finally {
      if (request === requestNumber.current) setListLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshAccounts().catch(() => {})
    return () => {
      requestNumber.current += 1
    }
  }, [locale, refreshAccounts])

  const openAdd = () => {
    setVerifiedDraft(null)
    setEditing(null)
    setFileName("")
    reset({
      bankName: "",
      accountNumber: "",
      bankHolderName: "",
      ibanNumber: "",
      swiftCode: "",
      ibanCertificate: "",
      ibanCertificateFile: null,
      isMyFatoorahDepositAccount: accounts.length === 0,
    })
    setFormOpen(true)
  }

  const openEdit = async (account) => {
    setVerifiedDraft(null)
    setBusy(true)
    try {
      const details = await getBankAccount(account.id)
      if (!mounted.current) return
      setEditing(account)
      setFileName(details.fileName || "")
      reset({
        ...account,
        ...details,
        id: account.id,
        ibanCertificateFile: null,
        isMyFatoorahDepositAccount: account.isMyFatoorahDepositAccount,
      })
      setFormOpen(true)
    } catch (error) {
      toast.error(errorMessage(error, copy.loadError))
    } finally {
      setBusy(false)
    }
  }

  const prepareValues = (values) => ({
    ...values,
    id: editing?.id,
    ibanCertificateFile: values.ibanCertificateFile?.[0],
  })

  const beginVerification = (request) => {
    if (
      !businessAccount?.businessAccountUserName ||
      !businessAccount?.businessAccountPhoneNumber ||
      !businessAccount?.phoneCountryCode
    ) {
      toast.error(copy.verificationContactError)
      return
    }
    setVerifiedDraft(null)
    setVerification({ ...request, businessAccount: { ...businessAccount } })
    setConfirmation(null)
  }

  const changeFormDefault = (checked) => {
    if (!checked && (firstAccount || editing?.isMyFatoorahDepositAccount)) {
      toast.error(copy.defaultProtected)
      return
    }
    if (checked && accounts.some((account) => account.id !== editing?.id && account.isMyFatoorahDepositAccount)) {
      setConfirmation({ source: "form" })
    } else if (checked) {
      beginVerification({
        kind: "checkbox",
        values: { ...prepareValues(getValues()), isMyFatoorahDepositAccount: true },
      })
    } else {
      setValue("isMyFatoorahDepositAccount", false, { shouldValidate: true })
    }
  }

  const persistBankChange = async (values) => {
    if (saving.current || !mounted.current) return
    saving.current = true
    setBusy(true)
    let saved = false
    try {
      await saveBankAccount(values)
      saved = true
      if (!mounted.current) return
      setFormOpen(false)
      setVerification(null)
      setVerifiedDraft(null)
      const refreshed = await refreshAccounts()
      if (values.isMyFatoorahDepositAccount) {
        assertBankAccountIsDefault(refreshed, values)
      }
      setSuccess(values.isMyFatoorahDepositAccount ? "default" : "account")
    } catch (error) {
      if (!saved) throw error
      if (error.code === "BANK_DEFAULT_CONTRACT") setListError("contractError")
      toast.error(error.code === "BANK_DEFAULT_CONTRACT" ? copy.contractError : copy.savedRefreshFailed)
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  const submit = async (values) => {
    if (disabled) return
    if (!hasDefault && !values.isMyFatoorahDepositAccount) {
      toast.error(copy.chooseDefault)
      return
    }
    if (editing?.isMyFatoorahDepositAccount && !values.isMyFatoorahDepositAccount) {
      toast.error(copy.defaultProtected)
      return
    }
    const payload = prepareValues(values)
    if (!isBankVerificationCurrent(verifiedDraft, payload, businessAccount)) {
      beginVerification({ kind: "save", values: payload })
      return
    }
    try {
      await persistBankChange(payload)
    } catch (error) {
      toast.error(errorMessage(error, copy.saveError))
    }
  }

  const completeVerification = async (_contact, { expiresAt }) => {
    if (!mounted.current || !verification) return
    const proof = createBankVerification(verification.values, verification.businessAccount, expiresAt)
    if (!isBankVerificationCurrent(proof, verification.values, businessAccount)) {
      setVerification(null)
      toast.error(copy.verificationChanged)
      return
    }
    if (verification.kind === "checkbox") {
      setValue("isMyFatoorahDepositAccount", true, { shouldValidate: true })
      setVerifiedDraft(proof)
      setVerification(null)
      return
    }
    await persistBankChange(verification.values)
  }

  const confirmDefault = async () => {
    if (confirmation.source === "form") {
      beginVerification({
        kind: "checkbox",
        values: { ...prepareValues(getValues()), isMyFatoorahDepositAccount: true },
      })
      return
    }
    setBusy(true)
    try {
      const selected = confirmation.account
      const details = await getBankAccount(selected.id)
      if (!mounted.current) return
      beginVerification({
        kind: "card",
        values: { ...selected, ...details, id: selected.id, isMyFatoorahDepositAccount: true },
      })
    } catch (error) {
      toast.error(errorMessage(error, copy.loadError))
    } finally {
      setBusy(false)
    }
  }

  const fields = [
    ["bankName", "BankName", { required: copy.required }],
    [
      "accountNumber",
      "AccountNumber",
      { required: copy.required, pattern: { value: /^\d{16,17}$/, message: copy.accountNumberInvalid } },
    ],
    ["bankHolderName", "Holder's", { required: copy.required }],
    ["ibanNumber", "ibn", { required: copy.required, pattern: { value: /^[A-Za-z0-9]+$/, message: copy.ibanInvalid } }],
    ["swiftCode", "swift", {}],
  ]

  return (
    <Col lg={8}>
      <section className={styles.panel} aria-label={copy.bankAccountsTitle} aria-busy={busy || listLoading}>
        {listError && (
          <div className={styles.notice} role="alert">
            {copy[listError]}
            <button
              type="button"
              className={styles.retry}
              disabled={busy || listLoading}
              onClick={() => refreshAccounts().catch(() => {})}
            >
              {copy.retry}
            </button>
          </div>
        )}
        {!listError && !listLoading && accounts.length > 0 && !hasDefault && (
          <p className={styles.notice} role="status">
            {copy.chooseDefault}
          </p>
        )}
        <div className={styles.strip}>
          <button
            type="button"
            className={styles.add}
            onClick={openAdd}
            disabled={disabled}
            aria-label={copy.addNewBank}
          >
            <AiOutlinePlus aria-hidden="true" />
          </button>
          {accounts.length === 0 && (
            <p className={styles.empty} role="status">
              {listLoading ? copy.loading : listError ? "" : copy.noAccounts}
            </p>
          )}
          {accounts.map((account, index) => (
            <article
              key={account.id}
              className={`${styles.card} ${index % 2 === 0 ? styles.teal : styles.blue} ${
                account.isMyFatoorahDepositAccount ? styles.selected : ""
              }`}
            >
              <div className={styles.cardContent}>
                <div className={styles.cardHeader}>
                  {/* The bank symbol is decorative; the saved bank name identifies the account. */}
                  <Image
                    src="/images/bank-account-icon.svg"
                    alt=""
                    className={styles.bankIcon}
                    width={47}
                    height={50}
                  />
                  <div className={styles.actions}>
                    <DeleteModal
                      account={account}
                      disabled={disabled}
                      refreshAccounts={refreshAccounts}
                      onBusyChange={setBusy}
                      iconClassName={styles.iconButton}
                    />
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => openEdit(account)}
                      disabled={disabled}
                      aria-label={`${copy.editAccount}: ${account.bankName}`}
                    >
                      <BiEditAlt aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <h3 className={styles.bankName}>{copy.bankAccount}</h3>
                <p className={styles.bankSubtitle} title={account.bankName}>
                  {account.bankName}
                </p>
                <p className={styles.accountNumber} dir="ltr">
                  **** {String(account.accountNumber || "").slice(-4)}
                </p>
                <p className={styles.holder}>{account.bankHolderName}</p>
                <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip id={`payout-${account.id}`}>{copy.payoutTooltip}</Tooltip>}
                >
                  <label className={styles.payout}>
                    <input
                      type="checkbox"
                      className={styles.check}
                      checked={account.isMyFatoorahDepositAccount}
                      disabled={disabled}
                      aria-label={`${copy.payoutAccount}: ${account.bankName}`}
                      onChange={() =>
                        account.isMyFatoorahDepositAccount
                          ? toast.error(copy.defaultProtected)
                          : setConfirmation({ source: "card", account })
                      }
                    />
                    <span className={styles.payoutLabel}>{copy.payoutAccount}</span>
                    <FiInfo className={styles.info} aria-hidden="true" />
                  </label>
                </OverlayTrigger>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Payment Modal */}
      <Modal
        show={formOpen && !confirmation && !verification}
        onHide={() => {
          if (!busy) {
            setFormOpen(false)
            setVerifiedDraft(null)
          }
        }}
        centered
        dialogClassName={styles.formDialog}
        className={styles.modalLayer}
        backdropClassName={styles.backdropLayer}
        backdrop={busy ? "static" : true}
        keyboard={!busy}
        style={{ direction: locale === "en" ? "ltr" : "rtl" }}
        aria-labelledby="bank-form-title"
      >
        <Modal.Header>
          <h2 id="bank-form-title" className="h5 mb-0">
            {editing ? copy.editAccount : copy.addNewBank}
          </h2>
          <button
            type="button"
            className={styles.close}
            aria-label={copy.close}
            disabled={busy}
            onClick={() => {
              setFormOpen(false)
              setVerifiedDraft(null)
            }}
          >
            <FiX />
          </button>
        </Modal.Header>
        <form onSubmit={handleSubmit(submit)} onChange={() => setVerifiedDraft(null)}>
          <Modal.Body className={styles.formBody}>
            {fields.map(([name, label, rules]) => (
              <div key={name} className={styles.field}>
                <label htmlFor={`bank-${name}`}>
                  {copy[label]} {rules.required && <RequiredSympol />}
                </label>
                <input
                  id={`bank-${name}`}
                  className="form-control"
                  type="text"
                  {...register(name, rules)}
                  dir={name === "accountNumber" || name === "ibanNumber" || name === "swiftCode" ? "ltr" : undefined}
                  inputMode={name === "accountNumber" ? "numeric" : undefined}
                  maxLength={name === "accountNumber" ? 17 : undefined}
                  disabled={busy}
                  aria-invalid={!!errors[name]}
                  aria-describedby={errors[name] ? `bank-${name}-error` : undefined}
                />
                {errors[name] && (
                  <p id={`bank-${name}-error`} className="errorMsg">
                    {errors[name].message}
                  </p>
                )}
              </div>
            ))}
            <div className={styles.field}>
              <label htmlFor="bank-certificate">
                {copy.ibanCertificate} <RequiredSympol />
              </label>
              <input
                type="file"
                id="bank-certificate"
                accept=".png,.jpg,.jpeg,.pdf"
                disabled={busy}
                className="form-control"
                aria-invalid={!!errors.ibanCertificateFile}
                {...register("ibanCertificateFile", {
                  validate: (files) => !!files?.[0] || !!watch("ibanCertificate") || copy.certificateRequired,
                })}
              />
              {watch("ibanCertificate") && !watch("ibanCertificateFile")?.[0] && (
                <a href={watch("ibanCertificate")} target="_blank" rel="noopener noreferrer" className={styles.upload}>
                  {fileName || copy.savedCertificate}
                </a>
              )}
              {watch("ibanCertificateFile")?.[0] && <p className="mt-2 mb-0">{watch("ibanCertificateFile")[0].name}</p>}
              {errors.ibanCertificateFile && <p className="errorMsg">{errors.ibanCertificateFile.message}</p>}
            </div>
            <label className={styles.formDefault}>
              <input
                type="checkbox"
                checked={isDefault}
                disabled={busy || firstAccount}
                onChange={(event) => changeFormDefault(event.target.checked)}
              />
              {copy.setDefault}
            </label>
          </Modal.Body>
          <Modal.Footer>
            <button type="submit" className="btn-main" disabled={disabled}>
              {busy ? copy.saving : editing ? copy.save : copy.add}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      <Modal
        show={!!confirmation}
        onHide={() => !busy && setConfirmation(null)}
        centered
        dialogClassName={styles.confirmDialog}
        className={styles.modalLayer}
        backdropClassName={styles.backdropLayer}
        contentClassName={styles.confirmContent}
        backdrop={busy ? "static" : true}
        keyboard={!busy}
        aria-labelledby="payout-confirm-title"
        style={{ direction: locale === "en" ? "ltr" : "rtl" }}
      >
        <button
          type="button"
          className={styles.close}
          onClick={() => setConfirmation(null)}
          disabled={busy}
          aria-label={copy.close}
        >
          <FiX />
        </button>
        <FiAlertTriangle className={styles.warning} aria-hidden="true" />
        <h2 id="payout-confirm-title" className={styles.confirmTitle}>
          {copy.changeDefaultTitle}
        </h2>
        <p className={styles.confirmBody}>{copy.changeDefaultBody}</p>
        <div className={styles.confirmActions}>
          <button type="button" className={styles.confirmButton} onClick={confirmDefault} disabled={busy}>
            {busy ? copy.saving : copy.confirm}
          </button>
          <button type="button" className={styles.cancelButton} onClick={() => setConfirmation(null)} disabled={busy}>
            {copy.cancel}
          </button>
        </div>
      </Modal>
      {(verification || success) && (
        <BankVerification
          request={verification}
          success={success}
          copy={copy}
          locale={locale}
          onClose={() => {
            setVerification(null)
            setSuccess(null)
          }}
          onVerified={completeVerification}
        />
      )}
    </Col>
  )
}

export default PaymentCards
