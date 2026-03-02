import { useMemo, useState } from "react"
import { useRouter } from "next/router"
import { pathOr } from "ramda"
import { Col, Modal, Row } from "react-bootstrap"
import { useFieldArray, useForm } from "react-hook-form"
import { toast } from "react-toastify"
import axios from "axios"
import t from "../../../translations.json"
import Alerto from "../../../common/Alerto"
import Image from "next/image"

const createEmptyBox = () => ({
  boxName: "",
  width: "",
  length: "",
  height: "",
  weight: "",
})

const getDeliveryCompaniesFromResponse = (responseData) => {
  const apiData = responseData?.data ?? responseData

  const extractCompanies = (item) => {
    if (!item || item.success === false) return []
    if (Array.isArray(item.deliveryCompany)) return item.deliveryCompany
    if (Array.isArray(item.deliveryCompanies)) return item.deliveryCompanies
    return []
  }

  if (Array.isArray(apiData)) {
    return apiData.flatMap(extractCompanies)
  }

  if (apiData && typeof apiData === "object") {
    return extractCompanies(apiData)
  }

  return []
}

const DeliveryOptionCard = ({ option, isSelected, onSelect, translate }) => {
  const renderValue = (value, suffix = "") => {
    if (value === null || value === undefined || value === "") return "-"
    return `${value}${suffix}`
  }

  return (
    <div className="col-lg-6 col-12 mb-3">
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            onSelect()
          }
        }}
        style={{
          border: `1px solid ${isSelected ? "#ee6c4d" : "#d9d9d9"}`,
          borderRadius: 18,
          padding: 16,
          cursor: "pointer",
          backgroundColor: "#fff",
          height: "100%",
        }}
      >
        <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
          <div className="d-flex align-items-center gap-3">
            {option.logo ? (
              <Image
                src={option.logo}
                alt={option.deliveryCompanyName}
                style={{ objectFit: "contain", borderRadius: 8 }}
                width={44}
                height={44}
              />
            ) : (
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  backgroundColor: "#f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  color: "#374151",
                }}
              >
                {(option.deliveryCompanyName || "?").slice(0, 1)}
              </div>
            )}

            <div>
              <h6 className="f-b m-0">{option.deliveryCompanyName || "-"}</h6>
            </div>
          </div>

          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: `2px solid ${isSelected ? "#ee6c4d" : "#c4c4c4"}`,
              backgroundColor: isSelected ? "#ee6c4d" : "transparent",
              boxShadow: isSelected ? "inset 0 0 0 3px #fff" : "none",
              flexShrink: 0,
            }}
          />
        </div>

        <div className="row g-3">
          <div className="col-4">
            <div className="fw-bold">{translate("shippingBillAvgDeliveryTime")}</div>
            <div className="text-muted">{renderValue(option.avgDeliveryTime)}</div>
          </div>
          <div className="col-4">
            <div className="fw-bold">{translate("shippingBillDeliveryOptionName")}</div>
            <div className="text-muted">{renderValue(option.deliveryOptionName)}</div>
          </div>
          <div className="col-4">
            <div className="fw-bold">{translate("shippingBillPickupDropoff")}</div>
            <div className="text-muted">{renderValue(option.pickupDropoff)}</div>
          </div>

          <div className="col-4">
            <div className="fw-bold">{translate("shippingBillPrice")}</div>
            <div className="text-muted">
              {option.price ?? "-"} {option.currency || ""}
            </div>
          </div>
          <div className="col-4">
            <div className="fw-bold">{translate("shippingBillMaxFreeWeight")}</div>
            <div className="text-muted">{renderValue(option.maxFreeWeight)}</div>
          </div>
          <div className="col-4">
            <div className="fw-bold">{translate("shippingBillMaxOrderValue")}</div>
            <div className="text-muted">{renderValue(option.maxOrderValue)}</div>
          </div>

          <div className="col-4">
            <div className="fw-bold">{translate("shippingBillExtraWeightPerKg")}</div>
            <div className="text-muted">{renderValue(option.extraWeightPerKg)}</div>
          </div>
          <div className="col-4">
            <div className="fw-bold">{translate("shippingBillServiceType")}</div>
            <div className="text-muted">{renderValue(option.serviceType)}</div>
          </div>
          <div className="col-4">
            <div className="fw-bold">{translate("shippingBillTrackingType")}</div>
            <div className="text-muted">{renderValue(option.trackingType)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

const ShippingBillModal = ({ orderId, isSubmitted, printAwbUrl, trackingUrl }) => {
  const { locale } = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deliveryOptions, setDeliveryOptions] = useState([])
  const [selectedDeliveryOptionId, setSelectedDeliveryOptionId] = useState(null)

  const translate = (key) => pathOr("", [locale, "Orders", key], t)

  const {
    control,
    register,
    handleSubmit,
    trigger,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      boxs: [createEmptyBox()],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "boxs",
  })

  const requiredValidation = useMemo(
    () => ({
      required: translate("shippingBillFieldRequired"),
    }),
    [locale],
  )

  const numberValidation = useMemo(
    () => ({
      required: translate("shippingBillFieldRequired"),
      valueAsNumber: true,
      validate: (value) => (Number.isFinite(value) && value > 0) || translate("shippingBillPositiveNumber"),
    }),
    [locale],
  )

  const resetModalState = () => {
    reset({ boxs: [createEmptyBox()] })
    setDeliveryOptions([])
    setSelectedDeliveryOptionId(null)
    setIsSubmitting(false)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    resetModalState()
  }

  const handleAddBox = async () => {
    const isValid = await trigger("boxs")
    if (!isValid) return

    append(createEmptyBox())
  }

  const handleRemoveBox = (index) => {
    if (fields.length === 1) {
      toast.error(translate("shippingBillAtLeastOneBox"))
      return
    }

    remove(index)
  }

  const onSubmitBoxes = async (values) => {
    if (!values.boxs?.length) {
      toast.error(translate("shippingBillAtLeastOneBox"))
      return
    }

    try {
      setIsSubmitting(true)

      const payload = {
        orderId: +orderId,
        boxs: values.boxs.map((box) => ({
          boxName: box.boxName.trim(),
          width: box.width,
          length: box.length,
          height: box.height,
          weight: box.weight,
        })),
      }

      const response = await axios.post("/CheckShippmentDeliveryFeeForProvider", payload)
      const availableOptions = getDeliveryCompaniesFromResponse(response?.data)

      setDeliveryOptions(availableOptions)
      setSelectedDeliveryOptionId(null)

      if (availableOptions.length === 0) {
        toast.error(translate("shippingBillNoDeliveryOptions"))
      }
    } catch (error) {
      Alerto(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateShipment = async () => {
    if (!selectedDeliveryOptionId) {
      toast.error(translate("shippingBillChooseOptionRequired"))
      return
    }

    try {
      setIsSubmitting(true)
      const response = await axios.post("/CreateShippment", {
        orderId: +orderId,
        deliveryOptionId: selectedDeliveryOptionId,
      })

      toast.success(response?.data?.message || translate("shippingBillCreatedSuccess"))
      handleCloseModal()
    } catch (error) {
      Alerto(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const showDeliveryOptionsStep = deliveryOptions.length > 0

  return (
    <>
      {isSubmitted ? (
        <div className="d-flex gap-2 flex-column">
          <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="btn-main btn-main-o">
            {translate("trackingUrl")}
          </a>
          <a href={printAwbUrl} target="_blank" rel="noopener noreferrer" className="btn-main btn-main-o">
            {translate("printAwbUrl")}
          </a>
        </div>
      ) : (
        <button type="button" className="btn-main btn-main-o" onClick={() => setIsModalOpen(true)}>
          {translate("shipping_bill")}
        </button>
      )}

      <Modal show={isModalOpen} onHide={handleCloseModal} centered dialogClassName="modal-lg">
        <Modal.Header>
          <h5 className="modal-title f-b main-color text-center">
            {showDeliveryOptionsStep ? translate("shippingBillDeliveryOptionsTitle") : translate("shipping_bill")}
          </h5>
          <button type="button" className="btn-close" onClick={handleCloseModal} />
        </Modal.Header>

        <Modal.Body>
          {!showDeliveryOptionsStep ? (
            <form onSubmit={handleSubmit(onSubmitBoxes)}>
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="mb-4"
                  style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 }}
                >
                  <div className="d-flex align-items-center justify-content-between mb-3 gap-2">
                    <h6 className="f-b m-0">
                      {translate("shippingBillBoxLabel")} #{index + 1}
                    </h6>
                    <button
                      type="button"
                      className="btn-main btn-main-o"
                      onClick={() => handleRemoveBox(index)}
                      disabled={isSubmitting}
                    >
                      {translate("shippingBillRemoveBox")}
                    </button>
                  </div>

                  <Row>
                    <Col md={12}>
                      <div className="form-group">
                        <label htmlFor={`box-name-${index}`}>{translate("shippingBillBoxName")}</label>
                        <input
                          id={`box-name-${index}`}
                          className="form-control"
                          {...register(`boxs.${index}.boxName`, {
                            ...requiredValidation,
                            validate: (value) => value.trim() !== "" || translate("shippingBillFieldRequired"),
                          })}
                        />
                        {errors?.boxs?.[index]?.boxName && (
                          <small className="text-danger d-block mt-1">{errors.boxs[index].boxName.message}</small>
                        )}
                      </div>
                    </Col>

                    <Col md={6}>
                      <div className="form-group">
                        <label htmlFor={`box-width-${index}`}>{translate("shippingBillWidth")}</label>
                        <input
                          id={`box-width-${index}`}
                          type="number"
                          min="0"
                          step="any"
                          className="form-control"
                          {...register(`boxs.${index}.width`, numberValidation)}
                        />
                        {errors?.boxs?.[index]?.width && (
                          <small className="text-danger d-block mt-1">{errors.boxs[index].width.message}</small>
                        )}
                      </div>
                    </Col>

                    <Col md={6}>
                      <div className="form-group">
                        <label htmlFor={`box-length-${index}`}>{translate("shippingBillLength")}</label>
                        <input
                          id={`box-length-${index}`}
                          type="number"
                          min="0"
                          step="any"
                          className="form-control"
                          {...register(`boxs.${index}.length`, numberValidation)}
                        />
                        {errors?.boxs?.[index]?.length && (
                          <small className="text-danger d-block mt-1">{errors.boxs[index].length.message}</small>
                        )}
                      </div>
                    </Col>

                    <Col md={6}>
                      <div className="form-group">
                        <label htmlFor={`box-height-${index}`}>{translate("shippingBillHeight")}</label>
                        <input
                          id={`box-height-${index}`}
                          type="number"
                          min="0"
                          step="any"
                          className="form-control"
                          {...register(`boxs.${index}.height`, numberValidation)}
                        />
                        {errors?.boxs?.[index]?.height && (
                          <small className="text-danger d-block mt-1">{errors.boxs[index].height.message}</small>
                        )}
                      </div>
                    </Col>

                    <Col md={6}>
                      <div className="form-group mb-0">
                        <label htmlFor={`box-weight-${index}`}>{translate("shippingBillWeight")}</label>
                        <input
                          id={`box-weight-${index}`}
                          type="number"
                          min="0"
                          step="any"
                          className="form-control"
                          {...register(`boxs.${index}.weight`, numberValidation)}
                        />
                        {errors?.boxs?.[index]?.weight && (
                          <small className="text-danger d-block mt-1">{errors.boxs[index].weight.message}</small>
                        )}
                      </div>
                    </Col>
                  </Row>
                </div>
              ))}

              <div className="d-flex justify-content-between gap-2 flex-wrap">
                <button type="button" className="btn-main btn-main-o" onClick={handleAddBox} disabled={isSubmitting}>
                  {translate("shippingBillAddBox")}
                </button>

                <button type="submit" className="btn-main" disabled={isSubmitting}>
                  {isSubmitting && (
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  )}
                  {translate("shippingBillCheckFee")}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="row">
                {deliveryOptions.map((option) => (
                  <DeliveryOptionCard
                    key={`${option.deliveryOptionId}-${option.deliveryCompanyName}`}
                    option={option}
                    isSelected={selectedDeliveryOptionId === option.deliveryOptionId}
                    onSelect={() => setSelectedDeliveryOptionId(option.deliveryOptionId)}
                    translate={translate}
                  />
                ))}
              </div>

              {deliveryOptions.length === 0 && (
                <p className="text-center fs-5 my-4">{translate("shippingBillNoDeliveryOptions")}</p>
              )}

              <div className="d-flex justify-content-between gap-2 flex-wrap mt-3">
                <button
                  type="button"
                  className="btn-main btn-main-o"
                  onClick={() => {
                    setDeliveryOptions([])
                    setSelectedDeliveryOptionId(null)
                  }}
                  disabled={isSubmitting}
                >
                  {translate("shippingBillBackToBoxes")}
                </button>

                <button
                  type="button"
                  className="btn-main"
                  onClick={handleCreateShipment}
                  disabled={isSubmitting || !selectedDeliveryOptionId}
                >
                  {isSubmitting && (
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  )}
                  {translate("shippingBillChooseOption")}
                </button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>
    </>
  )
}

export default ShippingBillModal
