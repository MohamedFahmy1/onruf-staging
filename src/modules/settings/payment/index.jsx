import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/router"
import { Row, Col, Modal } from "react-bootstrap"
import { AiOutlinePlus } from "react-icons/ai"
import { BiEditAlt } from "react-icons/bi"
import VisaImg from "../../../../public/images/Visa.png"
import BoxBankImg from "../../../../public/images/box-bank.png"
import madaImg from "../../../../public/images/mada.png"
import stc from "../../../../public/images/stc.png"
import { toast } from "react-toastify"
import { useForm } from "react-hook-form"
import axios from "axios"
import "react-datepicker/dist/react-datepicker.css"
import t from "../../../translations.json"
import { pathOr } from "ramda"
import Alerto from "../../../common/Alerto"
import Image from "next/image"
import { textAlignStyle } from "../../../styles/stylesObjects"
import { DevTool } from "@hookform/devtools"
import moment from "moment"
import RequiredSympol from "../../../common/RequiredSympol"
import { multiFormData } from "../../../common/axiosHeaders"
import DeleteModal from "./DeleteModal"

const PaymentCards = ({ bankTransfers }) => {
  const { locale } = useRouter()
  const [openModal, setOpenModal] = useState()
  const [id, setId] = useState()
  const [bankTransferData, setBankTransferData] = useState(bankTransfers || [])
  const fileInputRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    control,
  } = useForm({ mode: "onBlur", defaultValues: { paymentAccountType: 1, saveForLaterUse: true } })

  console.log(errors)

  const paymentAccountTypeValue = watch("paymentAccountType")

  const isBankAccount = paymentAccountTypeValue == 3

  const fetchBankTransfer = async () => {
    const {
      data: { data },
    } = await axios.get("/BankTransfersList")
    setBankTransferData(data)
  }

  const handleOpenEditModalAndSetFormWithDefaultValues = (bankId) => {
    setId(bankId)
    setOpenModal(true)
    const getSelectedBankTransfer = bankTransferData.map((b) => b).find((b) => b.id === bankId)
    reset({
      ...getSelectedBankTransfer,
      paymentAccountType:
        getSelectedBankTransfer.paymentAccountType === "VisaMasterCard"
          ? 1
          : getSelectedBankTransfer.paymentAccountType === "Mada"
          ? 2
          : 3,
    })
  }

  const submit = async ({ ...values }) => {
    try {
      setLoading(true)
      const formData = new FormData()
      for (const key in values) {
        if (values[key] === null) continue
        formData.append(key, values[key])
      }
      formData.append("saveForLaterUse", "true")
      if (id) {
        await axios.put("/EditBankTransfer", formData, multiFormData)
        setBankTransferData([...bankTransferData?.filter((b) => b.id !== id), { ...values }])
        setOpenModal(false)
        setId(undefined)
        toast.success(locale === "en" ? "Payment Option has been edited successfully!" : "تم تعديل وسيلة الدفع بنجاح")
        fetchBankTransfer()
      } else {
        try {
          await axios.post("/AddBankTransfer", formData, multiFormData)
          setBankTransferData([...bankTransferData, { ...values }])
          setOpenModal(false)
          toast.success(locale === "en" ? "Payment Option has been added successfully!" : "تم اضافة وسيلة الدفع بنجاح")
          fetchBankTransfer()
        } catch (error) {
          toast.error("Error!")
          setOpenModal(false)
        }
      }
    } catch (error) {
      Alerto(error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = () => {
    setOpenModal(!openModal)
    setId("")
    reset({
      paymentAccountType: 1,
      bankHolderName: null,
      swiftCode: null,
      ibanNumber: null,
      accountNumber: null,
      bankName: null,
      expiaryDate: null,
    })
  }

  const getModalTitle = () => {
    const firstTitle = !id ? (locale === "en" ? "Add" : "اضافة") : locale === "en" ? "Edit" : "تعديل"
    let secondTitle
    if (id) {
      switch (paymentAccountTypeValue) {
        case 1:
          secondTitle = pathOr("", [locale, "BankAccounts", "VisaMasterCard"], t)
          break
        case 2:
          secondTitle = pathOr("", [locale, "BankAccounts", "mada"], t)
          break
        case 3:
          secondTitle = pathOr("", [locale, "BankAccounts", "bankAccount"], t)
          break
        default:
          secondTitle = pathOr("", [locale, "BankAccounts", "VisaMasterCard"], t)
          break
      }
    } else {
      secondTitle = pathOr("", [locale, "BankAccounts", "paymentMethod"], t)
    }
    return `${firstTitle} ${secondTitle}`
  }

  useEffect(() => {
    setBankTransferData(bankTransfers)
  }, [bankTransfers])

  useEffect(() => {
    register("ibanCertificateFile", {
      required: locale === "en" ? "Required" : "مطلوب",
    })
  }, [register])

  return (
    <Col lg={8}>
      <section className="contint_paner">
        <h6 className="f-b mb-3">{pathOr("", [locale, "BankAccounts", "paymentMethods"], t)}</h6>
        <div className="d-flex gap-4">
          <button
            type="button"
            className="btn-bank-accounts"
            onClick={handleOpenModal}
            data-bs-toggle="modal"
            data-bs-target="#acount_Banck"
            aria-label="add new account"
          >
            <AiOutlinePlus />
          </button>
          <div
            className="d-flex justify-content-between overflow-x-scroll overflow-y-hidden w-100"
            style={{ height: "300px", alignItems: "center", columnGap: "20px" }}
          >
            {bankTransferData?.length === 0 && (
              <div className="f-b text-center flex-grow-1">{pathOr("", [locale, "Settings", "noBankAccounts"], t)}</div>
            )}
            {bankTransferData?.map((bank) => (
              <div
                className="box-bank-account"
                key={bank?.id}
                style={{
                  color: bank.paymentAccountType === "BankAccount" ? "black" : undefined,
                  border: bank.paymentAccountType === "BankAccount" ? "1px solid #ccc" : undefined,
                }}
              >
                <div>
                  <div
                    className="d-flex align-items-center justify-content-between mb-10 gap-3"
                    style={{ maxWidth: "85%" }}
                  >
                    {bank.paymentAccountType === "VisaMasterCard" && (
                      <Image
                        src={VisaImg}
                        className="img_"
                        alt="visa logo"
                        layout="fixed"
                        width={50}
                        height={16}
                        priority
                      />
                    )}
                    {bank.paymentAccountType === "Mada" && (
                      <Image
                        src={madaImg}
                        className="img_"
                        alt="stc pay"
                        layout="fixed"
                        width={50}
                        height={16}
                        priority
                      />
                    )}
                    <div className="d-flex">
                      <button
                        className="btn_edit"
                        aria-label="edit account"
                        onClick={() => handleOpenEditModalAndSetFormWithDefaultValues(bank?.id)}
                      >
                        <BiEditAlt />
                      </button>
                      <DeleteModal
                        id={bank?.id}
                        setBankTransferData={setBankTransferData}
                        fetchBankTransfer={fetchBankTransfer}
                      />
                    </div>
                  </div>
                  <div style={{ width: "145px" }}>{bank?.accountNumber}</div>
                </div>
                <div>
                  <div className="mt-10">
                    <div>
                      {pathOr("", [locale, "BankAccounts", "BankName"], t)}: {bank?.bankName}
                    </div>
                    <div>{bank?.bankHolderName}</div>
                  </div>
                  {bank.paymentAccountType === "BankAccount" ? (
                    <div className="mt-10">
                      <div>{bank?.swiftCode}</div>
                    </div>
                  ) : (
                    <div className="mt-10">
                      <div>{pathOr("", [locale, "BankAccounts", "expiryDate"], t)}</div>
                      <div>{bank?.expiaryDate}</div>
                    </div>
                  )}
                </div>
                {bank.paymentAccountType === "VisaMasterCard" && (
                  <div className="baner">
                    <Image src={BoxBankImg} alt="visa" width={188} height={285} layout="fixed" priority />
                  </div>
                )}
                {bank.paymentAccountType === "Mada" && (
                  <div className="baner">
                    <Image src={stc} alt="stc pay" width={188} height={285} layout="fixed" priority />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Payment Modal */}
      <form>
        <Modal
          show={openModal}
          onHide={() => setOpenModal(false)}
          style={{ ...textAlignStyle(locale), direction: locale === "en" ? "ltr" : "rtl" }}
        >
          <Modal.Header className="position-relative">
            <div className="position-absolute start-50 translate-middle" style={{ top: "65%" }}>
              <h5 className="modal-title m-0 f-b text-center" id="staticBackdropLabel">
                {getModalTitle()}
              </h5>
            </div>
            <button type="button" className="btn-close ms-auto" onClick={() => setOpenModal(false)} />
          </Modal.Header>
          <Modal.Body>
            {!id && (
              <div className="mb-2">
                <label className="f-b">
                  {pathOr("", [locale, "BankAccounts", "accountType"], t)}
                  <RequiredSympol />
                </label>
                <div className="d-flex justify-content-between">
                  <div className="status-P">
                    <input
                      type="radio"
                      name="paymentAccountType"
                      value={1}
                      defaultChecked={paymentAccountTypeValue === 1}
                      {...register("paymentAccountType", {
                        required: locale === "en" ? "This field is required" : "من فضلك ادخل هذا الحقل",
                      })}
                    />
                    <span>{pathOr("", [locale, "BankAccounts", "VisaMasterCard"], t)}</span>
                  </div>
                  <div className="status-P justify-content-start">
                    <input
                      type="radio"
                      name="paymentAccountType"
                      value={2}
                      defaultChecked={paymentAccountTypeValue === 2}
                      {...register("paymentAccountType", {
                        required: locale === "en" ? "This field is required" : "من فضلك ادخل هذا الحقل",
                      })}
                    />
                    <span>{locale === "en" ? "Mada" : "مدى"}</span>
                  </div>
                  <div className="status-P">
                    <input
                      type="radio"
                      name="paymentAccountType"
                      value={3}
                      defaultChecked={paymentAccountTypeValue === 3}
                      {...register("paymentAccountType", {
                        required: locale === "en" ? "This field is required" : "من فضلك ادخل هذا الحقل",
                      })}
                    />
                    <span>{pathOr("", [locale, "BankAccounts", "bankAccount"], t)}</span>
                  </div>
                </div>
                {errors["paymentAccountType"] && (
                  <p className="errorMsg text-center">{errors["paymentAccountType"]["message"]}</p>
                )}
              </div>
            )}
            <Row>
              {isBankAccount && (
                <Col md={12}>
                  <div className="mb-2">
                    <label className="f-b">
                      {pathOr("", [locale, "BankAccounts", "BankName"], t)}
                      <RequiredSympol />
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      {...register("bankName", {
                        required: locale === "en" ? "This field is required" : "من فضلك ادخل هذا الحقل",
                      })}
                    />
                    {errors["bankName"] && <p className="errorMsg">{errors["bankName"]["message"]}</p>}
                  </div>
                </Col>
              )}
              <Col md={12}>
                <div className="mb-2">
                  <label className="f-b">
                    {isBankAccount
                      ? pathOr("", [locale, "BankAccounts", "AccountNumber"], t)
                      : pathOr("", [locale, "Products", "CardNumber"], t)}
                    <RequiredSympol />
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    maxLength={isBankAccount ? 17 : 16}
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
                        message: locale === "en" ? "Field must be at least 16 numbers" : "يجب ان يكون على الاقل 16 رقم",
                      },
                    })}
                  />
                  {errors["accountNumber"] && <p className="errorMsg">{errors["accountNumber"]["message"]}</p>}
                </div>
              </Col>
              <Col md={12}>
                <div className="mb-2">
                  <label className="f-b">
                    {isBankAccount
                      ? pathOr("", [locale, "BankAccounts", "Holder's"], t)
                      : pathOr("", [locale, "BankAccounts", "cardHolderName"], t)}
                    <RequiredSympol />
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    {...register("bankHolderName", {
                      required: locale === "en" ? "This field is required" : "من فضلك ادخل هذا الحقل",
                    })}
                  />
                  {errors["bankHolderName"] && <p className="errorMsg">{errors["bankHolderName"]["message"]}</p>}
                </div>
              </Col>
              {isBankAccount && (
                <Col md={12}>
                  <div className="mb-2">
                    <label className="f-b">
                      {pathOr("", [locale, "BankAccounts", "ibn"], t)}
                      <RequiredSympol />
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      {...register("ibanNumber", {
                        required: locale === "en" ? "This field is required" : "من فضلك ادخل هذا الحقل",
                        pattern: {
                          value: /^[A-Za-z0-9]+$/,
                          message:
                            locale === "en" ? "Invalid characters in IBAN number" : "أحرف غير صالحة في رقم الآيبان",
                        },
                      })}
                    />
                    {errors["ibanNumber"] && <p className="errorMsg">{errors["ibanNumber"]["message"]}</p>}
                  </div>
                </Col>
              )}
              {isBankAccount && (
                <Col md={12}>
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
                            return v instanceof File || (v && v.name)
                              ? true
                              : locale === "en"
                              ? "No file selected"
                              : "لم يتم اختيار ملف"
                          },
                        })}
                      />
                      <input
                        id="ibanCertificateFile"
                        type="file"
                        accept=".png,.jpg,.jpeg,.pdf"
                        className="d-none"
                        ref={fileInputRef}
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
                </Col>
              )}
              {isBankAccount && (
                <Col md={12}>
                  <div className="mb-2">
                    <label className="f-b">{pathOr("", [locale, "BankAccounts", "swift"], t)}</label>
                    <input type="text" className="form-control" {...register("swiftCode")} />
                    {errors["swiftCode"] && <p className="errorMsg">{errors["swiftCode"]["message"]}</p>}
                  </div>
                </Col>
              )}
              {!isBankAccount && (
                <Col md={12}>
                  <div className="mb-2">
                    <label className="f-b">
                      {pathOr("", [locale, "BankAccounts", "yearExpiryDate"], t)}
                      <RequiredSympol />
                    </label>
                    <input
                      type="text"
                      className="form-control"
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
                    {errors["expiaryDate"] && <p className="errorMsg">{errors["expiaryDate"]["message"]}</p>}
                  </div>
                </Col>
              )}
            </Row>
          </Modal.Body>
          <Modal.Footer className="modal-footer">
            <button type="submit" onClick={handleSubmit(submit)} className="btn-main" disabled={loading}>
              {!id ? (locale === "en" ? "Add" : "اضافة") : pathOr("", [locale, "BankAccounts", "save"], t)}
            </button>
          </Modal.Footer>
        </Modal>
      </form>
      <DevTool control={control} />
    </Col>
  )
}

export default PaymentCards
