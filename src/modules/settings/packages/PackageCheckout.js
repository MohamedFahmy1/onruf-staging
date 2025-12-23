import { pathOr } from "ramda"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Col, Modal, Row } from "react-bootstrap"
import { toast } from "react-toastify"
import { useRouter } from "next/router"
import t from "../../../translations.json"
import styles from "./package.module.css"
import axios from "axios"
import PackageCard from "./PackageCard"
import Alerto from "../../../common/Alerto"
import { useSelector } from "react-redux"
import moment from "moment"
import PackageCheckoutModal from "./PackageCheckoutModal"
import MyFatoorahEmbeddedCard from "../../../components/payments/MyFatoorahEmbeddedCard"

const PackageCheckout = () => {
  const providerId = useSelector((state) => state.authSlice.providerId)
  const { query, push, locale } = useRouter()
  const id = query.id
  const isSub = query?.isSub === "true"
  const [couponData, setCouponData] = useState()
  const [couponCode, setCouponCode] = useState("")
  const [packageDetails, setPackageDetails] = useState()
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)

  // Embedded payment state
  const [mfSessionId, setMfSessionId] = useState("")
  const [paymentIframeUrl, setPaymentIframeUrl] = useState("")
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [mfResetKey, setMfResetKey] = useState(0)
  const hasRequestedPaymentRef = useRef(false)

  const fetchCurrentPackages = async () => {
    try {
      const { data } = await axios.get(`/GetClientSubcripePakats?clientId=${providerId}`)
      setPackageDetails(data?.data?.find((item) => item.pakaId == id))
    } catch (error) {
      Alerto(error)
    }
  }

  const fetchPackageById = async () => {
    try {
      const { data } = await axios.get(`/GetPakaById?Pakatid=${id}`)
      setPackageDetails(data?.data)
    } catch (error) {
      Alerto(error)
    }
  }

  useEffect(() => {
    if (!id) return
    !!isSub ? fetchCurrentPackages() : fetchPackageById()
  }, [id, locale])

  const totalCost = +packageDetails?.price - !!(couponData?.discountValue || 0)

  const taxValue = totalCost * 0.15

  const totalWithTax = totalCost + taxValue
  const totalAmount = totalWithTax <= 0 ? 0 : totalWithTax

  const executePayment = useCallback(
    async ({ sessionId }) => {
      if (!packageDetails || !packageDetails?.id) return null
      if (hasRequestedPaymentRef.current) return null
      hasRequestedPaymentRef.current = true

      const body = {
        pakatIds: [packageDetails.id],
        executePaymentDto: {
          sessionId: sessionId || mfSessionId,
          totalAmount: totalAmount,
        },
      }

      try {
        // Backend should return PaymentUrl/PaymentURL for 3DS
        return await axios.post("/AddPakatSubcription", body, { headers: { "Content-Type": "application/json" } })
      } catch (e) {
        hasRequestedPaymentRef.current = false
        throw e
      }
    },
    [packageDetails, mfSessionId, totalAmount],
  )

  const handlePackageRenew = async (pakaID, id) => {
    try {
      setIsCheckoutModalOpen("loading")
      await axios.post(`/RenewPaka?pakatId=${pakaID}&PakatSubsriptionId=${id}`)
      setIsCheckoutModalOpen("success")
    } catch (error) {
      setIsCheckoutModalOpen("failed")
      Alerto(error)
    }
  }

  const applyCoupon = async () => {
    if (!couponCode) return
    try {
      const res = await axios.get(`/GetCouponByCode?couponCode=${couponCode}&couponScreen=3`)
      const couponData = res?.data?.data.coupon
      setCouponData(couponData)
      toast.success(locale === "en" ? "Coupon applied successfully!" : "تم تطبيق الكوبون بنجاح")
    } catch (err) {
      if (err.response.status === 400) {
        const message =
          locale === "en"
            ? "Coupon has expired, please enter another valid coupon."
            : "انتهت صلاحية الكوبون، الرجاء إدخال كوبون آخر صالح."
        return toast.error(message)
      } else toast.error(locale === "en" ? "Please enter correct coupon!" : "من فضلك ادخل الكوبون بشكل صحيح")
    }
  }

  const signalRHubUrl = useMemo(() => {
    const envHub = process.env.NEXT_PUBLIC_SIGNALR_HUB_URL
    if (envHub) return envHub

    const api = process.env.NEXT_PUBLIC_API_URL || ""
    const base = String(api)
      .replace(/\/api\/v\d+\/?$/i, "")
      .replace(/\/+$/, "")
    return base ? `${base}/chatHub` : "/chatHub"
  }, [])

  const handlePaymentStatus = useCallback(
    async (status) => {
      switch (status) {
        case "PaymentSuccessMessage":
          setIsCheckoutModalOpen("success")
          setIsPaymentModalOpen(false)
          setPaymentIframeUrl("")
          setMfResetKey((k) => k + 1)
          hasRequestedPaymentRef.current = false
          return
        case "PaymentFailedMessage":
          setIsCheckoutModalOpen("failed")
          setIsPaymentModalOpen(false)
          setPaymentIframeUrl("")
          setMfResetKey((k) => k + 1)
          hasRequestedPaymentRef.current = false
          return
        case "PaymentPendingMessage":
          return
        default:
          setIsCheckoutModalOpen("failed")
          setIsPaymentModalOpen(false)
          setPaymentIframeUrl("")
          setMfResetKey((k) => k + 1)
          hasRequestedPaymentRef.current = false
          return
      }
    },
    [setIsCheckoutModalOpen],
  )

  const myFatoorahSettings = {
    card: {
      style: {
        hideNetworkIcons: false,
        cardHeight: "250px",
        tokenHeight: "230px",
        input: {
          color: "#333333",
          fontSize: "15px",
          fontFamily: "Arial, sans-serif",
          inputHeight: "42px",
          inputMargin: "8px",
          borderColor: "#d1d5db",
          backgroundColor: "#ffffff",
          borderWidth: "1px",
          borderRadius: "8px",
          placeHolder: {
            holderName: locale === "en" ? "Card Holder Name" : "اسم صاحب البطاقة",
            cardNumber: locale === "en" ? "Card Number" : "رقم البطاقة",
            expiryDate: "MM/YY",
            securityCode: "CVV",
          },
        },
        label: {
          display: true,
          color: "#374151",
          fontSize: "14px",
          fontWeight: "bold",
          fontFamily: "Madani-Arabic-Regular, sans-serif",
          text: {
            holderName: locale === "en" ? "Card Holder Name" : "اسم صاحب البطاقة",
            cardNumber: locale === "en" ? "Card Number" : "رقم البطاقة",
            expiryDate: locale === "en" ? "Expiry Date" : "تاريخ الانتهاء",
            securityCode: "CVV",
          },
        },
        error: {
          borderColor: "#ef4444",
          borderRadius: "8px",
        },
        button: {
          useCustomButton: false,
          textContent: locale === "en" ? "Pay Now" : "ادفع الآن",
          fontSize: "20px",
          fontFamily: "Madani-Arabic-Regular, sans-serif",
          color: "#ffffff",
          backgroundColor: "#ee6c4d",
          height: "52px",
          borderRadius: "50px",
          width: "100%",
          margin: "16px auto 0 auto",
          cursor: "pointer",
        },
        text: {
          saveCard: "Save card for future payments",
          addCard: "Use another card",
          deleteAlert: {
            title: "Delete Card",
            message: "Are you sure you want to delete this card?",
            confirm: "Yes",
            cancel: "No",
          },
        },
      },
    },
  }

  return (
    <div style={{ padding: "40px" }}>
      <div className="d-flex justify-content-between">
        <h4>{pathOr("", [locale, "Packages", "ChossenPackageDetails"], t)}</h4>
        <button
          onClick={() => push("/settings/packages")}
          className="btn-main btn-main-o"
          style={{ width: "100px" }}
          aria-label={pathOr("", [locale, "Products", "cancel"], t)}
        >
          {pathOr("", [locale, "Products", "cancel"], t)}
        </button>
      </div>
      <Row>
        <Col lg={8}>
          <div style={{ maxWidth: "420px", marginInline: "auto" }}>
            {packageDetails && <PackageCard pack={packageDetails} isCurrent={true} handleSubscribePackage={() => {}} />}
          </div>
          <div className="contint_paner" style={{ border: "1px solid #ddd" }}>
            <h4 className="main-color">{pathOr("", [locale, "Packages", "PackageDetails"], t)}</h4>
            <div className="d-flex justify-content-between flex-wrap">
              {packageDetails?.smSsCount === 0 && (
                <div className="d-flex gap-1">
                  <p>{pathOr("", [locale, "Packages", "Category"], t)}:</p>
                  <p>{packageDetails?.listCategories?.map((item) => item?.name).join(" - ")}</p>
                </div>
              )}
              <div className="d-flex gap-1">
                <p>{pathOr("", [locale, "Packages", "PackageType"], t)}:</p>
                <p>{packageDetails?.smSsCount > 0 ? "SMS" : "Publish"}</p>
              </div>
              <div className="d-flex gap-1">
                <p>{pathOr("", [locale, "Packages", "EndDate"], t)}:</p>
                <p>
                  {packageDetails?.endDate
                    ? moment(packageDetails?.endDate).format("DD-MM-YYYY")
                    : moment().add(packageDetails?.numMonth, "months").format("DD-MM-YYYY")}
                </p>
              </div>
            </div>
          </div>
        </Col>
        <Col lg={4}>
          <div className="contint_paner p-4">
            <div className={styles["Payment-details"]}>
              <div className="f-b mb-2">{pathOr("", [locale, "Products", "have_discount_coupon"], t)} </div>
              <div className={`po_R overflow-hidden mb-3 ${styles["search_P"]} d-flex`}>
                <input
                  type="text"
                  className={`form-control ${styles["form-control"]}`}
                  placeholder={pathOr("", [locale, "Products", "enter_coupon"], t)}
                  onChange={(e) => setCouponCode(e.target.value)}
                  value={couponCode}
                />
                <button
                  onClick={applyCoupon}
                  className={`btn-main ${styles["btn-main"]} position-absolute`}
                  style={{ right: locale === "en" ? "0" : undefined, left: locale === "en" ? undefined : 0 }}
                >
                  {pathOr("", [locale, "Products", "activate"], t)}
                </button>
              </div>

              <ul className={styles["list_salary"]}>
                {couponData && (
                  <li>
                    <span>{pathOr("", [locale, "Products", "couponCode"], t)}</span> <span>{couponCode}</span>
                  </li>
                )}

                <li className="d-flex justify-content-between px-3">
                  <span>{pathOr("", [locale, "Products", "package_price"], t)}</span>{" "}
                  <span>
                    {packageDetails?.price} {pathOr("", [locale, "Products", "currency"], t)}
                  </span>
                </li>
                <hr />

                {couponData && (
                  <>
                    <li className="d-flex justify-content-between px-3">
                      <span>{pathOr("", [locale, "Products", "coupon_discount"], t)}</span>{" "}
                      <span>
                        {"-"}
                        {couponData.discountValue} {pathOr("", [locale, "Products", "currency"], t)}
                      </span>
                    </li>
                    <hr />
                  </>
                )}

                {taxValue > 0 && (
                  <>
                    <li className="d-flex justify-content-between px-3">
                      <span>{pathOr("", [locale, "Products", "tax"], t)}</span>{" "}
                      <span>
                        {totalCost < 0 ? 0 : taxValue.toFixed(2)} {pathOr("", [locale, "Products", "currency"], t)}
                      </span>
                    </li>
                    <hr />
                  </>
                )}

                {totalWithTax > 0 && (
                  <li className="d-flex justify-content-between px-3">
                    <span>{pathOr("", [locale, "Orders", "total"], t)}</span>{" "}
                    <span>
                      <span>{totalWithTax <= 0 ? 0 : totalWithTax}</span>{" "}
                      {pathOr("", [locale, "Products", "currency"], t)}
                    </span>
                  </li>
                )}
              </ul>
              <hr />
              <div className="f-b mb-2">{pathOr("", [locale, "Products", "paymentOptions"], t)}</div>

              {isSub ? (
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  {locale === "en" ? "Renewal will be processed directly." : "سيتم تنفيذ التجديد مباشرة."}
                </div>
              ) : totalAmount === 0 ? (
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  {locale === "en" ? "No payment is required." : "لا يلزم الدفع."}
                </div>
              ) : (
                <MyFatoorahEmbeddedCard
                  amount={totalAmount}
                  currencyCode="KWD"
                  language={locale}
                  environment={
                    process.env.NEXT_PUBLIC_MYFATOORAH_ENV || (process.env.NODE_ENV === "production" ? "live" : "test")
                  }
                  containerId="card"
                  settings={myFatoorahSettings}
                  resetKey={mfResetKey}
                  onReady={({ sessionData }) => {
                    setMfSessionId(sessionData?.sessionId || "")
                  }}
                  onEmbeddedCallback={(response) => {
                    const cbSession =
                      response?.sessionId ||
                      response?.SessionId ||
                      response?.data?.sessionId ||
                      response?.Data?.SessionId ||
                      response?.Data?.sessionId
                    if (cbSession) setMfSessionId(cbSession)
                  }}
                  executePayment={executePayment}
                  iframeEnabled
                  hideDefaultIframe
                  onIframeUrlChange={(url) => {
                    setPaymentIframeUrl(url)
                    setIsPaymentModalOpen(true)
                  }}
                  closeIframeOn3DSMessage
                  on3DSRedirectUrl={() => {
                    setIsPaymentModalOpen(false)
                    setPaymentIframeUrl("")
                    setIsCheckoutModalOpen("loading")
                  }}
                  signalR={{
                    hubUrl: signalRHubUrl,
                    eventName: "PaymentStatusMessage",
                    start: "onPay",
                    skipNegotiation: true,
                    transport: "WebSockets",
                  }}
                  onPaymentStatus={handlePaymentStatus}
                  onError={(e) => {
                    console.error(e)
                    toast.error(locale === "en" ? "Payment error" : "حدث خطأ أثناء الدفع")
                    setIsCheckoutModalOpen("failed")
                    setIsPaymentModalOpen(false)
                    setPaymentIframeUrl("")
                    setMfResetKey((k) => k + 1)
                    hasRequestedPaymentRef.current = false
                  }}
                />
              )}
            </div>

            {isSub && (
              <button
                className={`${styles["btn-main"]} btn-main mt-2 w-100`}
                onClick={() => handlePackageRenew(packageDetails?.pakaId, packageDetails?.id)}
              >
                {pathOr("", [locale, "Packages", "renewPaka"], t)}
              </button>
            )}

            {!isSub && totalAmount > 0 && (
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 10 }}>
                {locale === "en"
                  ? "Complete card payment above (Pay Now). The package will be activated after payment confirmation."
                  : "أكمل الدفع بالبطاقة أعلاه (ادفع الآن). سيتم تفعيل الباقة بعد تأكيد الدفع."}
              </div>
            )}
            <button
              className={`${styles["btn-main"]} btn-main mt-2 w-100`}
              style={{ backgroundColor: "#45495E" }}
              onClick={() => push("/settings/packages")}
            >
              {pathOr("", [locale, "Packages", "Cancel"], t)}
            </button>
          </div>
        </Col>
      </Row>
      {isCheckoutModalOpen && (
        <PackageCheckoutModal isModalOpen={isCheckoutModalOpen} setIsModalOpen={setIsCheckoutModalOpen} />
      )}

      <Modal
        show={isPaymentModalOpen && !!paymentIframeUrl}
        onHide={() => {
          setIsPaymentModalOpen(false)
          setPaymentIframeUrl("")
          hasRequestedPaymentRef.current = false
          setMfResetKey((k) => k + 1)
        }}
        size="lg"
        centered
        contentClassName="p-0"
        dialogClassName="payment-iframe-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>{locale === "en" ? "Payment Confirmation" : "تأكيد الدفع"}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: 0, height: "80vh" }}>
          {paymentIframeUrl && (
            <iframe
              title="Payment OTP"
              src={paymentIframeUrl}
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          )}
        </Modal.Body>
      </Modal>
    </div>
  )
}

export default PackageCheckout
