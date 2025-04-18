import { Modal } from "react-bootstrap"
import t from "../../../../translations.json"
import { pathOr } from "ramda"
import { useRouter } from "next/router"
import wallet from "../../../../../public/images/wallet.png"
import Image from "next/image"
import { useEffect } from "react"
import { useFetch } from "../../../../hooks/useFetch"
import { textAlignStyle } from "../../../../styles/stylesObjects"

const PointsModal = ({ isPointsModalOpen, setIsPointsModalOpen, totalCost, handleAccept }) => {
  const { locale } = useRouter()
  const { data: points } = useFetch(`/GetUserPointsTransactions`)

  const pointsValue = points?.pointsBalance * (points?.monyOfPointsTransfered / points?.pointsCountToTransfer)

  const isSufficient = pointsValue > totalCost

  const closeModal = () => {
    setIsPointsModalOpen(false)
  }

  useEffect(() => {
    if (points) {
      isSufficient ? handleAccept(points?.walletBalance) : null
    }
  }, [isSufficient, points])

  return (
    <Modal
      show={isPointsModalOpen && points}
      onHide={() => setIsPointsModalOpen(false)}
      centered
      className="unique-send-offer-modal"
      style={textAlignStyle(locale)}
    >
      <Modal.Header className="justify-content-end">
        <button
          type="button"
          className="btn-close"
          aria-label="close modal"
          onClick={() => setIsPointsModalOpen(false)}
        ></button>
      </Modal.Header>
      <Modal.Body className="py-0">
        <h1 className="disc-header fs-4 text-center  p-0" style={{ marginBottom: "50px" }}>
          {pathOr("", [locale, "Products", "MyPoints"], t)}
        </h1>
        <div className="d-flex flex-column justify-content-center text-center">
          <Image src={wallet} alt="wallet" width={230} height={230} />
          <p style={{ fontSize: "26px", marginTop: "40px" }}>
            {pathOr("", [locale, "Products", "PointsBalance"], t)} {pointsValue}{" "}
            {pathOr("", [locale, "Products", "currency"], t)}
          </p>
          {isSufficient ? (
            <p style={{ marginBottom: "20px" }}>{pathOr("", [locale, "Products", "SuccessPointsDesc"], t)}</p>
          ) : (
            <p style={{ marginBottom: "20px" }}>{pathOr("", [locale, "Products", "ErrorPointsDesc"], t)}</p>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer className="modal-footer">
        <button type="button" className="btn-main" aria-label="next step" onClick={closeModal}>
          {pathOr("", [locale, "Products", "Accept"], t)}
        </button>
      </Modal.Footer>
    </Modal>
  )
}

export default PointsModal
