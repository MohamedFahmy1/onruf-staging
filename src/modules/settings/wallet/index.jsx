import axios from "axios"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import { Row, Col } from "react-bootstrap"
import { useForm } from "react-hook-form"
import { formatDate, handleFormErrors, onlyNumbersInInputs } from "../../../common/functions"
import Alerto from "../../../common/Alerto"
import SimpleSnackbar from "../../../common/SnackBar"
import { pathOr } from "ramda"
import t from "../../../translations.json"
import { toast } from "react-toastify"
import wallet from "../../../assets/images/wallet_icon.svg"
import Image from "next/image"
import { useFetch } from "../../../hooks/useFetch"
import { Pagination } from "@mui/material"

const Wallet = () => {
  const [transType, setTransType] = useState("In")
  const [success, setSuccess] = useState(false)
  const [creditValue, setCreditValue] = useState(0)
  const { data: userWalletState = {}, fetchData: fetchWalletInfo } = useFetch(`/GetUserWalletTransactions`)
  const { walletBalance, walletTransactionslist = [] } = userWalletState
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()
  const { locale } = useRouter()
  const pageSize = 12
  const [currentPage, setCurrentPage] = useState(1)

  const [points, setPoints] = useState()

  const fetchMyPointsData = async () => {
    try {
      const response = await axios.post(`/GetPointsBalance`)
      setPoints(response?.data?.data)
    } catch (error) {
      Alerto(error)
    }
  }

  useEffect(() => {
    fetchMyPointsData()
  }, [])

  const handlePageChange = (event, value) => {
    setCurrentPage(value)
  }

  const totalPages = Math.ceil(walletTransactionslist?.length / pageSize)
  const currentData = walletTransactionslist?.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleWalletSubmit = async (values) => {
    if (transType === "Out" && values.TransactionAmount > walletBalance) {
      return toast.error(locale === "en" ? "Not enough wallet balance!" : "لا يوجد رصيد كافي بالمحفظة")
    }
    const formData = new FormData()
    for (let key in values) {
      formData.append("TransactionSource", transType === "In" ? "ChargeWallet" : "DrawFromWallet")
      formData.append("TransactionType", transType === "In" ? "In" : "Out")
      formData.append(key, values[key])
    }
    try {
      await axios.post("/AddWalletTransaction", formData)
      toast.success(locale === "en" ? "Transacation Done!" : "تمت العملية بنجاح")
      fetchWalletInfo()
    } catch (e) {
      Alerto(e)
    }
  }

  const handleTransferWalletToPoints = async () => {
    if (creditValue > walletBalance) {
      return toast.error(locale === "en" ? "Not enough wallet balance!" : "لا يوجد رصيد كافي بالمحفظة")
    }
    try {
      await axios.post("/TransferWalletToPoints?transactionPointsAmount=" + creditValue)
      toast.success(locale === "en" ? "Transacation Done!" : "تمت العملية بنجاح")
      fetchWalletInfo()
    } catch (e) {
      Alerto(e)
    }
  }

  return (
    <article className="body-content">
      <section className="d-flex align-items-center justify-content-between mb-4 gap-2 flex-wrap">
        <h6 className="f-b m-0">{pathOr("", [locale, "Wallet", "myWallet"], t)}</h6>
      </section>
      <SimpleSnackbar text="Your transaction is processed successfully!" show={success} setShow={setSuccess} />
      <section className="contint_paner">
        <Row className="justify-content-between">
          <Col lg={4}>
            <div className="info_sec_ mb-3">
              <div className="icon">
                <Image src={wallet} className="img-fluid" alt="wallet" />
              </div>
              <h4 className="gray-color m-0">{pathOr("", [locale, "Wallet", "myBalance"], t)}</h4>
              <h5 className="f-b m-0">
                {walletBalance} {pathOr("", [locale, "Products", "currency"], t)}
              </h5>
            </div>
          </Col>
          <Col lg={4}>
            <form onSubmit={handleSubmit(handleWalletSubmit)}>
              <ul className="swich_larg d-flex justify-content-center gap-5">
                <li
                  className="transaction-type"
                  style={{
                    backgroundColor: transType === "In" ? "var(--main)" : undefined,
                    color: transType === "In" ? "white" : undefined,
                  }}
                >
                  <input
                    type="radio"
                    name="account"
                    id="in"
                    checked={transType === "In"}
                    onClick={() => {
                      setTransType("In")
                    }}
                  />
                  <span className="back" />
                  <label htmlFor="in" className="mx-2">
                    {pathOr("", [locale, "Wallet", "topUp"], t)}
                  </label>
                </li>
                <li
                  className="transaction-type"
                  style={{
                    backgroundColor: transType === "Out" ? "var(--main)" : undefined,
                    color: transType === "Out" ? "white" : undefined,
                  }}
                >
                  <input
                    checked={transType === "Out"}
                    type="radio"
                    name="account"
                    id="out"
                    onClick={() => {
                      setTransType("Out")
                    }}
                  />
                  <span className="back" />
                  <label htmlFor="out" className="mx-2">
                    {" "}
                    {pathOr("", [locale, "Wallet", "withdraw"], t)}
                  </label>
                </li>
              </ul>
              <div className="my-2 po_R">
                <label htmlFor="TransactionAmount" className="visually-hidden">
                  {"TransactionAmount"}
                </label>
                <input
                  {...register("TransactionAmount", {
                    required: "You can't submit an empty field",
                    pattern: {
                      value: /^\d*(\.\d{0,2})?$/,
                      message:
                        locale === "en"
                          ? "Invalid number. Please enter a valid number with up to two decimal places."
                          : "رقم غير صحيح. الرجاء إدخال رقم صحيح مع وجود ما يصل إلى خانتين عشريتين فقط",
                    },
                  })}
                  type="text"
                  id="TransactionAmount"
                  className="form-control"
                  onKeyDown={(e) => {
                    // Allow only numbers, decimal point, backspace, and delete keys
                    if (
                      ![
                        "0",
                        "1",
                        "2",
                        "3",
                        "4",
                        "5",
                        "6",
                        "7",
                        "8",
                        "9",
                        ".",
                        "Backspace",
                        "Delete",
                        "ArrowRight",
                        "ArrowLeft",
                      ].includes(e.key)
                    ) {
                      e.preventDefault()
                    }
                    // Prevent more than one decimal point
                    if (e.key === "." && e.target.value.includes(".")) {
                      e.preventDefault()
                    }
                  }}
                />
                <span
                  className="icon_fa main-color"
                  style={{
                    right: locale === "en" ? "25px" : undefined,
                    width: "fit-content",
                    left: locale === "en" ? "inherit" : "25px",
                  }}
                >
                  {pathOr("", [locale, "Products", "currency"], t)}
                </span>
              </div>
              <p className="errorMsg">{handleFormErrors(errors, "TransactionAmount")}</p>
              <button className="btn-main d-block w-100" type="submit">
                {transType === "In"
                  ? pathOr("", [locale, "Wallet", "topUp"], t)
                  : pathOr("", [locale, "Wallet", "withdraw"], t)}
              </button>
            </form>
          </Col>
          <Col lg={4}>
            <div>
              <h5>{pathOr("", [locale, "Wallet", "changeCreditToPoints"], t)}</h5>
              <div className="main-color">
                {locale === "en"
                  ? `Every ${1} Riyal for ${points?.monyOfPointsTransfered / points?.pointsCountToTransfer} point`
                  : `كل ${1} ريال ب ${points?.monyOfPointsTransfered / points?.pointsCountToTransfer} نقطة`}
              </div>
            </div>
            <div className="my-2 po_R">
              <label htmlFor="credit" className="visually-hidden">
                credit
              </label>
              <input
                id="credit"
                value={creditValue}
                onChange={(e) => setCreditValue(e.target.value)}
                type="number"
                onKeyDown={onlyNumbersInInputs}
                className="form-control"
              />
              <span
                className="icon_fa main-color"
                style={{
                  right: locale === "en" ? "25px" : undefined,
                  width: "fit-content",
                  left: locale === "en" ? "inherit" : "25px",
                }}
              >
                {pathOr("", [locale, "Products", "currency"], t)}
              </span>
            </div>
            <button className="btn-main d-block w-100" onClick={handleTransferWalletToPoints}>
              {pathOr("", [locale, "Points", "send"], t)}
            </button>
          </Col>
        </Row>
        <div className="mt-4">
          <h5 className="mb-4 f-b">{pathOr("", [locale, "Wallet", "latestProcesses"], t)}</h5>
          {currentData?.slice(0, 15).map((transaction) => (
            <div className="item_Processes" key={transaction.id}>
              <div className="f-b">
                <div className="fs-5 f-b">
                  {transaction.transactionType === "Out"
                    ? pathOr("", [locale, "Wallet", "withdrawWallet"], t)
                    : pathOr("", [locale, "Wallet", "chargeWallet"], t)}
                </div>
                <div className="gray-color">{formatDate(transaction.transactionDate)}</div>
              </div>
              <h5 className="m-0 main-color f-b text-center">
                <span className="d-block">{transaction.totalWalletBalance}</span>
                {pathOr("", [locale, "Products", "currency"], t)}
              </h5>
            </div>
          ))}
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            sx={{ my: 2, p: 2, ".MuiPagination-ul": { justifyContent: "center" } }}
          />
        </div>
      </section>
    </article>
  )
}

export default Wallet
