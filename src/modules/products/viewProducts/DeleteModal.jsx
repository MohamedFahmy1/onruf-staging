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
import Alerto from "../../../common/Alerto"

const DeleteModal = ({ id, onDeleted }) => {
  const { locale } = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const handleDeleteProduct = async () => {
    try {
      setLoading(true)
      await axios.delete(`/RemoveProduct?id=${id}`)
      toast.success(locale === "en" ? "Products has been deleted successfully!" : "تم حذف المنتج بنجاح")
      closeModal()
      await onDeleted?.()
    } catch (error) {
      Alerto(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <RiDeleteBin5Line
        className="btn_Measures"
        role="button"
        aria-label={locale === "en" ? "delete product" : "حذف المنتج"}
        onClick={() => (loading ? null : setIsModalOpen(true))}
      />
      <Modal
        show={isModalOpen}
        onHide={closeModal}
        centered
        className="unique-send-offer-modal deleteModal"
        size="lg"
        style={{ ...textAlignStyle(locale) }}
      >
        <Modal.Header className="justify-content-end">
          <button type="button" className="btn-close" aria-label="close modal" onClick={closeModal}></button>
        </Modal.Header>
        <Modal.Body className="py-0">
          <div className="d-flex flex-column justify-content-center text-center">
            <PiWarningCircle size={160} color="var(--main)" style={{ marginInline: "auto" }} />
            <p style={{ fontSize: "26px", marginTop: "40px" }}>
              {pathOr(
                locale === "en" ? "Are you sure you want to delete this product ?" : "هل ترغب في مسح هذا المنتج ؟",
                [locale, "Products", "DeleteProductConfirm"],
                t,
              )}
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer className="modal-footer bg-white">
          <button
            type="button"
            className="btn-main fs-6"
            style={{ width: "326px" }}
            aria-label="delete product"
            onClick={handleDeleteProduct}
            disabled={loading}
          >
            {pathOr("", [locale, "Products", "Yes"], t)}
          </button>
          <button
            type="button"
            className="btn-main-B w-100 mt-4 mb-4 fs-6"
            aria-label="cancel"
            onClick={closeModal}
            disabled={loading}
          >
            {pathOr("", [locale, "Products", "cancel"], t)}
          </button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default DeleteModal


