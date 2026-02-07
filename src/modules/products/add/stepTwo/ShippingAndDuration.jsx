import { pathOr } from "ramda"
import { Accordion, Col, Modal, Row } from "react-bootstrap"
import styles from "./stepTwo.module.css"
import { useRouter } from "next/router"
import { textAlignStyle } from "../../../../styles/stylesObjects"
import t from "../../../../translations.json"
import { useFetch } from "../../../../hooks/useFetch"
import { useState } from "react"
import { onlyNumbersInInputs } from "../../../../common/functions"
import { FaEdit } from "react-icons/fa"

const ShippingAndDuration = ({ productPayload, setProductPayload, validateDurationAndShipping, setEventKey }) => {
  const { locale } = useRouter()
  const { data: shippingOptions } = useFetch("/GetAllShippingOptions")

  const secondaryShippingOptions = [
    {
      id: 4,
      shippingOptionName: pathOr("", [locale, "Products", "integratedShippingOptions"], t),
      shippingOptionDescription: pathOr("", [locale, "Products", "integratedShippingOptions"], t),
      shippingOptionImage: "",
    },
    {
      id: 5,
      shippingOptionName: pathOr("", [locale, "Products", "freeShippingWithinSaudi"], t),
      shippingOptionDescription: pathOr("", [locale, "Products", "freeShippingWithinSaudi"], t),
      shippingOptionImage: "",
    },
    {
      id: 6,
      shippingOptionName: pathOr("", [locale, "Products", "arrangementWithBuyer"], t),
      shippingOptionDescription: pathOr("", [locale, "Products", "arrangementWithBuyer"], t),
      shippingOptionImage: "",
    },
  ]

  const [showModal, setShowModal] = useState(false)

  const handleShippingOptions = (optionIndex) => {
    const primaryOptions = [1, 2, 3]
    if (primaryOptions.includes(optionIndex)) {
      setProductPayload((prev) => ({
        ...prev,
        ShippingOptions: prev.ShippingOptions.filter((value) => !primaryOptions.includes(value)),
      }))
    }

    // if the shipping option was not selected
    if (!productPayload.ShippingOptions?.includes(optionIndex)) {
      setProductPayload((prev) => ({
        ...prev,
        ShippingOptions: [...prev.ShippingOptions, +optionIndex],
      }))
      // clear all other options if 2 and 3 options not selected in the array
      if (optionIndex === 1) {
        setProductPayload((prev) => ({
          ...prev,
          ShippingOptions: prev.ShippingOptions.filter((value) => value < 4),
        }))
      }
      if (optionIndex === 4) {
        setShowModal(true)
      }
    }
    // if the shipping option is already selected
    else if (productPayload.ShippingOptions?.includes(optionIndex)) {
      if (optionIndex === 4) {
        setProductPayload((prev) => ({
          ...prev,
          ShippingOptions: prev.ShippingOptions.filter((value) => value !== optionIndex),
          "Box.Weight": "",
          "Box.Width": "",
          "Box.Length": "",
          "Box.Height": "",
        }))
      } else {
        setProductPayload((prev) => ({
          ...prev,
          ShippingOptions: prev.ShippingOptions.filter((value) => value !== optionIndex),
        }))
      }
    }
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
                  {pathOr("", [locale, "Products", "shippingOptions"], t)}
                  <RequiredSympol />
                </label>
              </div>
            </Col>

            <Col lg={6} md={6} xs={12}>
              {shippingOptions
                ?.filter((v) => [1, 2, 3].includes(v.id))
                .map((item) => (
                  <div className="form-group" key={item.id}>
                    <div className="form-control outer-check-input">
                      <div className="form-check form-switch p-0 m-0">
                        <input
                          className="form-check-input m-0"
                          type="checkbox"
                          role="switch"
                          id={item.id + " ShippingOptions"}
                          checked={productPayload.ShippingOptions?.includes(item.id)}
                          onChange={() => handleShippingOptions(item.id)}
                        />
                        <label htmlFor={item.id + " ShippingOptions"}>{item.shippingOptionName}</label>
                        <span className="bord" />
                      </div>
                    </div>
                  </div>
                ))}
            </Col>

            {(productPayload.ShippingOptions?.includes(2) || productPayload.ShippingOptions?.includes(3)) && (
              <Col lg={6} md={6} xs={12}>
                {secondaryShippingOptions.map((item) => (
                  <div className="form-group" key={item.id}>
                    <div className="form-control outer-check-input orange-border">
                      <div className="form-check form-switch p-0 m-0 d-flex justify-content-between align-items-center">
                        <div>
                          <input
                            className="form-check-input m-0"
                            type="checkbox"
                            role="switch"
                            id={item.id + " ShippingOptions"}
                            checked={productPayload.ShippingOptions?.includes(item.id)}
                            onChange={() => handleShippingOptions(item.id)}
                          />
                          <label htmlFor={item.id + " ShippingOptions"}>{item.shippingOptionName}</label>
                        </div>
                        {item.id === 4 && (
                          <FaEdit
                            className="pointer"
                            color="#ee6c4d"
                            onClick={() => {
                              setShowModal(true)
                              if (!productPayload.ShippingOptions?.includes(4)) {
                                setProductPayload((prev) => ({
                                  ...prev,
                                  ShippingOptions: [...prev.ShippingOptions, 4],
                                }))
                              }
                            }}
                            size={20}
                          />
                        )}
                        <span className="bord" />
                      </div>
                    </div>
                  </div>
                ))}
              </Col>
            )}
          </Row>
        </form>
      </div>
      <button
        className="btn-main mt-3"
        type="button"
        onClick={() => {
          // if (pathname.includes("edit")) {
          //   validateAll() === true && handleGoToReviewPage()
          // } else {
          validateDurationAndShipping() === true && setEventKey("5")
          // }
        }}
      >
        {pathOr("", [locale, "Products", "next"], t)}
      </button>
      <Modal
        show={showModal}
        onHide={() => {
          setShowModal(false)
          handleShippingOptions(4)
          setProductPayload((prev) => ({
            ...prev,
            "Box.Weight": "",
            "Box.Width": "",
            "Box.Length": "",
            "Box.Height": "",
          }))
        }}
        centered
        className="modal-lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>{pathOr("", [locale, "Products", "shippingOptions"], t)}</Modal.Title>
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
                        let value = e.target.value
                        setProductPayload({ ...productPayload, "Box.Weight": value })
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
                        let value = e.target.value
                        setProductPayload({ ...productPayload, "Box.Width": value })
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
                        let value = e.target.value
                        setProductPayload({ ...productPayload, "Box.Length": value })
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
                      let value = e.target.value
                      setProductPayload({ ...productPayload, "Box.Height": value })
                    }}
                  />
                </div>
              </div>
            </Col>
          </Row>
          <div className="w-100">
            <button
              className="btn-main"
              style={{ margin: "0 auto", display: "block", width: "250px", marginTop: "20px" }}
              onClick={() => setShowModal(false)}
              disabled={
                !productPayload["Box.Weight"] ||
                !productPayload["Box.Width"] ||
                !productPayload["Box.Length"] ||
                !productPayload["Box.Height"]
              }
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
