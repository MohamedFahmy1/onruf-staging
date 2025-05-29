import { Modal, Form, Button, Row, Col } from "react-bootstrap"
import t from "../../../translations.json"
import { pathOr } from "ramda"
import { useRouter } from "next/router"
import { useFetch } from "../../../hooks/useFetch"
import { useState } from "react"
import { textAlignStyle } from "../../../styles/stylesObjects"
import { useForm } from "react-hook-form"
import { LoadingScreen } from "../../../common/Loading"
import axios from "axios"
import RequiredSympol from "../../../common/RequiredSympol"
import { Box } from "@mui/material"
import { multiFormData } from "../../../common/axiosHeaders"

const BankAccountsModal = ({ transType, selectedPayment, setSelectedPayment }) => {
  const { locale } = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { data: bankList, isLoading, fetchData } = useFetch(`/BankTransfersList?PaymentAccountType=3`)

  const [selectedAccount, setSelectedAccount] = useState(null)
  const [step, setStep] = useState(1)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { saveForLaterUse: true } })

  const handleChooseAccount = () => {
    setSelectedPayment(selectedAccount)
    setIsModalOpen(false)
  }

  const handleSelectAccount = (acc) => {
    setSelectedAccount(acc)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    reset()
    setStep(1)
  }

  const onSubmit = async (data) => {
    const updatedData = {
      ...data,
      PaymentAccountType: 3,
    }
    const formData = new FormData()
    for (const key in updatedData) {
      formData.append(key, updatedData[key])
    }
    const saveForLater = data.saveForLaterUse
    if (saveForLater) {
      await axios.post("/AddBankTransfer", formData, multiFormData)
      fetchData()
    }
    reset()
    setSelectedAccount(updatedData)
    setStep(1)
    setSelectedPayment(updatedData)
    setIsModalOpen(false)
  }
  return (
    <>
      {!!(!selectedPayment?.bankName && transType === "Out") && (
        <button
          type="button"
          className="btn w-100 rounded-5 main-color mt-3"
          style={{ border: "1px solid var(--main)", backgroundColor: "#FFE5DF" }}
          onClick={() => setIsModalOpen(true)}
        >
          {pathOr("", [locale, "Wallet", "ChooseAccount"], t)}
        </button>
      )}
      {!!(transType === "Out" && selectedPayment?.bankName) && (
        <div className="form-group">
          <div
            style={{
              borderColor: "var(--main)",
              height: "100%",
              border: "1px solid var(--main)",
              borderRadius: "19px",
              marginTop: "10px",
            }}
            className="d-flex flex-column gap-2"
          >
            <div style={{ backgroundColor: "#F8F8F8", margin: "10px", padding: "10px", borderRadius: 13 }}>
              <div className="d-flex gap-1 align-items-center">
                <p style={{ fontSize: 14 }}>{pathOr("", [locale, "Products", "AccountNumber"], t)}:</p>
                <p style={{ fontSize: 12 }}>{selectedPayment.accountNumber} </p>
              </div>
              <div className="row">
                <div className="col-6">
                  <p style={{ fontSize: 14 }}>{pathOr("", [locale, "Products", "BankName"], t)}:</p>
                  <p style={{ fontSize: 12, color: "#8B959E" }}>{selectedPayment?.bankName}</p>
                </div>
                <div className="col-6">
                  <p style={{ fontSize: 14 }}>{pathOr("", [locale, "Products", "Holder's"], t)}:</p>
                  <p style={{ fontSize: 12, color: "#8B959E" }}>{selectedPayment?.bankHolderName}</p>
                </div>
                <div className="col-6">
                  <p style={{ fontSize: 14 }}>{pathOr("", [locale, "Products", "swift"], t)}:</p>
                  <p style={{ fontSize: 12, color: "#8B959E" }}>{selectedPayment?.swiftCode}</p>
                </div>
                <div className="col-6">
                  <p style={{ fontSize: 14 }}>{pathOr("", [locale, "Products", "ibn"], t)}:</p>
                  <p style={{ fontSize: 12, color: "#8B959E" }}>{selectedPayment?.ibanNumber}</p>
                </div>
              </div>
            </div>
            <Button
              variant="light"
              className="rounded-pill mb-3 gray-color"
              style={{ border: "1px solid #eee", marginInline: "auto", width: "90%" }}
              onClick={() => setIsModalOpen(true)}
            >
              {pathOr("", [locale, "BankAccounts", "ChooseAnotherBankAccount"], t)}
            </Button>
          </div>
        </div>
      )}
      <Modal
        show={isModalOpen}
        onHide={closeModal}
        centered
        className="unique-send-offer-modal big-width"
        style={{ ...textAlignStyle(locale) }}
      >
        <Modal.Header className="justify-content-end">
          <button type="button" className="btn-close" aria-label="close modal" onClick={closeModal}></button>
        </Modal.Header>

        {step === 1 && (
          <>
            <Modal.Body className="py-0">
              {!!(bankList?.length > 0 && step === 1) && (
                <h1 className="fs-4 text-center mb-4">
                  {pathOr("اختر البطاقة", [locale, "Products", "ChooseTheBankAccount"], t)}
                </h1>
              )}

              {isLoading && <LoadingScreen height="300px" />}

              {!!bankList?.length > 0 ? (
                <Form style={{ overflowY: "scroll", height: "450px" }} className="px-2">
                  {bankList?.map((bankAccount, idx) => (
                    <div key={bankAccount.id || idx} className={`p-3 mb-2 border rounded-4 position-relative`}>
                      <Form.Check
                        type="radio"
                        id={`card-${idx}`}
                        name="visa-card"
                        checked={selectedAccount?.id === bankAccount.id}
                        onChange={() => handleSelectAccount(bankAccount)}
                        label=""
                        style={{ insetInlineEnd: 10, top: 5 }}
                        className="mb-2 position-absolute"
                      />
                      <Row className="mb-4">
                        <Col md={12} className="d-flex gap-2">
                          <p>{pathOr("", [locale, "Products", "AccountNumber"], t)}:</p>
                          <p>{bankAccount.accountNumber}</p>
                        </Col>
                      </Row>
                      <Row className="mb-2">
                        <Col md={3} className="text-muted">
                          <p>{pathOr("", [locale, "Products", "BankName"], t)}:</p>
                          <div>{bankAccount.bankName}</div>
                        </Col>
                        <Col md={3} className="text-muted">
                          <p>{pathOr("", [locale, "Products", "Holder's"], t)}:</p>
                          <div className="text-muted">{bankAccount.bankHolderName}</div>
                        </Col>
                        <Col md={3} className="text-muted">
                          <div>{pathOr("", [locale, "Products", "ibn"], t)}:</div>
                          <div className="text-muted">{bankAccount.ibanNumber}</div>
                        </Col>
                        <Col md={3} className="text-muted">
                          <div>{pathOr("", [locale, "Products", "swift"], t)}:</div>
                          <div className="text-muted">{bankAccount.swiftCode}</div>
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
              <Button variant="light" className="w-100 mb-2" onClick={() => setStep(2)}>
                {pathOr("", [locale, "Products", "addNewBank"], t)}
              </Button>
            </Modal.Body>
            <Modal.Footer>
              <button
                type="button"
                disabled={!selectedAccount}
                className="w-100 btn-main"
                onClick={handleChooseAccount}
              >
                {pathOr("", [locale, "Products", "Choose"], t)}
              </button>
            </Modal.Footer>
          </>
        )}

        {step === 2 && (
          <Box sx={{ "& input": { height: "40px" } }}>
            <Modal.Body className="py-0">
              <h1 className="fs-4 text-center mb-3">{pathOr("", [locale, "Products", "addNewBank"], t)}</h1>

              <Form onSubmit={handleSubmit(onSubmit)}>
                <Form.Group className="mb-2">
                  <Form.Label className="fw-bold">
                    {pathOr("", [locale, "Products", "BankName"], t)}
                    <RequiredSympol />
                  </Form.Label>
                  <Form.Control
                    type="text"
                    {...register("bankName", {
                      required: locale === "en" ? "This field is required" : "من فضلك ادخل هذا الحقل",
                    })}
                  />
                  {errors.bankName && <p className="text-danger">{errors.bankName.message}</p>}
                </Form.Group>

                <Form.Group className="mb-2">
                  <Form.Label className="fw-bold">
                    {pathOr("", [locale, "Products", "AccountNumber"], t)}
                    <RequiredSympol />
                  </Form.Label>
                  <Form.Control
                    type="text"
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

                <Form.Group className="mb-2">
                  <Form.Label className="fw-bold">
                    {pathOr("", [locale, "Products", "Holder's"], t)}
                    <RequiredSympol />
                  </Form.Label>
                  <Form.Control
                    type="text"
                    {...register("bankHolderName", {
                      required: locale === "en" ? "This field is required" : "من فضلك ادخل هذا الحقل",
                    })}
                  />
                  {errors.bankHolderName && <p className="text-danger">{errors.bankHolderName.message}</p>}
                </Form.Group>

                <Form.Group className="mb-2">
                  <Form.Label className="fw-bold">
                    {pathOr("", [locale, "Products", "ibn"], t)}
                    <RequiredSympol />
                  </Form.Label>
                  <Form.Control
                    type="text"
                    {...register("ibanNumber", {
                      required: locale === "en" ? "This field is required" : "من فضلك ادخل هذا الحقل",
                    })}
                  />
                  {errors.ibanNumber && <p className="text-danger">{errors.ibanNumber.message}</p>}
                </Form.Group>

                <div className="mb-2">
                  <label className="f-b me-2 mb-0">
                    {pathOr("", [locale, "BankAccounts", "ibanCertificate"], t)} <RequiredSympol />
                  </label>
                  <div className="d-flex align-items-center">
                    <label
                      htmlFor="ibanCertificateFile"
                      className="btn border rounded-pill px-4 py-1"
                      style={{ cursor: "pointer", background: "#fff", borderColor: "#ccc", width: "200px" }}
                    >
                      {pathOr("", [locale, "BankAccounts", "upload"], t)}
                    </label>
                    <input
                      type="hidden"
                      {...register("ibanCertificateFile", {
                        validate: (v) => {
                          if (!v) return locale === "en" ? "No file selected" : "لم يتم اختيار ملف"
                          if (v.fake || v instanceof File) return true
                          return locale === "en" ? "Invalid file" : "ملف غير صالح"
                        },
                      })}
                    />
                    <input
                      id="ibanCertificateFile"
                      type="file"
                      accept=".png,.jpg,.jpeg,.pdf"
                      className="d-none"
                      onChange={(e) => {
                        const file = e.target.files[0]
                        setValue("ibanCertificateFile", file, { shouldValidate: true })
                      }}
                    />

                    <span className="mx-2">
                      {watch("ibanCertificateFile")?.name ||
                        (locale === "en" ? "No file selected" : "لم يتم اختيار ملف")}
                    </span>
                  </div>
                  {errors["ibanCertificateFile"] && (
                    <p className="errorMsg">{errors["ibanCertificateFile"]["message"]}</p>
                  )}
                </div>

                <Form.Group className="mb-2">
                  <Form.Label className="fw-bold">
                    {pathOr("", [locale, "Products", "swift"], t)}
                    <RequiredSympol />
                  </Form.Label>
                  <Form.Control
                    type="text"
                    {...register("swiftCode", {
                      required: locale === "en" ? "This field is required" : "من فضلك ادخل هذا الحقل",
                    })}
                  />
                  {errors.swiftCode && <p className="text-danger">{errors.swiftCode.message}</p>}
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
          </Box>
        )}
      </Modal>
    </>
  )
}

export default BankAccountsModal
