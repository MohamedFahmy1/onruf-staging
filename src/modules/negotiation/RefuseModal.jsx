import { Modal } from "react-bootstrap"
import t from "../../translations.json"
import { pathOr } from "ramda"
import { useRouter } from "next/router"
import { toast } from "react-toastify"
import axios from "axios"
import Alerto from "../../common/Alerto"
import { useState } from "react"

const RefuseModal = ({ refuseModal, setRefuseModal, offerId, productId, getOffers }) => {
  const { locale } = useRouter()
  const [loading, setLoading] = useState(false)
  const [refuseReason, setRefuseReason] = useState("")

  const closeRefuseModal = () => {
    setRefuseReason("")
    setRefuseModal(false)
  }

  const refuseOffer = async () => {
    try {
      setLoading(true)
      const reason = refuseReason.trim()
      await axios.post("/AcceptRejectOffer", null, {
        params: {
          offerId,
          productId,
          acceptOffer: false,
          ...(reason && { refuseReason: reason }),
          OfferExpireHours: 0,
        },
      })
      toast.success(locale === "en" ? "Offer rejected Successfully!" : "تم رفض العرض ")
      closeRefuseModal()
      getOffers()
    } catch (error) {
      Alerto(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={refuseModal} onHide={closeRefuseModal} centered>
      <Modal.Header>
        <h5 className="disc-header">{pathOr("", [locale, "negotiation", "reject_negotiation_offer"], t)}</h5>
        <button type="button" className="btn-close" onClick={closeRefuseModal}></button>
      </Modal.Header>
      <Modal.Body>
        <div className="form-group">
          <label
            htmlFor={`refuse-reason-${offerId}`}
            className="disc-header"
            style={{ textAlign: locale === "en" ? "left" : "right" }}
          >
            {pathOr("", [locale, "negotiation", "reject_reason_optional"], t)}
          </label>
          <input
            id={`refuse-reason-${offerId}`}
            type="text"
            className="form-control form-input"
            style={{ textAlign: locale === "en" ? "left" : "right" }}
            value={refuseReason}
            onChange={(e) => setRefuseReason(e.target.value)}
          />
        </div>
      </Modal.Body>
      <Modal.Footer className="modal-footer">
        <button type="button" className="btn-main" disabled={loading} onClick={refuseOffer}>
          {pathOr("", [locale, "negotiation", "reject"], t)}
        </button>
      </Modal.Footer>
    </Modal>
  )
}

export default RefuseModal
