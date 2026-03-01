import { pathOr, set } from "ramda"
import { Accordion, Col, Modal, Row } from "react-bootstrap"
import styles from "./stepTwo.module.css"
import { useRouter } from "next/router"
import { textAlignStyle } from "../../../../styles/stylesObjects"
import t from "../../../../translations.json"
import { useState } from "react"
import { onlyNumbersInInputs } from "../../../../common/functions"
import { FaEdit } from "react-icons/fa"

const ShippingAndDuration = ({
  productPayload,
  setProductPayload,
  shippingType,
  setShippingType,
  validateDurationAndShipping,
  setEventKey,
}) => {
  const { locale } = useRouter()
  const [showModal, setShowModal] = useState(false)

  const hasSavedBoxDimensions =
    !!productPayload["Box.Weight"] &&
    !!productPayload["Box.Width"] &&
    !!productPayload["Box.Length"] &&
    !!productPayload["Box.Height"]

  const clearBoxDimensions = () => {
    setProductPayload((prev) => ({
      ...prev,
      "Box.Weight": "",
      "Box.Width": "",
      "Box.Length": "",
      "Box.Height": "",
    }))
  }

  const handleSelectService = () => {
    setShippingType("service")
    setShowModal(false)
    clearBoxDimensions()
  }

  const handleSelectProduct = () => {
    setShippingType("product")
    setShowModal(true)
  }

  const RequiredSympol = () => <span style={{ color: "red", fontSize: "1.3rem" }}>*</span>

  return (
    <Accordion.Body className={`${styles["accordion-body"]} accordion-body`}>
      <div className="form-content">
        <form>
          <Row>
            <Col lg={12}>
              <div className="form-group">
                <label style={{ ...textAlignStyle(locale), display: "block" }}>
                  {pathOr("", [locale, "Products", "productType"], t)}
                  <RequiredSympol />
                </label>
              </div>
            </Col>

            <Col lg={6} md={6} xs={12}>
              <div className="form-group">
                <div className="form-control outer-check-input">
                  <div className="form-check form-switch p-0 m-0">
                    <div className="d-flex align-items-center justify-content-between">
                      <label htmlFor="service-shipping-type">
                        {pathOr("", [locale, "Products", "serviceOption"], t)}
                      </label>
                      <input
                        className="form-check-input m-0"    
                        type="checkbox"
                        role="switch"
                        id="service-shipping-type"
                        checked={shippingType === "service"}
                        onChange={handleSelectService}
                      />
                    </div>
                    <span className="bord" />
                  </div>
                </div>
              </div>
            </Col>

            <Col lg={6} md={6} xs={12}>
              <div className="form-group">
                <div className="form-control outer-check-input">
                  <div className="form-check form-switch p-0 m-0">
                    <div className="d-flex align-items-center justify-content-between">
                      <label htmlFor="product-shipping-type">
                        {pathOr("", [locale, "Products", "productOption"], t)}
                      </label>
                      <input
                        className="form-check-input m-0"
                        type="checkbox"
                        role="switch"
                        id="product-shipping-type"
                        checked={shippingType === "product"}
                        onChange={handleSelectProduct}
                      />
                    </div>

                    {hasSavedBoxDimensions && (
                      <FaEdit className="pointer" color="#ee6c4d" onClick={handleSelectProduct} size={20} />
                    )}

                    <span className="bord" />
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </form>
      </div>

      <button
        className="btn-main mt-3"
        type="button"
        onClick={() => {
          validateDurationAndShipping() === true && setEventKey("5")
        }}
      >
        {pathOr("", [locale, "Products", "next"], t)}
      </button>

      <Modal
        show={showModal}
        onHide={() => {
          setShowModal(false)
          if (!hasSavedBoxDimensions) {
            clearBoxDimensions()
            setShippingType()
          }
        }}
        centered
        className="modal-lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>{pathOr("", [locale, "Products", "productOption"], t)}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col lg={6} md={6} xs={12}>
              <div className="form-group">
                <label
                  style={{ ...textAlignStyle(locale), display: "block" }}
                  htmlFor={pathOr("", [locale, "Products", "weight"], t)}
                >
                  {pathOr("", [locale, "Products", "weight"], t)}
                  <RequiredSympol />
                </label>
                <div
                  style={{
                    flexDirection: locale === "en" ? "row-reverse" : "row",
                  }}
                >
                  <div className="po_R flex-grow-1">
                    <input
                      id={pathOr("", [locale, "Products", "weight"], t)}
                      type="number"
                      className={`${styles["form-control"]} form-control`}
                      min={0}
                      value={productPayload["Box.Weight"] || ""}
                      onKeyDown={(e) => onlyNumbersInInputs(e)}
                      onChange={(e) => {
                        const value = e.target.value
                        setProductPayload((prev) => ({ ...prev, "Box.Weight": value }))
                      }}
                    />
                  </div>
                </div>
              </div>
            </Col>

            <Col lg={6} md={6} xs={12}>
              <div className="form-group">
                <label
                  style={{ ...textAlignStyle(locale), display: "block" }}
                  htmlFor={pathOr("", [locale, "Products", "width"], t)}
                >
                  {pathOr("", [locale, "Products", "width"], t)}
                  <RequiredSympol />
                </label>
                <div
                  style={{
                    flexDirection: locale === "en" ? "row-reverse" : "row",
                  }}
                >
                  <div className="po_R flex-grow-1">
                    <input
                      id={pathOr("", [locale, "Products", "width"], t)}
                      type="number"
                      className={`${styles["form-control"]} form-control`}
                      min={0}
                      value={productPayload["Box.Width"] || ""}
                      onKeyDown={(e) => onlyNumbersInInputs(e)}
                      onChange={(e) => {
                        const value = e.target.value
                        setProductPayload((prev) => ({ ...prev, "Box.Width": value }))
                      }}
                    />
                  </div>
                </div>
              </div>
            </Col>
          </Row>

          <Row>
            <Col lg={6} md={6} xs={12}>
              <div className="form-group">
                <label style={{ ...textAlignStyle(locale), display: "block" }}>
                  {pathOr("", [locale, "Products", "length"], t)}
                  <RequiredSympol />
                </label>
                <div
                  style={{
                    flexDirection: locale === "en" ? "row-reverse" : "row",
                  }}
                >
                  <div className="po_R flex-grow-1">
                    <input
                      id={pathOr("", [locale, "Products", "length"], t)}
                      type="number"
                      className={`${styles["form-control"]} form-control`}
                      min={0}
                      value={productPayload["Box.Length"] || ""}
                      onKeyDown={(e) => onlyNumbersInInputs(e)}
                      onChange={(e) => {
                        const value = e.target.value
                        setProductPayload((prev) => ({ ...prev, "Box.Length": value }))
                      }}
                    />
                  </div>
                </div>
              </div>
            </Col>

            <Col lg={6} md={6} xs={12}>
              <div className="form-group">
                <label style={{ ...textAlignStyle(locale), display: "block" }}>
                  {pathOr("", [locale, "Products", "height"], t)}
                  <RequiredSympol />
                </label>
              </div>
              <div
                style={{
                  flexDirection: locale === "en" ? "row-reverse" : "row",
                }}
              >
                <div className="po_R flex-grow-1">
                  <input
                    id={pathOr("", [locale, "Products", "height"], t)}
                    type="number"
                    className={`${styles["form-control"]} form-control`}
                    min={0}
                    value={productPayload["Box.Height"] || ""}
                    onKeyDown={(e) => onlyNumbersInInputs(e)}
                    onChange={(e) => {
                      const value = e.target.value
                      setProductPayload((prev) => ({ ...prev, "Box.Height": value }))
                    }}
                  />
                </div>
              </div>
            </Col>
          </Row>

          <div className="w-100">
            <button
              type="button"
              className="btn-main"
              style={{ margin: "0 auto", display: "block", width: "250px", marginTop: "20px" }}
              onClick={() => setShowModal(false)}
              disabled={!hasSavedBoxDimensions}
            >
              {pathOr("", [locale, "Products", "save"], t)}
            </button>
          </div>
        </Modal.Body>
      </Modal>
    </Accordion.Body>
  )
}

export default ShippingAndDuration
