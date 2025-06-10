import { useRouter } from "next/router"
import { Col, Container, Form, Modal, Row } from "react-bootstrap"
import { textAlignStyle } from "../../../styles/stylesObjects"
import confirmDelivery from "../../../../public/images/confirmDelivery.png"
import Image from "next/image"
import styles from "./OrdersDetails.module.css"
import { useRef, useState, useEffect } from "react"
import { pathOr } from "ramda"
import t from "../../../translations.json"
import { toast } from "react-toastify"
import axios from "axios"

const ConfirmDeliveryModal = ({ isModalOpen, setIsModalOpen, orderId, handleCloseOtherModal }) => {
  const { locale } = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const [codes, setCodes] = useState(["", "", "", ""])
  const inputsRef = [useRef(), useRef(), useRef(), useRef()]

  // when modal opens, focus first input
  useEffect(() => {
    if (isModalOpen) {
      // slight delay to let Modal finish opening
      setTimeout(() => {
        inputsRef[0].current?.focus()
      }, 100)
    }
  }, [isModalOpen])

  const handleChange = (e, idx) => {
    // only keep last digit, strip non-digits
    const val = e.target.value.replace(/[^0-9]/g, "").slice(-1)
    setCodes((prev) => {
      const next = [...prev]
      next[idx] = val
      return next
    })
    if (val && idx < 3) {
      inputsRef[idx + 1].current.focus()
    }
  }

  const handleKeyDown = (e, idx) => {
    if (e.key === "Backspace" && codes[idx] === "" && idx > 0) {
      // move back one field
      inputsRef[idx - 1].current.focus()
    }
  }

  const handleSubmit = async () => {
    const code = codes.join("")
    try {
      setIsLoading(true)
      await axios.post(`/ChangeOrderStatus?orderId=${orderId}&status=6&confirmationCode=${code}`)
      toast.success(locale === "en" ? "Order Status Updated Successfully!" : "!تم تغيير حالة المنتج بنجاح")
      setIsModalOpen(false)
      handleCloseOtherModal()
      setIsLoading(false)
    } catch (error) {
      setIsLoading(false)
      toast.error(error.response.data.message)
    }
  }

  return (
    <Modal
      show={isModalOpen}
      onHide={() => setIsModalOpen(false)}
      centered
      className="unique-send-offer-modal"
      style={{ ...textAlignStyle(locale), zIndex: 1200 }}
    >
      <Modal.Header className="justify-content-end">
        <button type="button" className="btn-close" aria-label="close modal" onClick={() => setIsModalOpen(false)} />
      </Modal.Header>
      <Modal.Body className="py-0">
        <div className="d-flex flex-column justify-content-center text-center">
          <Image src={confirmDelivery} width={300} height={300} alt="confirm delivery" className="w-50 mx-auto" />
          <h5 className="fw-bold mt-4">{pathOr("", [locale, "Orders", "ConfirmDelivery1"], t)}</h5>
          <p>{pathOr("", [locale, "Orders", "ConfirmDelivery2"], t)}</p>
          <Container className="mt-4">
            <Row className="justify-content-center">
              {codes.map((digit, i) => (
                <Col key={i} xs="3" className="d-flex justify-content-center">
                  <Form.Control
                    type="text"
                    maxLength={1}
                    value={digit}
                    ref={inputsRef[i]}
                    onChange={(e) => handleChange(e, i)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                    className={`text-center ${styles["circle-input"]}`}
                  />
                </Col>
              ))}
            </Row>
          </Container>
          <button className="btn-main w-50 mx-auto my-4" onClick={handleSubmit} disabled={isLoading}>
            {pathOr("", [locale, "Orders", "Confirm"], t)}
          </button>
        </div>
      </Modal.Body>
    </Modal>
  )
}

export default ConfirmDeliveryModal
