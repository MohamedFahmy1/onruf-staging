import { Modal, Form, Button, Row, Col } from "react-bootstrap"
import t from "../../../../translations.json"
import { pathOr } from "ramda"
import { useRouter } from "next/router"
import { useFetch } from "../../../../hooks/useFetch"
import { useState } from "react"
import { textAlignStyle } from "../../../../styles/stylesObjects"
import { useForm } from "react-hook-form"
import { LoadingScreen } from "../../../../common/Loading"
import axios from "axios"
import Alerto from "../../../../common/Alerto"
import { toast } from "react-toastify"

const VisaModal = ({ isVisaModalOpen, setIsVisaModalOpen, handleAccept }) => {
  const { locale } = useRouter()
  const { data: visaList, isLoading, fetchData } = useFetch(`/BankTransfersList?PaymentAccountType=1`)

  const [selectedCard, setSelectedCard] = useState(null)
  const [cvvValues, setCvvValues] = useState({})
  const [step, setStep] = useState(1)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  const closeModal = () => {
    setIsVisaModalOpen(false)
  }

  const handleChooseCard = () => {
    const updatedData = {
      ...selectedCard,
      cvv: cvvValues[selectedCard.id],
    }
    handleAccept(updatedData)
    closeModal()
  }

  const handleSelectCard = (card) => {
    setSelectedCard(card)
    // Reset all CVV fields except the one selected
    setCvvValues({ [card.id]: cvvValues[card.id] || "" })
  }

  const onSubmit = async (data) => {
    const updatedData = {
      ...data,
      PaymentAccountType: 1,
    }
    const formData = new FormData()
    for (let key in updatedData) {
      formData.append(key, updatedData[key])
    }
    try {
      await axios.post("/AddBankTransfer", formData, { headers: { "Content-Type": "multipart/form-data" } })
      fetchData()
      toast.success(locale === "en" ? "Card has been added successfully!" : "تم اضافة البطاقة بنجاح")
      setStep(1)
    } catch (error) {
      Alerto(error)
    }
  }

  return (
    <Modal
      show={isVisaModalOpen}
      onHide={closeModal}
      centered
      className="unique-send-offer-modal"
      style={{ ...textAlignStyle(locale) }}
    >
      <Modal.Header className="justify-content-end">
        <button type="button" className="btn-close" aria-label="close modal" onClick={closeModal}></button>
      </Modal.Header>

      {step === 1 && (
        <>
          <Modal.Body className="py-0">
            <h1 className="fs-4 text-center mb-4">{pathOr("اختر البطاقة", [locale, "Products", "ChooseCard"], t)}</h1>

            {isLoading && <LoadingScreen height="300px" />}

            {!!visaList?.length > 0 ? (
              <Form style={{ overflowY: "scroll", height: "450px" }} className="px-2">
                {visaList?.map((card, idx) => (
                  <div key={card.id || idx} className={`p-3 mb-3 border rounded-4 position-relative`}>
                    <Form.Check
                      type="radio"
                      id={`card-${idx}`}
                      name="visa-card"
                      checked={selectedCard?.id === card.id}
                      onChange={() => handleSelectCard(card)}
                      label=""
                      style={{ insetInlineEnd: 10, top: 5 }}
                      className="mb-2 position-absolute"
                    />
                    <Row className="mb-4">
                      <Col md={6}>
                        <p className="fw-bold">{pathOr("", [locale, "Products", "NameOnCard"], t)}</p>
                        <div className="text-muted">{card.bankHolderName}</div>
                      </Col>
                      <Col md={6}>
                        <p className="fw-bold">{pathOr("", [locale, "Products", "CardNumber"], t)}</p>
                        <div className="text-muted"> {card.accountNumber?.slice(0, 10)}XXXXXX </div>
                      </Col>
                    </Row>
                    <Row className="mb-2">
                      <Col md={6}>
                        <div className="fw-bold">{pathOr("", [locale, "Products", "expiryDate"], t)}</div>
                        <div className="text-muted">{card.expiaryDate}</div>
                      </Col>
                      <Col md={6}>
                        <div className="fw-bold">{pathOr("", [locale, "Products", "CVV"], t)}</div>
                        <Form.Control
                          type="password"
                          placeholder=""
                          className="mt-1 p-0 h-75"
                          disabled={selectedCard?.id !== card.id}
                          value={cvvValues[card.id] || ""}
                          onChange={(e) =>
                            setCvvValues((prev) => ({
                              ...prev,
                              [card.id]: e.target.value,
                            }))
                          }
                        />
                      </Col>
                    </Row>
                  </div>
                ))}

                <Button variant="light" className="w-100 mb-3" onClick={() => setStep(2)}>
                  {pathOr("", [locale, "Products", "AddNewCard"], t)}
                </Button>
              </Form>
            ) : (
              <p>{locale === "en" ? "No cards found" : "لا يوجد بطاقات"}</p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              disabled={!selectedCard || !cvvValues[selectedCard.id]}
              className="w-100 btn-main"
              onClick={handleChooseCard}
            >
              {pathOr("", [locale, "Products", "Choose"], t)}
            </button>
          </Modal.Footer>
        </>
      )}

      {step === 2 && (
        <>
          <Modal.Body className="py-0">
            <h1 className="fs-4 text-center mb-4">{pathOr("اختر البطاقة", [locale, "Products", "ChooseCard"], t)}</h1>

            <Form onSubmit={handleSubmit(onSubmit)}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">
                  {pathOr("الاسم على البطاقة", [locale, "Products", "NameOnCard"], t)}
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder={locale === "en" ? "Ex: John Doe" : "مثال: Mohamed Ali"}
                  {...register("bankHolderName", {
                    required: locale === "en" ? "This field is required" : "من فضلك ادخل هذا الحقل",
                  })}
                />
                {errors.bankHolderName && <p className="text-danger">{errors.bankHolderName.message}</p>}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">
                  {pathOr("رقم البطاقة", [locale, "Products", "CardNumber"], t)}
                </Form.Label>
                <Form.Control
                  type="number"
                  placeholder="1234 5678 9012 3456"
                  {...register("accountNumber", {
                    required: locale === "en" ? "This field is required" : "هذا الحقل مطلوب",
                    minLength: {
                      value: 12,
                      message: locale === "en" ? "Card number is too short" : "رقم البطاقة قصير جداً",
                    },
                  })}
                />
                {errors.accountNumber && <p className="text-danger">{errors.accountNumber.message}</p>}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">
                  {pathOr("تاريخ الانتهاء", [locale, "Products", "expiryDate"], t)}
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="MM/YYYY"
                  {...register("expiaryDate", {
                    required: locale === "en" ? "This field is required" : "من فضلك ادخل هذا الحقل",
                    pattern: {
                      value: /^(0[1-9]|1[0-2])\/(20[2-9][0-9])$/,
                      message:
                        locale === "en"
                          ? "Invalid date format (MM/YYYY, months from 01 to 12)"
                          : "تنسيق التاريخ غير صحيح (شهر/سنة، الأشهر من 01 إلى 12)",
                    },
                  })}
                />
                {errors.expiaryDate && <p className="text-danger">{errors.expiaryDate.message}</p>}
              </Form.Group>

              <Form.Group className="mb-4 d-flex align-items-center gap-2 justify-content-between">
                <Form.Label htmlFor="saveForLaterUse" className="mb-0">
                  {pathOr("حفظ الاستخدام في وقت لاحق", [locale, "Products", "saveLater"], t)}
                </Form.Label>
                <Form.Check type="switch" id="saveForLaterUse" {...register("saveForLaterUse")} />
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <button className="w-100 btn-main" type="submit" onClick={handleSubmit(onSubmit)}>
              {pathOr("إضافة", [locale, "Products", "Add"], t)}
            </button>
          </Modal.Footer>
        </>
      )}
    </Modal>
  )
}

export default VisaModal
