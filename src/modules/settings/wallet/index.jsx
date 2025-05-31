import axios from "axios"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import { Row, Col, Button } from "react-bootstrap"
import { useForm } from "react-hook-form"
import { formatDate, handleFormErrors, onlyNumbersInInputs } from "../../../common/functions"
import Alerto from "../../../common/Alerto"
import { pathOr } from "ramda"
import t from "../../../translations.json"
import { toast } from "react-toastify"
import wallet from "../../../assets/images/wallet_icon.svg"
import moneyBag from "../../../../public/icons/money_bag.png"
import lock from "../../../../public/icons/lock.png"
import Image from "next/image"
import { useFetch } from "../../../hooks/useFetch"
import { Pagination } from "@mui/material"
import { GoDotFill } from "react-icons/go"
import BankAccountsModal from "./BankAccountsModal"
import WalletCheckoutModal from "./WalletCheckoutModal"
import WalletCardModal from "./WalletCardModal"

const Wallet = () => {
  const [transType, setTransType] = useState("In")
  const [creditValue, setCreditValue] = useState(0)
  const [cardModalOpen, setCardModalOpen] = useState(false)
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState("")
  const [orderNumber, setOrderNumber] = useState()
  const [selectedPayment, setSelectedPayment] = useState()
  const { data: userWalletState = {}, fetchData: fetchWalletInfo } = useFetch(`/GetUserWalletTransactions`)
  const { walletBalance, pendingBalance, walletTransactionslist = [], walletPendingOrders = [] } = userWalletState

  const {
    register,
    handleSubmit,
    setValue,
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
    try {
      setIsCheckoutModalOpen("loading")
      if (transType === "Out" && values.TransactionAmount > walletBalance) {
        return toast.error(locale === "en" ? "Not enough wallet balance!" : "لا يوجد رصيد كافي بالمحفظة")
      }
      const formData = new FormData()
      for (let key in values) {
        formData.append("TransactionSource", transType === "In" ? "ChargeWallet" : "DrawFromWallet")
        formData.append("TransactionType", transType === "In" ? "In" : "Out")
        formData.append(key, values[key])
        formData.append(
          "ExecutePaymentDto.PaymentMethodId",
          selectedPayment?.paymentAccountType === "VisaMasterCard"
            ? 3
            : selectedPayment?.paymentAccountType === "Mada"
            ? 4
            : 2,
        )
        if (transType === "In") {
          formData.append("ExecutePaymentDto.TotalAmount", values.TransactionAmount)
          formData.append("ExecutePaymentDto.PaymentCard.Number", selectedPayment?.accountNumber)
          formData.append("ExecutePaymentDto.PaymentCard.ExpiryMonth", selectedPayment?.expiaryDate.split("/")[0])
          formData.append("ExecutePaymentDto.PaymentCard.ExpiryYear", selectedPayment?.expiaryDate.split("/")[1])
          formData.append("ExecutePaymentDto.PaymentCard.SecurityCode", selectedPayment?.cvv)
          formData.append("ExecutePaymentDto.PaymentCard.HolderName", selectedPayment?.bankHolderName)
        } else {
          formData.append("WithdrawBankTAccountId", selectedPayment?.id)
        }
      }
      const { data } = await axios.post("/AddWalletTransaction", formData)
      console.log(data)
      setSelectedPayment(null)
      setOrderNumber(data?.data?.transactionId)
      setValue("TransactionAmount", 0)
      setIsCheckoutModalOpen("success")
      fetchWalletInfo()
    } catch (e) {
      setIsCheckoutModalOpen("failed")
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

  const handleAcceptCard = (card) => {
    setSelectedPayment(card)
    setCardModalOpen(false)
  }

  return (
    <article className="body-content">
      <section className="d-flex align-items-center justify-content-between mb-4 gap-2 flex-wrap">
        <h6 className="f-b m-0">{pathOr("", [locale, "Wallet", "myWallet"], t)}</h6>
      </section>
      <section>
        <Row>
          <Col lg={4}>
            <div className="info_sec_ mb-3 contint_paner rounded-4">
              <div className="icon mb-4">
                <Image src={wallet} className="img-fluid" alt="wallet" />
              </div>
              <div className="d-flex align-items-center justify-content-between gap-3">
                <div className="position-relative d-inline-block" style={{ cursor: "pointer" }}>
                  {/* Pending Balance Box */}
                  <div className="rounded-5 p-2 pending-balance-box" style={{ backgroundColor: "#FFE5DF" }}>
                    <div
                      className="d-flex align-items-center justify-content-center"
                      style={{ gap: "42px", minWidth: "150px" }}
                    >
                      <h5 className="m-0" style={{ fontSize: "14px" }}>
                        {pendingBalance} {pathOr("", [locale, "Products", "currency"], t)}
                      </h5>
                      <Image src={lock} width={22} height={22} alt="lock" />
                    </div>
                    <p className="text-center main-color">{pathOr("", [locale, "Wallet", "PendingBalance"], t)}</p>
                  </div>

                  {/* Hover Tooltip Box */}
                  {walletPendingOrders?.length > 0 && (
                    <div className="hover-info-box">
                      {walletPendingOrders?.map((item, index) => (
                        <div key={index} className="d-flex align-items-center justify-content-between mb-2">
                          <GoDotFill />
                          <p className="m-0">
                            {item?.TransactionAmount} {pathOr("", [locale, "Products", "currency"], t)} -{" "}
                            {pathOr("", [locale, "Wallet", "PurchaseOrderNumber"], t) + " " + item?.OrderId}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-5 p-2" style={{ border: "2px solid var(--main)" }}>
                  <div
                    className="d-flex align-items-center justify-content-center"
                    style={{ gap: "42px", minWidth: "150px" }}
                  >
                    <h5 className="m-0" style={{ fontSize: "14px" }}>
                      {walletBalance} {pathOr("", [locale, "Products", "currency"], t)}
                    </h5>
                    <Image src={moneyBag} width={22} height={22} alt="money bag" />
                  </div>
                  <p className="text-center main-color">{pathOr("", [locale, "Wallet", "AvailableBalance"], t)}</p>
                </div>
              </div>
            </div>
          </Col>

          <Col lg={4}>
            <form onSubmit={handleSubmit(handleWalletSubmit)} className="contint_paner">
              <ul className="swich_larg d-flex justify-content-center gap-2 text-center">
                <li
                  className="transaction-type w-50 pointer"
                  style={{
                    backgroundColor: transType === "In" ? "var(--main)" : undefined,
                    color: transType === "In" ? "white" : "var(--main)",
                  }}
                  onClick={() => {
                    setTransType("In")
                    setSelectedPayment(null)
                  }}
                >
                  <input type="radio" name="account" id="in" style={{ display: "none" }} checked={transType === "In"} />
                  <span className="back" />
                  <label htmlFor="in" className="mx-2">
                    {pathOr("", [locale, "Wallet", "topUp"], t)}
                  </label>
                </li>
                <li
                  className="transaction-type w-50 pointer"
                  style={{
                    backgroundColor: transType === "Out" ? "var(--main)" : undefined,
                    color: transType === "Out" ? "white" : "var(--main)",
                  }}
                  onClick={() => {
                    setTransType("Out")
                    setSelectedPayment(null)
                  }}
                >
                  <input
                    checked={transType === "Out"}
                    type="radio"
                    name="account"
                    id="out"
                    style={{ display: "none" }}
                  />
                  <span className="back" />
                  <label htmlFor="out" className="mx-2">
                    {" "}
                    {pathOr("", [locale, "Wallet", "withdraw"], t)}
                  </label>
                </li>
              </ul>
              {!!(!selectedPayment?.expiaryDate && transType === "In") && (
                <button
                  type="button"
                  className="btn w-100 rounded-5 main-color mt-3"
                  style={{ border: "1px solid var(--main)", backgroundColor: "#FFE5DF" }}
                  onClick={() => setCardModalOpen(true)}
                >
                  {pathOr("", [locale, "Wallet", "ChooseCard"], t)}
                </button>
              )}
              <BankAccountsModal
                transType={transType}
                selectedPayment={selectedPayment}
                setSelectedPayment={setSelectedPayment}
              />

              {!!(transType === "In" && selectedPayment?.expiaryDate) && (
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
                      <div>
                        <p style={{ fontSize: 14 }}>{pathOr("", [locale, "Products", "NameOnCard"], t)}</p>
                        <p style={{ fontSize: 12, color: "#8B959E" }}>{selectedPayment?.bankHolderName}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 14 }}>{pathOr("", [locale, "Products", "CardNumber"], t)}</p>
                        <p style={{ fontSize: 12, color: "#8B959E" }}>
                          {selectedPayment.accountNumber?.slice(0, 12)}XXXX{" "}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: 14 }}>{pathOr("", [locale, "Products", "expiryDate"], t)}</p>
                        <p style={{ fontSize: 12, color: "#8B959E" }}>{selectedPayment?.expiaryDate}</p>
                      </div>
                    </div>
                    <Button
                      variant="light"
                      className="rounded-pill mb-3 gray-color"
                      style={{ border: "1px solid #eee", marginInline: "auto", width: "90%" }}
                      onClick={() => setCardModalOpen(true)}
                    >
                      {pathOr("", [locale, "Products", "ChooseAnotherCard"], t)}
                    </Button>
                  </div>
                </div>
              )}
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
                  style={{ height: "40px" }}
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
                  className="icon_fa"
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
              <button
                className="btn-main d-block w-100"
                type="submit"
                disabled={!selectedPayment}
                style={{ height: "40px", lineHeight: "40px" }}
              >
                {transType === "In"
                  ? pathOr("", [locale, "Wallet", "topUp"], t)
                  : pathOr("", [locale, "Wallet", "withdraw"], t)}
              </button>
            </form>
          </Col>

          <Col lg={4} className="contint_paner text-center">
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
                style={{ height: "40px" }}
              />
              <span
                className="icon_fa"
                style={{
                  right: locale === "en" ? "25px" : undefined,
                  width: "fit-content",
                  left: locale === "en" ? "inherit" : "25px",
                }}
              >
                {pathOr("", [locale, "Products", "currency"], t)}
              </span>
            </div>
            <button
              className="btn-main d-block w-100"
              onClick={handleTransferWalletToPoints}
              style={{ height: "40px", lineHeight: "40px" }}
            >
              {pathOr("", [locale, "Points", "send"], t)}
            </button>
          </Col>
        </Row>

        <div className="mt-4 contint_paner">
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
      </section>{" "}
      {cardModalOpen && (
        <WalletCardModal
          isCardModalOpen={cardModalOpen}
          setIsCardModalOpen={setCardModalOpen}
          handleAccept={handleAcceptCard}
          selectedPayment={selectedPayment}
        />
      )}
      {isCheckoutModalOpen && (
        <WalletCheckoutModal
          isModalOpen={isCheckoutModalOpen}
          setIsModalOpen={setIsCheckoutModalOpen}
          transType={transType}
          orderNumber={orderNumber}
        />
      )}
    </article>
  )
}

export default Wallet
