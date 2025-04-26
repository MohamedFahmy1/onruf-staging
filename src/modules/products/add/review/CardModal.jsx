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
import RequiredSympol from "../../../../common/RequiredSympol"
import moment from "moment"

const CardModal = ({
  isCardModalOpen,
  setIsCardModalOpen,
  handleAccept,
  PaymentAccountType,
  toggleOffPaymentOption,
}) => {
  const { locale } = useRouter()
  const {
    data: cardList,
    isLoading,
    fetchData,
  } = useFetch(`/BankTransfersList?PaymentAccountType=${PaymentAccountType}`)

  const [selectedCard, setSelectedCard] = useState(null)
  const [cvvValues, setCvvValues] = useState({})
  const [step, setStep] = useState(1)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { saveForLaterUse: true } })

  const closeModal = () => {
    setIsCardModalOpen(false)
    toggleOffPaymentOption()
  }

  const handleChooseCard = () => {
    const updatedData = {
      ...selectedCard,
      cvv: cvvValues[selectedCard.id],
    }
    handleAccept(updatedData)
    setIsCardModalOpen(false)
  }

  const handleSelectCard = (card) => {
    setSelectedCard(card)
    // Reset all CVV fields except the one selected
    setCvvValues({ [card.id]: cvvValues[card.id] || "" })
  }

  const onSubmit = async (data) => {
    const updatedData = {
      ...data,
      PaymentAccountType: PaymentAccountType,
    }

    try {
      const saveForLater = data.saveForLaterUse
      if (saveForLater) {
        await axios.post("/AddBankTransfer", updatedData)
        fetchData()
      }
      handleAccept(updatedData)
      setIsCardModalOpen(false)
    } catch (error) {
      Alerto(error)
    }
  }

  return (
    <Modal
      show={isCardModalOpen}
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
            {!!(cardList?.length > 0 && step === 1) && (
              <h1 className="fs-4 text-center mb-4">{pathOr("اختر البطاقة", [locale, "Products", "ChooseCard"], t)}</h1>
            )}

            {isLoading && <LoadingScreen height="300px" />}

            {!!cardList?.length > 0 ? (
              <Form style={{ overflowY: "scroll", height: "450px" }} className="px-2">
                {cardList?.map((card, idx) => (
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
                        <div className="text-muted">XXXX XXXX XXXX {card.accountNumber?.slice(-4)}</div>
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
                          onChange={(e) => {
                            if (e.target.value.length > 4) return
                            else
                              setCvvValues((prev) => ({
                                ...prev,
                                [card.id]: e.target.value,
                              }))
                          }}
                        />
                      </Col>
                    </Row>
                  </div>
                ))}
              </Form>
            ) : (
              <>
                {!isLoading && (
                  <h4 className="text-center my-5">
                    {locale === "en"
                      ? "There are no saved cards. Please add a new card by clicking the Add New Card button or choosing another payment method."
                      : "لا يوجد بطاقات محفوظة، يرجى اضافة بطاقة جديدة بالضغط على زر أضف بطاقة جديدة أو اختيار طريقة دفع اخرى."}
                  </h4>
                )}
              </>
            )}
            <Button variant="light" className="w-100 mb-3" onClick={() => setStep(2)}>
              {pathOr("", [locale, "Products", "AddNewCard"], t)}
            </Button>
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
            <h1 className="fs-4 text-center mb-4">{pathOr("", [locale, "Products", "AddNewCard"], t)}</h1>

            <Form onSubmit={handleSubmit(onSubmit)}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">
                  {pathOr("الاسم على البطاقة", [locale, "Products", "NameOnCard"], t)}
                  <RequiredSympol />
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
                  <RequiredSympol />
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  maxLength={16}
                  onKeyDown={(e) => {
                    const allowedKeys = ["Backspace", "ArrowLeft", "ArrowRight", "Tab", "Delete"]
                    if (!/[0-9]/.test(e.key) && !allowedKeys.includes(e.key)) {
                      e.preventDefault()
                    }
                  }}
                  {...register("accountNumber", {
                    required: locale === "en" ? "This field is required" : "هذا الحقل مطلوب",
                    minLength: {
                      value: 16,
                      message:
                        locale === "en"
                          ? "Card number must be at least 16 numbers"
                          : "رقم البطاقة يجب ان يكون على الاقل 16 رقم",
                    },
                  })}
                />
                {errors.accountNumber && <p className="text-danger">{errors.accountNumber.message}</p>}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">
                  {pathOr("تاريخ الانتهاء", [locale, "Products", "expiryDate"], t)}
                  <RequiredSympol />
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="MM/YYYY"
                  maxLength={7}
                  {...register("expiaryDate", {
                    required: locale === "en" ? "This field is required" : "من فضلك ادخل هذا الحقل",
                    pattern: {
                      value: /^(0[1-9]|1[0-2])\/(20[2-9][0-9])$/,
                      message:
                        locale === "en"
                          ? "Invalid date format (MM/YYYY, months from 01 to 12)"
                          : "تنسيق التاريخ غير صحيح (شهر/سنة، الأشهر من 01 إلى 12)",
                    },
                    validate: (value) => {
                      const date = moment(value, "MM/YYYY")
                      if (!date.isValid()) {
                        return locale === "en" ? "Invalid date" : "تاريخ غير صحيح"
                      }
                      const now = moment().startOf("month")
                      if (date.isBefore(now)) {
                        return locale === "en" ? "Expiry date has passed" : "تاريخ الانتهاء قد مضى"
                      }
                      return true
                    },
                  })}
                  onKeyDown={(e) =>
                    !!(e.key === "Backspace" && e.target.value.length == 3) && setValue("expiaryDate", "")
                  }
                  onChange={(e) => {
                    if (e.target.value.length > 7) return
                    else if (e.target.value.length == 2) setValue("expiaryDate", e.target.value + "/20")
                    else setValue("expiaryDate", e.target.value)
                  }}
                />
                {errors.expiaryDate && <p className="text-danger">{errors.expiaryDate.message}</p>}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">
                  CVV
                  <RequiredSympol />
                </Form.Label>
                <Form.Control
                  type="password"
                  placeholder="***"
                  maxLength={4}
                  {...register("cvv", {
                    required: locale === "en" ? "CVV is required" : "يجب إدخال CVV",
                    minLength: {
                      value: 3,
                      message: locale === "en" ? "CVV is too short" : "رمز CVV قصير جداً",
                    },
                    maxLength: {
                      value: 4,
                      message: locale === "en" ? "CVV is too long" : "رمز CVV طويل جداً",
                    },
                  })}
                />
                {errors.cvv && <p className="text-danger">{errors.cvv.message}</p>}
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
            <button className="w-100 btn-main" type="submit" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
              {pathOr("إضافة", [locale, "Products", "Add"], t)}
            </button>
          </Modal.Footer>
        </>
      )}
    </Modal>
  )
}

export default CardModal
