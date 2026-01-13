import { Row, Col, Modal } from "react-bootstrap"
import t from "../../../translations.json"
import { pathOr } from "ramda"
import { useRouter } from "next/router"
import { toast } from "react-toastify"
import axios from "axios"
import { useState } from "react"
import ConfirmDeliveryModal from "./ConfirmDeliveryModal"

const ChangeStatusModal = ({ openModal, setOpenModal, selectedOrder }) => {
  const { locale } = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isConfirmDeliveryModalOpen, setIsConfirmDeliveryModalOpen] = useState(false)

  const changeOrderStatus = async (statusId) => {
    if (statusId == 6) {
      setIsConfirmDeliveryModalOpen(true)
      return
    } else if (selectedOrder) {
      try {
        setIsLoading(true)
        await axios.post(`/ChangeOrderStatus?orderId=${selectedOrder?.orderId}&status=${statusId}`)
        toast.success(locale === "en" ? "Order Status Updated Successfully!" : "!تم تغيير حالة المنتج بنجاح")
        setOpenModal(false)
        setIsLoading(false)
      } catch (error) {
        setIsLoading(false)
        toast.error(error.response.data.message)
      }
    }
  }

  return (
    <Modal show={openModal} onHide={() => setOpenModal(false)} className="mt-5">
      <Modal.Header>
        <h5 className="modal-title f-b main-color text-center" id="staticBackdropLabel">
          {pathOr("", [locale, "Orders", "changeOrderStatus"], t)}
        </h5>
        <button type="button" className="btn-close" onClick={() => setOpenModal(false)} />
      </Modal.Header>
      <Modal.Body>
        <Row>
          {/* <Col md={12}>
            <div className="mb-2 text-center">
              <button
                className={`fs-5 f-b ${selectedOrder?.orderStatus == 1 ? `main-color` : ``}`}
                disabled={isLoading}
                onClick={() => changeOrderStatus(1)}
              >
                {pathOr("", [locale, "Orders", "waiting_for_payment"], t)}
              </button>
            </div>
          </Col> */}
          {/* <Col md={12}>
            <div className="mb-2 text-center">
              <button
                className={`fs-5 f-b ${selectedOrder?.orderStatus == 2 ? `main-color` : ``}`}
                disabled={isLoading}
                onClick={() => changeOrderStatus(2)}
              >
                {pathOr("", [locale, "Orders", "waiting_for_review"], t)}
              </button>
            </div>
          </Col> */}
          {selectedOrder?.orderStatus <= 3 && (
            <Col md={12}>
              <div className="mb-2 text-center">
                <button
                  className={`fs-5 f-b ${selectedOrder?.orderStatus == 3 ? `main-color` : ``}`}
                  disabled={isLoading}
                  onClick={() => changeOrderStatus(3)}
                >
                  {pathOr("", [locale, "Orders", "in_progress"], t)}
                </button>
              </div>
            </Col>
          )}
          {/* <Col md={12}>
            <div className="mb-2 text-center">
              <button
                className={`fs-5 f-b ${selectedOrder?.orderStatus == 4 ? `main-color` : ``}`}
                disabled={isLoading}
                onClick={() => changeOrderStatus(4)}
              >
                {pathOr("", [locale, "Orders", "ready_for_delivery"], t)}
              </button>
            </div>
          </Col> */}
          {selectedOrder?.orderStatus <= 5 && (
            <Col md={12}>
              <div className="mb-2 text-center">
                <button
                  className={`fs-5 f-b ${selectedOrder?.orderStatus == 5 ? `main-color` : ``}`}
                  disabled={isLoading}
                  onClick={() => changeOrderStatus(5)}
                >
                  {pathOr("", [locale, "Orders", "delivery_in_progress"], t)}
                </button>
              </div>
            </Col>
          )}
          {selectedOrder?.orderStatus <= 3 && (
            <Col md={12}>
              <div className="mb-2 text-center">
                <button
                  className={`fs-5 f-b ${selectedOrder?.orderStatus == 6 ? `main-color` : ``}`}
                  disabled={isLoading}
                  onClick={() => changeOrderStatus(6)}
                >
                  {pathOr("", [locale, "Orders", "delivered"], t)}
                </button>
              </div>
            </Col>
          )}
          {selectedOrder?.orderStatus <= 3 && (
            <Col md={12}>
              <div className="mb-2 text-center">
                <button
                  className={`fs-5 f-b ${selectedOrder?.orderStatus == 7 ? `main-color` : ``}`}
                  disabled={isLoading}
                  onClick={() => changeOrderStatus(7)}
                >
                  {pathOr("", [locale, "Orders", "canceled"], t)}
                </button>
              </div>
            </Col>
          )}
        </Row>
      </Modal.Body>
      <ConfirmDeliveryModal
        isModalOpen={isConfirmDeliveryModalOpen}
        setIsModalOpen={setIsConfirmDeliveryModalOpen}
        orderId={selectedOrder?.orderId}
        handleCloseOtherModal={() => setOpenModal(false)}
      />
    </Modal>
  )
}

export default ChangeStatusModal
