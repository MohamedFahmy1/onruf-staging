import { Modal } from "react-bootstrap"
import { useRouter } from "next/router"
import { useState } from "react"
import { FiAlertTriangle, FiX } from "react-icons/fi"
import { RiDeleteBin5Line } from "react-icons/ri"
import { toast } from "react-toastify"
import t from "../../../translations.json"
import { assertCanRemoveBankAccount, removeBankAccount } from "./bankAccounts.mjs"
import styles from "./BankAccounts.module.css"

const DeleteModal = ({ account, disabled, refreshAccounts, onBusyChange, iconClassName }) => {
  const { locale } = useRouter()
  const copy = t[locale === "en" ? "en" : "ar"].BankAccounts
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const openDelete = () => {
    try {
      assertCanRemoveBankAccount(account)
      setOpen(true)
    } catch (error) {
      toast.error(error.code === "BANK_DEFAULT_PROTECTED" ? copy.defaultProtected : copy.contractError)
    }
  }

  const remove = async () => {
    if (disabled) return
    setLoading(true)
    onBusyChange(true)
    let saved = false
    try {
      assertCanRemoveBankAccount(account)
      await removeBankAccount(account.id)
      saved = true
      setOpen(false)
      await refreshAccounts()
      toast.success(copy.deleteSuccess)
    } catch (error) {
      const body = error?.response?.data
      toast.error(
        saved
          ? copy.savedRefreshFailed
          : error.code === "BANK_DEFAULT_PROTECTED"
          ? copy.defaultProtected
          : body?.message || body?.Message || copy.deleteError,
      )
    } finally {
      setLoading(false)
      onBusyChange(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={iconClassName}
        disabled={disabled}
        onClick={openDelete}
        aria-label={`${copy.deleteAccount}: ${account.bankName}`}
      >
        <RiDeleteBin5Line aria-hidden="true" />
      </button>
      <Modal
        show={open}
        onHide={() => !loading && setOpen(false)}
        centered
        keyboard={!loading}
        backdrop={loading ? "static" : true}
        dialogClassName={styles.confirmDialog}
        className={styles.modalLayer}
        backdropClassName={styles.backdropLayer}
        contentClassName={styles.confirmContent}
        style={{ direction: locale === "en" ? "ltr" : "rtl" }}
        aria-labelledby={`delete-bank-${account.id}`}
      >
        <button
          type="button"
          className={styles.close}
          onClick={() => setOpen(false)}
          disabled={loading}
          aria-label={copy.close}
        >
          <FiX />
        </button>
        <FiAlertTriangle className={styles.warning} aria-hidden="true" />
        <h2 id={`delete-bank-${account.id}`} className={styles.confirmTitle}>
          {copy.deleteQuestion}
        </h2>
        <p className={styles.confirmBody}>{account.bankName}</p>
        <div className={styles.confirmActions}>
          <button type="button" className={styles.confirmButton} onClick={remove} disabled={disabled}>
            {loading ? copy.saving : copy.confirm}
          </button>
          <button type="button" className={styles.cancelButton} onClick={() => setOpen(false)} disabled={loading}>
            {copy.cancel}
          </button>
        </div>
      </Modal>
    </>
  )
}

export default DeleteModal
