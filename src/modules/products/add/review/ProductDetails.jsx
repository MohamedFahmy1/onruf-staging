import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import styles from "./productReview.module.css"
import { useRouter } from "next/router"
import { Row, Col } from "react-bootstrap"
import dateImage from "../../../../../public/icons/Copyright_expiry.svg"
import { FaCheckCircle } from "react-icons/fa"
import axios from "axios"
import { toast } from "react-toastify"
import { pathOr } from "ramda"
import t from "../../../../translations.json"
import Image from "next/image"
import moment from "moment/moment"
import { multiFormData } from "../../../../common/axiosHeaders"
import CheckoutModal from "./CheckoutModal"
import { useFetch } from "../../../../hooks/useFetch"
import MyFatoorahEmbeddedCard from "../../../../components/payments/MyFatoorahEmbeddedCard"
import { Modal } from "react-bootstrap"
import PointsModal from "./PointsModal"
import wallet from "../../../../../public/images/wallet.png"

const ProductDetails = ({ selectedCatProps, productFullData, handleBack, setProductPayload, initalProductPayload }) => {
  const { locale, pathname } = useRouter()
  const [shippingOptions, setShippingOptions] = useState([])
  const [packageDetails, setPackageDetails] = useState()
  const [couponData, setCouponData] = useState()
  const [couponCode, setCouponCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)
  const { data: freePublishPrice } = useFetch(`/ShowProductPublishPrice`)
  const [paymentMethod, setPaymentMethod] = useState(null) // null | "card" | "points"
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false)
  const [pointsData, setPointsData] = useState({})
  const debugPayments = process.env.NODE_ENV !== "production"
  const logPayment = useCallback(
    (...args) => {
      if (!debugPayments) return
      console.info("[ProductDetails:payment]", ...args)
    },
    [debugPayments],
  )

  const [mfInitiatedSessionId, setMfInitiatedSessionId] = useState("")
  const hasSubmittedAfterPaymentRef = useRef(false)
  const hasRequestedPaymentRef = useRef(false)
  const [paymentIframeUrl, setPaymentIframeUrl] = useState("")
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [mfResetKey, setMfResetKey] = useState(0)

  useEffect(() => {
    // If we get a new InitiateSession session, allow a new publish submission once payment is confirmed.
    hasSubmittedAfterPaymentRef.current = false
    hasRequestedPaymentRef.current = false
  }, [mfInitiatedSessionId])

  const isEditFlow = pathname.includes("edit") || !!(pathname.includes("repost") && !initalProductPayload?.isExpired)
  const canUseCoupon = !isEditFlow

  const hasSubtitle = (payload) => {
    const subTitleAr = typeof payload?.subTitleAr === "string" ? payload.subTitleAr.trim() : ""
    const subTitleEn = typeof payload?.subTitleEn === "string" ? payload.subTitleEn.trim() : ""
    return !!(subTitleAr || subTitleEn)
  }

  const getMediaCount = (payload, type) => payload?.listMedia?.filter((item) => item?.type === type)?.length || 0

  const getValidVideoCount = (payload) =>
    (payload?.videoUrl || []).filter((url) => String(url || "").trim() !== "").length

  const getCurrentImageCount = (payload) => (payload?.listImageFile?.length || 0) + getMediaCount(payload, 1)
  const getCurrentVideoCount = (payload) => getValidVideoCount(payload) + getMediaCount(payload, 2)
  const getInitialImageCount = (payload) => getMediaCount(payload, 1)
  const getInitialVideoCount = (payload) => getMediaCount(payload, 2)

  const feeSummary = useMemo(() => {
    const fees = {
      publishFee: 0,
      subtitleFee: 0,
      imageFee: 0,
      videoFee: 0,
      auctionFee: 0,
      negotiationFee: 0,
      fixedFee: 0,
      pakaFee: 0,
      auctionClosingTime: 0,
    }

    const freeImageAllowance =
      (Number(selectedCatProps?.freeProductImagesCount) || 0) + (Number(packageDetails?.countImage) || 0)
    const freeVideoAllowance =
      (Number(selectedCatProps?.freeProductVidoesCount) || 0) + (Number(packageDetails?.countVideo) || 0)
    const extraImageFee = Number(selectedCatProps?.extraProductImageFee) || 0
    const extraVideoFee = Number(selectedCatProps?.extraProductVidoeFee) || 0

    const currentImageCount = getCurrentImageCount(productFullData)
    const currentVideoCount = getCurrentVideoCount(productFullData)
    const currentExtraImages = Math.max(0, currentImageCount - freeImageAllowance)
    const currentExtraVideos = Math.max(0, currentVideoCount - freeVideoAllowance)

    const hasSubtitleNow = hasSubtitle(productFullData)
    const currentAuctionClosingTimeFixed = productFullData?.IsAuctionClosingTimeFixed

    console.log("initalProductPayload: ", initalProductPayload)
    console.log("productFullData: ", productFullData)
    console.log("selectedCatProps: ", selectedCatProps)

    if (isEditFlow) {
      const initialImageCount = getInitialImageCount(initalProductPayload)
      const initialVideoCount = getInitialVideoCount(initalProductPayload)
      const initialExtraImages = Math.max(0, initialImageCount - freeImageAllowance)
      const initialExtraVideos = Math.max(0, initialVideoCount - freeVideoAllowance)
      const extraImagesToPay = Math.max(0, currentExtraImages - initialExtraImages)
      const extraVideosToPay = Math.max(0, currentExtraVideos - initialExtraVideos)

      if (!packageDetails?.showSupTitle && !hasSubtitle(initalProductPayload) && hasSubtitleNow) {
        fees.subtitleFee = Number(selectedCatProps?.subTitleFee) || 0
      }
      fees.imageFee = extraImagesToPay * extraImageFee
      fees.videoFee = extraVideosToPay * extraVideoFee

      if (
        !packageDetails?.enableFixedPrice &&
        !initalProductPayload?.isFixedPriceEnabled &&
        productFullData?.IsFixedPriceEnabled
      ) {
        fees.fixedFee = Number(selectedCatProps?.enableFixedPriceSaleFee) || 0
      }
      if (
        !packageDetails?.enableNegotiable &&
        !initalProductPayload?.isNegotiationEnabled &&
        productFullData?.IsNegotiationEnabled
      ) {
        fees.negotiationFee = Number(selectedCatProps?.enableNegotiationFee) || 0
      }
      if (
        !packageDetails?.enableAuction &&
        !initalProductPayload?.isAuctionEnabled &&
        productFullData?.IsAuctionEnabled
      ) {
        fees.auctionFee = Number(selectedCatProps?.enableAuctionFee) || 0
      }

      const initialAuctionClosingTimeFixed = !!initalProductPayload?.isAuctionClosingTimeFixed

      if (
        !packageDetails?.auctionClosingTimeOption &&
        // check if initial auction closing time is fixed or auction wasn't even enabled in that case it's fine that fixed auction closing time is not enabled
        !!(
          initialAuctionClosingTimeFixed === true ||
          (initialAuctionClosingTimeFixed === false &&
            initalProductPayload.isAuctionEnabled === false &&
            productFullData?.IsAuctionEnabled === true)
        ) &&
        currentAuctionClosingTimeFixed === false
      ) {
        fees.auctionClosingTime = Number(selectedCatProps?.auctionClosingTimeFee) || 0
      }

      if (productFullData?.pakatId !== initalProductPayload?.productPaymentDetailsDto?.pakatId) {
        fees.pakaFee = Number(packageDetails?.price) || 0
      }
    } else {
      fees.publishFee = freePublishPrice ? Number(selectedCatProps?.productPublishPrice) || 0 : 0

      if (!packageDetails?.showSupTitle && hasSubtitleNow) {
        fees.subtitleFee = Number(selectedCatProps?.subTitleFee) || 0
      }

      fees.imageFee = currentExtraImages * extraImageFee
      fees.videoFee = currentExtraVideos * extraVideoFee

      if (!packageDetails?.enableAuction && productFullData?.IsAuctionEnabled) {
        fees.auctionFee = Number(selectedCatProps?.enableAuctionFee) || 0
      }
      if (!packageDetails?.enableNegotiable && productFullData?.IsNegotiationEnabled) {
        fees.negotiationFee = Number(selectedCatProps?.enableNegotiationFee) || 0
      }
      if (!packageDetails?.enableFixedPrice && productFullData?.IsFixedPriceEnabled) {
        fees.fixedFee = Number(selectedCatProps?.enableFixedPriceSaleFee) || 0
      }

      if (!packageDetails?.auctionClosingTimeOption && currentAuctionClosingTimeFixed === false) {
        fees.auctionClosingTime = Number(selectedCatProps?.auctionClosingTimeFee) || 0
      }

      if (productFullData?.pakatId && productFullData?.isNewPackage) {
        fees.pakaFee = Number(packageDetails?.price) || 0
      }
    }

    const couponDiscount = canUseCoupon ? Number(couponData?.discountValue) || 0 : 0
    const totalCost = Object.values(fees).reduce((sum, value) => sum + (Number(value) || 0), 0) - couponDiscount
    const taxValue = (totalCost * (15 / 100)).toFixed(2)
    const totalWithTax = +totalCost + +taxValue
    const totalAmount = totalWithTax <= 0 ? 0 : totalWithTax

    return { fees, couponDiscount, totalCost, taxValue, totalWithTax, totalAmount }
  }, [
    canUseCoupon,
    couponData?.discountValue,
    freePublishPrice,
    initalProductPayload,
    isEditFlow,
    packageDetails,
    productFullData,
    selectedCatProps,
  ])

  const {
    fees: {
      publishFee,
      subtitleFee,
      imageFee,
      videoFee,
      auctionFee,
      negotiationFee,
      fixedFee,
      pakaFee,
      auctionClosingTime,
    },
    couponDiscount,
    totalCost,
    taxValue,
    totalWithTax,
    totalAmount,
  } = feeSummary
  const currencyLabel = pathOr("", [locale, "Products", "currency"], t)
  const displayTaxValue = totalCost < 0 ? 0 : taxValue
  const displayTotal = totalWithTax <= 0 ? 0 : totalWithTax

  const getShippingOptions = useCallback(async () => {
    const data = await axios.get(`/GetAllShippingOptions`)
    const shippingNames = (data?.data?.data).filter((item) => productFullData.ShippingOptions.includes(item.id))
    // if (productFullData.ShippingOptions.includes(4)) {
    //   shippingNames.push({
    //     id: 4,
    //     shippingOptionName: pathOr("", [locale, "Products", "integratedShippingOptions"], t),
    //     shippingOptionDescription: pathOr("", [locale, "Products", "integratedShippingOptions"], t),
    //     shippingOptionImage: "",
    //   })
    // }
    setShippingOptions(shippingNames)
  }, [productFullData.ShippingOptions, locale])

  const getPackage = useCallback(async () => {
    if (productFullData.pakatId || productFullData["ProductPaymentDetailsDto.PakatId"]) {
      const data = await axios.get(
        `/GetPakaById?Pakatid=${
          productFullData.pakatId || productFullData["ProductPaymentDetailsDto.PakatId"]
        }&CategoryId=${productFullData.categoryId}`,
      )
      setPackageDetails(data?.data?.data)
    }
  }, [productFullData])

  const applyCoupon = async () => {
    try {
      const res = await axios.get(`/GetCouponByCode?couponCode=${couponCode}&couponScreen=1`)
      const couponData = res?.data?.data.coupon
      setCouponData(couponData)
      toast.success(locale === "en" ? "Coupon applied successfully!" : "تم تطبيق الكوبون بنجاح")
      setProductPayload((prev) => ({
        ...prev,
        "ProductPaymentDetailsDto.CouponId": couponData.id,
        "ProductPaymentDetailsDto.CouponDiscountValue": couponData.discountValue,
        "ProductPaymentDetailsDto.TotalAmountBeforeCoupon": totalWithTax,
        "ProductPaymentDetailsDto.TotalAmountAfterCoupon": totalWithTax - couponData.discountValue,
      }))
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
  useEffect(() => {
    productFullData.ShippingOptions.length > 0 && getShippingOptions()
  }, [productFullData.ShippingOptions, getShippingOptions])

  useEffect(() => {
    productFullData.pakatId && getPackage()
  }, [productFullData.pakatId])

  useEffect(() => {
    setProductPayload((prev) => ({
      ...prev,
      "ProductPaymentDetailsDto.TotalAmountBeforeCoupon": couponData?.discountValue
        ? totalWithTax + couponData?.discountValue
        : totalWithTax,
      "ProductPaymentDetailsDto.TotalAmountAfterCoupon": totalWithTax,
    }))
  }, [totalWithTax, setProductPayload, couponData?.discountValue])

  // NOTE: The submit logic is now handled by `submitProduct()` and (for add/repost)
  // is triggered after payment confirmation via SignalR.
  // Determine the main image in the edit & repost section
  let imageSrc
  if (!pathname.includes("add")) {
    const numberOfOldImages = productFullData.listMedia?.filter((item) => item.type === 1)
    const indexOfNewAddedImage = productFullData.MainImageIndex - numberOfOldImages?.length
    if (productFullData.listImageFile?.length > 0) {
      productFullData.MainImageIndex > numberOfOldImages?.length - 1
        ? (imageSrc = URL.createObjectURL(productFullData.listImageFile[indexOfNewAddedImage]))
        : (imageSrc = numberOfOldImages[productFullData.MainImageIndex]?.url)
    } else {
      imageSrc = numberOfOldImages[productFullData.MainImageIndex]?.url
    }
  }

  const buildProductFormData = useCallback(
    ({ sessionIdOverride, pointsNumberOverride, paymentType = "card" } = {}) => {
      let formData = new FormData()

      productFullData.listImageFile.forEach((ele, indx) => {
        ele.id === productFullData.MainImageIndex && indx !== 0 && productFullData.listImageFile.move(indx, 0)
      })

      pathname.includes("edit") && formData.append("EditOrRepost", 1)
      pathname.includes("repost") && formData.append("EditOrRepost", 2)

      for (let key in productFullData) {
        const value = productFullData[key]
        if (key === "listImageFile") {
          for (const image of value) {
            formData.append("listImageFile", image)
          }
        }
        // if any value is empty don't send it to the api // and don't send productImage & listMedia
        else if (value === "" || value === null || key === "productImage" || key === "listMedia") {
          continue
        } else if (key === "productSep") {
          // filter out empty values
          const filteredValue = value.filter((item) => !!item.ValueSpeAr || !!item.ValueSpeEn)
          formData.append(key, JSON.stringify(filteredValue))
        } else if (Array.isArray(value)) {
          if (key == "ShippingOptions") {
            value.forEach((item) => {
              formData.append(key, Number(item))
            })
          }
          // if array is empty don't send it to the api
          else if (value[0] === "") {
            continue
          } else
            value.forEach((item) => {
              formData.append(key, item)
            })
        } else {
          formData.append(key, value)
        }
      }

      // append payment details to the form data in case of add / repost / edit
      // (you requested sending ExecutePaymentDto.SessionId for both AddProduct and EditProduct payloads)
      if (pathname.includes("add") || pathname.includes("repost") || pathname.includes("edit")) {
        formData.append("ExecutePaymentDto.TotalAmount", totalAmount)

        if (paymentType === "points") {
          const pn = pointsNumberOverride ?? pointsData?.pointsNumber
          if (pn) formData.append("ExecutePaymentDto.PointsNumber", pn)
          // Legacy ID previously used for points payment in this flow
          formData.append("ExecutePaymentDto.PaymentMethodId", 6)
        } else {
          // Card (MyFatoorah embedded)
          const sid = sessionIdOverride || mfInitiatedSessionId
          if (sid) formData.append("ExecutePaymentDto.SessionId", sid)
        }
      }

      return formData
    },
    [mfInitiatedSessionId, pathname, pointsData?.pointsNumber, productFullData, totalAmount],
  )

  const submitProduct = useCallback(
    async ({ sessionIdOverride, pointsNumberOverride, paymentType = "card" } = {}) => {
      setLoading(true)

      const formData = buildProductFormData({ sessionIdOverride, pointsNumberOverride, paymentType })

      // Add product
      if (pathname.includes("add")) {
        return axios.post("/AddProduct", formData, multiFormData)
      }

      // Edit or repost product
      return axios.post("/EditProduct", formData, multiFormData)
    },
    [buildProductFormData, pathname],
  )

  // After the user clicks "Pay Now" in the embedded form, MyFatoorah triggers the callback with a session id.
  // Per your requirement: we do NOT call /ExecutePayment here. We call Add/EditProduct with InitiateSession SessionId,
  // and expect the API response to include PaymentUrl/PaymentURL for opening the 3DS iframe.
  // We pass the callback SessionId override into the form data to ensure it is included.
  const executePayment = useCallback(
    async ({ sessionId }) => {
      if (hasRequestedPaymentRef.current) {
        logPayment("executePayment skipped: already requested")
        return null
      }
      hasRequestedPaymentRef.current = true
      logPayment("executePayment start", { isEditFlow, hasSessionId: !!sessionId, totalAmount })
      try {
        const result = await submitProduct({ sessionIdOverride: sessionId, paymentType: "card" })
        logPayment("executePayment response", { hasData: !!result?.data })
        return result
      } catch (e) {
        hasRequestedPaymentRef.current = false
        logPayment("executePayment error", e)
        throw e
      }
    },
    [submitProduct, logPayment, isEditFlow, totalAmount],
  )

  const handleAcceptPoints = (pointsValue, pointsNumber) => {
    setPaymentMethod("points")
    setIsPointsModalOpen(false)
    setPointsData({ pointsValue, pointsNumber })
  }

  const toggleOffPaymentOption = () => {
    // Used by PointsModal when points are not sufficient or user closes it
    setPaymentMethod(null)
    setPointsData({})
  }

  const handleChooseCard = () => {
    setPaymentMethod("card")
    setPointsData({})
  }

  const handleChoosePoints = () => {
    setPaymentMethod("points")
    setIsPointsModalOpen(true)
  }

  const handleChangePaymentMethod = () => {
    setPaymentMethod(null)
    setPointsData({})
    setIsPaymentModalOpen(false)
    setPaymentIframeUrl("")
    hasRequestedPaymentRef.current = false
    setMfResetKey((k) => k + 1)
  }

  const handlePaymentStatus = useCallback(
    async (rawStatus) => {
      // SignalR confirms the transaction result. Add/EditProduct was already called to generate the PaymentUrl.
      const extractFromObject = (value) => {
        if (!value || typeof value !== "object") return ""
        const direct =
          value.status ||
          value.Status ||
          value.message ||
          value.Message ||
          value.paymentStatus ||
          value.PaymentStatus ||
          value.result ||
          value.Result ||
          value.value ||
          value.Value
        if (direct !== undefined && direct !== null) return String(direct).trim()
        const nested = value.data || value.Data
        if (nested && typeof nested === "object") return extractFromObject(nested)
        return ""
      }
      const normalizeStatus = (value) => {
        if (value === undefined || value === null) return ""
        if (typeof value === "string") {
          const trimmed = value.trim()
          if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            try {
              return normalizeStatus(JSON.parse(trimmed))
            } catch (_) {
              return trimmed
            }
          }
          return trimmed
        }
        if (typeof value === "object") return extractFromObject(value)
        return String(value).trim()
      }
      const status = normalizeStatus(rawStatus)
      logPayment("payment status received", { rawStatus, status })
      switch (status) {
        case "PaymentSuccessMessage":
          setIsCheckoutModalOpen("success")
          setLoading(false)
          setIsPaymentModalOpen(false)
          setPaymentIframeUrl("")
          setMfResetKey((k) => k + 1)
          return
        case "PaymentFailedMessage":
          setIsCheckoutModalOpen("failed")
          setLoading(false)
          setIsPaymentModalOpen(false)
          setPaymentIframeUrl("")
          setMfResetKey((k) => k + 1)
          hasRequestedPaymentRef.current = false
          return
        case "PaymentPendingMessage":
          return
        default:
          break
      }

      const statusLower = status.toLowerCase()
      if (statusLower.includes("success")) {
        setIsCheckoutModalOpen("success")
        setLoading(false)
        setIsPaymentModalOpen(false)
        setPaymentIframeUrl("")
        setMfResetKey((k) => k + 1)
        return
      }
      if (statusLower.includes("pending")) {
        return
      }
      if (statusLower.includes("fail") || statusLower.includes("error")) {
        setIsCheckoutModalOpen("failed")
        setLoading(false)
        setIsPaymentModalOpen(false)
        setPaymentIframeUrl("")
        setMfResetKey((k) => k + 1)
        hasRequestedPaymentRef.current = false
        return
      }

      // Unknown status -> treat as failure for safety
      setIsCheckoutModalOpen("failed")
      setLoading(false)
      setIsPaymentModalOpen(false)
      setPaymentIframeUrl("")
      setMfResetKey((k) => k + 1)
      hasRequestedPaymentRef.current = false
      return
    },
    [logPayment],
  )

  const signalRHubUrl = useMemo(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || ""
    // Common case: API base includes /api/v1, while hub is hosted at root /chatHub
    const base = String(api)
      .replace(/\/api\/v\d+\/?$/i, "")
      .replace(/\/+$/, "")
    return base ? `${base}/chatHub` : "/chatHub"
  }, [])

  return (
    <div style={{ padding: "20px 0 !important" }}>
      {pathname.includes("add") && (
        <div className="d-flex justify-content-between align-items-center">
          <h5>{pathOr("", [locale, "Products", "review_product_before_adding"], t)}</h5>
          <button
            onClick={handleBack}
            className="btn-main btn-main-o"
            style={{ width: "100px" }}
            aria-label={pathOr("", [locale, "Products", "cancel"], t)}
          >
            {pathOr("", [locale, "Products", "cancel"], t)}
          </button>
        </div>
      )}
      <Row>
        <Col lg={9}>
          <div className="contint_paner">
            <div className="d-flex align-items-center justify-content-between mb-4 gap-2 flex-wrap">
              <h6 className="f-b fs-4 m-0">{pathOr("", [locale, "Products", "productDetails"], t)}</h6>
              <button>
                <p className="f-b fs-5 main-color" onClick={handleBack}>
                  {pathOr("", [locale, "Products", "editFolder"], t)}
                </p>
              </button>
            </div>
            <Row className="align-items-center">
              <Col lg={6}>
                <div className="d-flex align-items-center gap-1">
                  {productFullData.productImage && !pathname.includes("add") && (
                    <div style={{ position: "relative", width: "106px", height: "100px" }}>
                      <Image
                        src={imageSrc}
                        className="img_table"
                        alt="product"
                        priority
                        layout="fill"
                        objectFit="contain"
                      />
                    </div>
                  )}
                  {pathname.includes("add") && (
                    <div style={{ position: "relative", width: "106px", height: "100px" }}>
                      <Image
                        src={URL.createObjectURL(productFullData.listImageFile[productFullData.MainImageIndex])}
                        className="img_table"
                        alt="product"
                        priority
                        layout="fill"
                        objectFit="contain"
                      />
                    </div>
                  )}
                  <div className="mx-3">
                    <div className="gray-color">{selectedCatProps?.name}</div>
                    <div className="f-b">
                      {locale == "en"
                        ? productFullData?.nameEn || productFullData?.nameAr
                        : productFullData?.nameAr || productFullData?.nameEn}
                    </div>
                    <div className="gray-color">
                      {locale == "en"
                        ? productFullData?.subTitleEn || productFullData?.subTitleAr
                        : productFullData?.subTitleAr || productFullData?.subTitleEn}
                    </div>
                  </div>
                </div>
              </Col>
              <Col lg={6}>
                <div>
                  <div className={styles["info_boxo_"]}>
                    <span>{pathOr("", [locale, "Products", "itemStatus"], t)}</span>
                    <span>
                      {productFullData && productFullData.status === 1
                        ? pathOr("", [locale, "Products", "used"], t)
                        : pathOr("", [locale, "Products", "new"], t)}
                    </span>
                  </div>
                  <div className={styles["info_boxo_"]}>
                    <span>{pathOr("", [locale, "Products", "quantity"], t)}</span>
                    <span>
                      {productFullData && productFullData.qty === 1
                        ? pathOr("", [locale, "Home", "singleProduct"], t)
                        : productFullData.qty
                        ? `${productFullData.qty} ${pathOr("", [locale, "Home", "products"], t)}`
                        : pathOr("", [locale, "Products", "unLimited"], t)}
                    </span>
                  </div>
                </div>
              </Col>
            </Row>
            <p className="mt-4">
              {productFullData &&
                (locale == "en"
                  ? productFullData?.descriptionEn || productFullData?.descriptionAr
                  : productFullData?.descriptionAr || productFullData?.descriptionEn)}
            </p>
          </div>
          <div className="contint_paner">
            <div className="d-flex align-items-center justify-content-between mb-4 gap-2 flex-wrap">
              <h6 className="f-b fs-4 m-0">{pathOr("", [locale, "Products", "sellingDetails"], t)}</h6>
              <button>
                <p className="f-b fs-5 main-color" onClick={handleBack}>
                  {pathOr("", [locale, "Products", "editFolder"], t)}
                </p>
              </button>
            </div>
            <Row>
              <Col md={6}>
                <div className={styles["info_boxo_"]}>
                  <span>{pathOr("", [locale, "Products", "salesType"], t)}</span>
                  <div className="d-flex gap-2">
                    {Boolean(productFullData && productFullData.IsNegotiationEnabled) && (
                      <span>
                        {pathOr("", [locale, "Products", "negotiation"], t)}
                        <span className="font-18 main-color mx-1">
                          <FaCheckCircle />
                        </span>
                      </span>
                    )}
                    {Boolean(productFullData && productFullData.IsFixedPriceEnabled) && (
                      <span>
                        {pathOr("", [locale, "Products", "fixed"], t)}
                        <span className="font-18 main-color mx-1">
                          <FaCheckCircle />
                        </span>
                      </span>
                    )}
                    {Boolean(productFullData && productFullData.IsAuctionEnabled) && (
                      <span>
                        {pathOr("", [locale, "Products", "adAuct"], t)}
                        <span className="font-18 main-color mx-1">
                          <FaCheckCircle />
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </Col>
              {productFullData?.IsFixedPriceEnabled && (
                <Col md={6}>
                  <div className={styles["info_boxo_"]}>
                    <span>
                      <p>{pathOr("", [locale, "Products", "purchasingPrice"], t)}</p>
                    </span>
                    <span>
                      {productFullData && productFullData?.Price} {pathOr("", [locale, "Products", "currency"], t)}
                    </span>
                  </div>
                </Col>
              )}
              {productFullData?.IsNegotiationEnabled && (
                <Col md={6}>
                  <div className={styles["info_boxo_"]}>
                    <span>{pathOr("", [locale, "Products", "PriceIsNegotiable"], t)}</span>
                    <div className="d-flex gap-2">
                      <span>
                        {pathOr("", [locale, "Products", "Yes"], t)}
                        <span className="font-18 main-color mx-1">
                          <FaCheckCircle />
                        </span>
                      </span>
                    </div>
                  </div>
                </Col>
              )}
              {!!(productFullData && productFullData.IsAuctionEnabled) && (
                <Fragment>
                  <Col md={6}>
                    <div className={styles["info_boxo_"]}>
                      <span>
                        <p>{pathOr("", [locale, "Products", "minimum_price"], t)}</p>
                      </span>
                      <span>
                        {productFullData && productFullData?.AuctionMinimumPrice}{" "}
                        {pathOr("", [locale, "Products", "currency"], t)}
                      </span>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className={styles["info_boxo_"]}>
                      <span>
                        <p>{pathOr("", [locale, "Products", "auction_start_price"], t)}</p>
                      </span>
                      <span>
                        {productFullData && productFullData?.AuctionStartPrice}{" "}
                        {pathOr("", [locale, "Products", "currency"], t)}
                      </span>
                    </div>
                  </Col>
                </Fragment>
              )}
              <Col md={12}>
                <div className={styles["info_boxo_"]}>
                  <span>
                    <p>{pathOr("", [locale, "Products", "paymentOptions"], t)}</p>
                  </span>
                  <span>
                    <div className="d-flex gap-2">
                      {Boolean(productFullData && productFullData.PaymentOptions.includes(1)) && (
                        <span>
                          {pathOr("", [locale, "Products", "cash"], t)}
                          <span className="font-18 main-color mx-1">
                            <FaCheckCircle />
                          </span>
                        </span>
                      )}
                      {Boolean(productFullData && productFullData.PaymentOptions.includes(2)) && (
                        <span>
                          {pathOr("", [locale, "Products", "bankTransfer"], t)}
                          <span className="font-18 main-color mx-1">
                            <FaCheckCircle />
                          </span>
                        </span>
                      )}
                      {Boolean(productFullData && productFullData.PaymentOptions.includes(3)) && (
                        <span>
                          {pathOr("", [locale, "Products", "creditCard"], t)}
                          <span className="font-18 main-color mx-1">
                            <FaCheckCircle />
                          </span>
                        </span>
                      )}
                      {Boolean(productFullData && productFullData.PaymentOptions.includes(4)) && (
                        <span>
                          {pathOr("", [locale, "Products", "mada"], t)}
                          <span className="font-18 main-color mx-1">
                            <FaCheckCircle />
                          </span>
                        </span>
                      )}
                    </div>
                  </span>
                </div>
              </Col>
            </Row>
          </div>

          <div className="contint_paner">
            <div className="d-flex align-items-center justify-content-between mb-4 gap-2 flex-wrap">
              <h6 className="f-b fs-4 m-0">{pathOr("", [locale, "Products", "shippingAndDuration"], t)}</h6>
              <button>
                <p className="f-b fs-5 main-color" onClick={handleBack}>
                  {pathOr("", [locale, "Products", "editFolder"], t)}
                </p>
              </button>
            </div>
            {productFullData.IsAuctionEnabled && (
              <Row>
                <h6 className="f-b m-0">{pathOr("", [locale, "Products", "offer_duration"], t)}</h6>
                <div className={styles["info_boxo_"]}>
                  <span>
                    {productFullData &&
                      moment(productFullData.AuctionClosingTime)
                        .locale(locale === "ar" ? "ar" : "en")
                        .format(locale === "ar" ? "YYYY/MM/DD - hh:mm a" : "DD/MM/YYYY - hh:mm a")}
                  </span>
                  <span className="font-18 main-color">
                    <Image src={dateImage} alt="calendar" width={20} height={20} />
                  </span>
                </div>
              </Row>
            )}
            <Row>
              <h6 className="f-b m-0">{pathOr("", [locale, "Products", "shippingOptions"], t)}</h6>
              {shippingOptions?.map((item) => (
                <Col md={6} key={item.id}>
                  <div className={styles["info_boxo_"]} key={item.id}>
                    <span>{productFullData && item.shippingOptionName}</span>
                    <span className="font-18 main-color">
                      <FaCheckCircle />
                    </span>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
          {packageDetails && (
            <div className="contint_paner">
              <div className="d-flex align-items-center justify-content-between mb-4 gap-2 flex-wrap">
                <h6 className="f-b fs-4  m-0">{pathOr("", [locale, "Products", "selected_package"], t)}</h6>
                <button>
                  <p className="f-b fs-5 main-color" onClick={handleBack}>
                    {pathOr("", [locale, "Products", "editFolder"], t)}
                  </p>
                </button>
              </div>
              <div className={styles["info_boxo_"]}>
                <span>{productFullData && (locale == "en" ? packageDetails?.nameEn : packageDetails?.nameAr)}</span>
                <span className="font-18 main-color">
                  <FaCheckCircle />
                </span>
              </div>
            </div>
          )}
        </Col>

        <Col lg={3}>
          <div className="contint_paner p-2">
            <div className={styles["Payment-details"]}>
              {canUseCoupon && (
                <Fragment>
                  <div className="f-b mb-2">{pathOr("", [locale, "Products", "have_discount_coupon"], t)} </div>
                  <div className={`po_R overflow-hidden mb-3 ${styles["search_P"]}`}>
                    <input
                      type="text"
                      className={`form-control ${styles["form-control"]}`}
                      placeholder={pathOr("", [locale, "Products", "enter_coupon"], t)}
                      onChange={(e) => setCouponCode(e.target.value)}
                      value={couponCode}
                    />
                    <button
                      onClick={applyCoupon}
                      className={`btn-main ${styles["btn-main"]}`}
                      style={{ right: locale === "en" ? "0" : undefined, left: locale === "en" ? undefined : 0 }}
                    >
                      {pathOr("", [locale, "Products", "activate"], t)}
                    </button>
                  </div>
                </Fragment>
              )}
              <h6 component="h1">{pathOr("", [locale, "Products", "PaymentDetails"], t)}</h6>
              <ul className={styles["list_salary"]}>
                {publishFee > 0 && (
                  <li>
                    <span>{pathOr("", [locale, "Products", "publishing_price"], t)}</span>{" "}
                    <span>
                      {publishFee} {currencyLabel}
                    </span>
                  </li>
                )}
                {canUseCoupon && couponData && (
                  <li>
                    <span>{pathOr("", [locale, "Products", "couponCode"], t)}</span> <span>{couponCode}</span>
                  </li>
                )}
                {subtitleFee > 0 && (
                  <li>
                    <span>{pathOr("", [locale, "Products", "subtitle_fee"], t)}</span>{" "}
                    <span>
                      {subtitleFee} {currencyLabel}
                    </span>
                  </li>
                )}
                {imageFee > 0 && (
                  <li>
                    <span>{pathOr("", [locale, "Products", "additional_product_images_fee"], t)}</span>{" "}
                    <span>
                      {imageFee} {currencyLabel}
                    </span>
                  </li>
                )}
                {videoFee > 0 && (
                  <li>
                    <span>{pathOr("", [locale, "Products", "additional_product_videos_fee"], t)}</span>{" "}
                    <span>
                      {videoFee} {currencyLabel}
                    </span>
                  </li>
                )}
                {auctionFee > 0 && (
                  <li>
                    <span>{pathOr("", [locale, "Products", "auction_fee"], t)}</span>{" "}
                    <span>
                      {auctionFee} {currencyLabel}
                    </span>
                  </li>
                )}
                {negotiationFee > 0 && (
                  <li>
                    <span>{pathOr("", [locale, "Products", "negotiation_fee"], t)}</span>{" "}
                    <span>
                      {negotiationFee} {currencyLabel}
                    </span>
                  </li>
                )}
                {fixedFee > 0 && (
                  <li>
                    <span>{pathOr("", [locale, "Products", "fixed_price_selling_fee"], t)}</span>{" "}
                    <span>
                      {fixedFee} {currencyLabel}
                    </span>
                  </li>
                )}
                {auctionClosingTime > 0 && (
                  <li>
                    <span>{pathOr("", [locale, "Products", "AuctionClosingTimeFee"], t)}</span>{" "}
                    <span>
                      {auctionClosingTime} {currencyLabel}
                    </span>
                  </li>
                )}
                {pakaFee > 0 && (
                  <li>
                    <span>{pathOr("", [locale, "Products", "package_price"], t)}</span>{" "}
                    <span>
                      {pakaFee} {currencyLabel}
                    </span>
                  </li>
                )}
                {canUseCoupon && couponDiscount > 0 && (
                  <li>
                    <span>{pathOr("", [locale, "Products", "coupon_discount"], t)}</span>{" "}
                    <span>
                      {"-"}
                      {couponDiscount} {currencyLabel}
                    </span>
                  </li>
                )}
                {Number(taxValue) > 0 && (
                  <li>
                    <span>{pathOr("", [locale, "Products", "tax"], t)}</span>{" "}
                    <span>
                      {displayTaxValue} {currencyLabel}
                    </span>
                  </li>
                )}
                <li>
                  <span>{pathOr("", [locale, "Orders", "total"], t)}</span>{" "}
                  <span>
                    {canUseCoupon && couponDiscount > 0 && (
                      <span style={{ textDecoration: "line-through" }}>
                        {totalWithTax + couponDiscount} {currencyLabel}
                      </span>
                    )}{" "}
                    <span>{displayTotal}</span> {currencyLabel}
                  </span>
                </li>
              </ul>
              <hr />
              <div className="f-b mb-2">{pathOr("", [locale, "Products", "paymentOptions"], t)}</div>

              {totalAmount === 0 ? (
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  {locale === "en" ? "No payment is required for this publish." : "لا يلزم الدفع لنشر هذا المنتج."}
                </div>
              ) : (
                <div>
                  {paymentMethod !== "card" && (
                    <div className="row">
                      <div className="col-lg-12">
                        <div className="form-group">
                          <div className="form-control outer-check-input  d-flex justify-content-between">
                            <div className="form-check form-switch p-0 m-0 d-flex w-auto">
                              <input
                                className="form-check-input m-0"
                                type="checkbox"
                                role="switch"
                                id="visa"
                                checked={paymentMethod === "card"}
                                onChange={handleChooseCard}
                              />
                              <span className="bord" />
                            </div>
                            <label htmlFor="visa">{pathOr("", [locale, "Products", "Visa_MasterCard"], t)}</label>
                          </div>
                        </div>
                      </div>

                      <div className="col-lg-12">
                        <div className="form-group">
                          <div className="form-control outer-check-input d-flex justify-content-between">
                            <div className="form-check form-switch p-0 m-0 w-auto">
                              <input
                                className="form-check-input m-0"
                                type="checkbox"
                                role="switch"
                                id="wallet"
                                checked={paymentMethod === "points"}
                                onChange={() => {
                                  if (paymentMethod === "points") toggleOffPaymentOption()
                                  else handleChoosePoints()
                                }}
                              />
                              <span className="bord" />
                            </div>
                            <label htmlFor="wallet">{pathOr("", [locale, "Products", "MyPoints"], t)}</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === "points" && !!pointsData?.pointsValue && (
                    <div className="form-group mt-2">
                      <div
                        style={{
                          border: "1px solid var(--main)",
                          borderRadius: "19px",
                          padding: "20px",
                        }}
                        className="d-flex justify-content-center align-items-center gap-2"
                      >
                        <Image src={wallet} alt="wallet" width={55} height={55} />
                        <p style={{ fontSize: "16px", margin: 0 }}>
                          {pathOr("", [locale, "Products", "PointsBalance"], t)} {pointsData.pointsValue}{" "}
                          {currencyLabel}
                        </p>
                      </div>
                    </div>
                  )}

                  {paymentMethod === "card" && (
                    <div>
                      <MyFatoorahEmbeddedCard
                        amount={totalAmount}
                        currencyCode="KWD"
                        language={locale}
                        environment={process.env.NEXT_PUBLIC_MYFATOORAH_ENV || "test"}
                        containerId="card"
                        onReady={({ sessionData }) => {
                          setMfInitiatedSessionId(sessionData?.sessionId || "")
                        }}
                        onEmbeddedCallback={(response) => {
                          const cbSession =
                            response?.sessionId ||
                            response?.SessionId ||
                            response?.data?.sessionId ||
                            response?.Data?.SessionId ||
                            response?.Data?.sessionId
                          if (cbSession) setMfInitiatedSessionId(cbSession)
                        }}
                        executePayment={executePayment}
                        iframeEnabled
                        hideDefaultIframe
                        resetKey={mfResetKey}
                        onIframeUrlChange={(url) => {
                          setPaymentIframeUrl(url)
                          setIsPaymentModalOpen(true)
                          logPayment("iframe url received", url)
                        }}
                        // keep iframe visible; show final status via SignalR
                        closeIframeOn3DSMessage={false}
                        on3DSRedirectUrl={(url, message) => {
                          logPayment("3ds redirect", { url, message })
                          setIsCheckoutModalOpen("loading")
                        }}
                        signalR={{
                          hubUrl: signalRHubUrl,
                          eventName: isEditFlow
                            ? ["PaymentStatusMessage", "PaymentStatus", "paymentStatusMessage", "paymentStatus"]
                            : "PaymentStatusMessage",
                          // Keep edit flow connected before EditProduct fires.
                          start: isEditFlow ? "onMount" : "onPay",
                          skipNegotiation: true,
                          transport: "WebSockets",
                          debug: debugPayments,
                          onMessage: (message, eventName) => logPayment("signalR message", { eventName, message }),
                          logLevel: debugPayments ? "Debug" : "Information",
                        }}
                        onPaymentStatus={handlePaymentStatus}
                        onError={(e) => {
                          console.error(e)
                          logPayment("payment error", e)
                          toast.error(locale === "en" ? "Payment error" : "حدث خطأ أثناء الدفع")
                          setIsCheckoutModalOpen("failed")
                          setLoading(false)
                        }}
                      />

                      <button
                        type="button"
                        className="btn-main w-100 mt-3"
                        onClick={handleChangePaymentMethod}
                        style={{ fontSize: "18px", fontWeight: "normal" }}
                      >
                        {locale === "en" ? "Change payment method" : "تغيير طريقة الدفع"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {(totalAmount === 0 || paymentMethod === "points") && (
              <button
                className={`${styles["btn-main"]} btn-main mt-2 w-100`}
                disabled={loading || (paymentMethod === "points" && totalAmount > 0 && !pointsData?.pointsNumber)}
                onClick={async () => {
                  try {
                    setIsCheckoutModalOpen("loading")

                    if (paymentMethod === "points" && totalAmount > 0) {
                      if (!pointsData?.pointsNumber) {
                        setIsPointsModalOpen(true)
                        setIsCheckoutModalOpen(false)
                        return
                      }
                      await submitProduct({ paymentType: "points", pointsNumberOverride: pointsData.pointsNumber })
                    } else {
                      await submitProduct()
                    }
                    setIsCheckoutModalOpen("success")
                  } catch (e) {
                    setIsCheckoutModalOpen("failed")
                  } finally {
                    setLoading(false)
                  }
                }}
              >
                {pathname.includes("add") && pathOr("", [locale, "Products", "addNewProduct"], t)}
                {pathname.includes("edit") && pathOr("", [locale, "Products", "save"], t)}
                {pathname.includes("repost") && pathOr("", [locale, "Products", "repost_product"], t)}
              </button>
            )}
            <button
              className={`${styles["btn-main"]} btn-main mt-2 w-100`}
              style={{ backgroundColor: "#45495E" }}
              onClick={handleBack}
            >
              {pathOr("", [locale, "Packages", "Cancel"], t)}
            </button>
          </div>
        </Col>
        {isCheckoutModalOpen && (
          <CheckoutModal
            isModalOpen={isCheckoutModalOpen}
            setIsModalOpen={setIsCheckoutModalOpen}
            totalAmount={totalAmount}
          />
        )}

        {isPointsModalOpen && (
          <PointsModal
            isPointsModalOpen={isPointsModalOpen}
            setIsPointsModalOpen={setIsPointsModalOpen}
            totalCost={totalAmount}
            handleAccept={handleAcceptPoints}
            toggleOffPaymentOption={toggleOffPaymentOption}
          />
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
      </Row>
    </div>
  )
}

export default ProductDetails
