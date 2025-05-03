import { Modal } from "react-bootstrap"
import t from "../../../translations.json"
import { pathOr } from "ramda"
import { useRouter } from "next/router"
import { useState } from "react"
import axios from "axios"
import { PiWarningCircle } from "react-icons/pi"
import { RiDeleteBin5Line } from "react-icons/ri"
import { toast } from "react-toastify"
import { textAlignStyle } from "../../../styles/stylesObjects"

const DeleteModal = ({ id, setBankTransferData, fetchBankTransfer }) => {
  const { locale } = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const handleDeleteBankTransfer = async (bankId) => {
    try {
      setLoading(true)
      await axios.delete(`/RemoveBankTransfer`, { params: { id: bankId } })
      setBankTransferData((prev) => prev.filter((b) => b.id !== bankId))
      toast.success(locale === "en" ? "Payment method has been deleted successfully!" : "تم مسح وسيلة الدفع بنجاح")
      fetchBankTransfer()
      closeModal()
      setLoading(false)
    } catch (error) {
      setLoading(false)
      toast.error(
        locale === "en"
          ? "Can't delete method as it's part of a product payment option!"
          : "تعذر المسح لانه مرتبط كوسيلة دفع لمنتج",
      )
    }
  }

  return (
    <>
      <button className="btn_edit" aria-label="delete account" onClick={() => setIsModalOpen(true)}>
        <RiDeleteBin5Line />
      </button>
      <Modal
        show={isModalOpen}
        onHide={closeModal}
        centered
        className="unique-send-offer-modal deleteModal"
        size="lg"
        style={{ ...textAlignStyle(locale) }}
      >
        <Modal.Header className="justify-content-end">
          <button
            type="button"
            className="btn-close"
            aria-label="close modal"
            onClick={() => setIsModalOpen(false)}
          ></button>
        </Modal.Header>
        <Modal.Body className="py-0">
          <div className="d-flex flex-column justify-content-center text-center">
            <PiWarningCircle size={160} color="var(--main)" style={{ marginInline: "auto" }} />
            <p style={{ fontSize: "26px", marginTop: "40px" }}>
              {pathOr("", [locale, "Settings", "DeletePaymentOption"], t)}
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer className="modal-footer bg-white">
          <button
            type="button"
            className="btn-main fs-6"
            style={{ width: "326px" }}
            aria-label="delete payment option"
            onClick={() => handleDeleteBankTransfer(id)}
            disabled={loading}
          >
            {pathOr("", [locale, "Products", "Yes"], t)}
          </button>
          <button type="button" className="btn-main-B w-100 mt-4 mb-4 fs-6" aria-label="cancel" onClick={closeModal}>
            {pathOr("", [locale, "Products", "cancel"], t)}
          </button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default DeleteModal
