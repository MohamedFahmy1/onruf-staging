import { Modal } from "react-bootstrap"
import t from "../../../../translations.json"
import { pathOr } from "ramda"
import { useRouter } from "next/router"
import failed from "../../../../../public/images/failed.png"
import success from "../../../../../public/images/success.png"
import Image from "next/image"
import { useEffect, useState } from "react"
import { textAlignStyle } from "../../../../styles/stylesObjects"
import axios from "axios"
import Alerto from "../../../../common/Alerto"

const PointsModal = ({ isPointsModalOpen, setIsPointsModalOpen, totalCost, handleAccept, toggleOffPaymentOption }) => {
  const { locale } = useRouter()
  const [points, setPoints] = useState()

  const fetchMyPointsData = async () => {
    try {
      const response = await axios.post(`/GetPointsBalance`)
      setPoints(response?.data?.data)
    } catch (error) {
      Alerto(error)
    }
  }

  useEffect(() => {
    isPointsModalOpen && fetchMyPointsData()
  }, [isPointsModalOpen])

  const pointsValue = points?.pointsBalance * (points?.monyOfPointsTransfered / points?.pointsCountToTransfer)

  const isSufficient = pointsValue >= totalCost
  const pointsOfTotalCost = points
    ? Math.ceil(totalCost * (points?.pointsCountToTransfer / points?.monyOfPointsTransfered))
    : 0

  const closeModal = () => {
    setIsPointsModalOpen(false)
    toggleOffPaymentOption()
  }

  const handleConfirm = () => {
    if (!points) return
    if (!isSufficient) {
      closeModal()
      return
    }
    handleAccept(pointsValue, pointsOfTotalCost)
    setIsPointsModalOpen(false)
  }

  return (
    <Modal
      show={isPointsModalOpen}
      onHide={closeModal}
      centered
      className="unique-send-offer-modal"
      style={textAlignStyle(locale)}
    >
      <Modal.Header className="justify-content-end">
        <button type="button" className="btn-close" aria-label="close modal" onClick={closeModal}></button>
      </Modal.Header>
      <Modal.Body className="py-0">
        <h1 className="disc-header fs-4 text-center  p-0" style={{ marginBottom: "50px" }}>
          {pathOr("", [locale, "Products", "MyPoints"], t)}
        </h1>
        {!points ? (
          <div className="d-flex flex-column justify-content-center text-center" style={{ minHeight: 260 }}>
            <p style={{ fontSize: "18px", marginTop: "20px" }}>{locale === "en" ? "Loading..." : "جاري التحميل..."}</p>
          </div>
        ) : (
          <div className="d-flex flex-column justify-content-center text-center">
            <Image src={isSufficient ? success : failed} alt="points" width={150} height={150} />
            <p style={{ fontSize: "26px", marginTop: "40px" }}>
              {pathOr("", [locale, "Products", "PointsBalance"], t)} {pointsValue}{" "}
              {pathOr("", [locale, "Products", "currency"], t)}
            </p>
            <p style={{ marginBottom: "20px" }}>
              {isSufficient
                ? pathOr("", [locale, "Products", "SuccessPointsDesc"], t)
                : pathOr("", [locale, "Products", "ErrorPointsDesc"], t)}
            </p>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="modal-footer">
        <button type="button" className="btn-main" aria-label="next step" onClick={handleConfirm} disabled={!points}>
          {pathOr("", [locale, "Products", "Accept"], t)}
        </button>
      </Modal.Footer>
    </Modal>
  )
}

export default PointsModal
