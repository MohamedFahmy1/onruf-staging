import { Fragment, useCallback, useEffect, useState } from "react"
import styles from "./productReview.module.css"
import { useRouter } from "next/router"
import { Row, Col, Button } from "react-bootstrap"
import dateImage from "../../../../../public/icons/Copyright_expiry.svg"
import { FaCheckCircle } from "react-icons/fa"
import axios from "axios"
import { toast } from "react-toastify"
import { pathOr } from "ramda"
import t from "../../../../translations.json"
import Image from "next/image"
import moment from "moment/moment"
import { multiFormData } from "../../../../common/axiosHeaders"
import PointsModal from "./PointsModal"
import VisaModal from "./VisaModal"
import MadaModal from "./MadaModal"
import wallet from "../../../../../public/images/wallet.png"

const ProductDetails = ({ selectedCatProps, productFullData, handleBack, setProductPayload }) => {
  const { locale, pathname, push } = useRouter()
  const [paymentOption, setPaymentOption] = useState()
  const [shippingOptions, setShippingOptions] = useState([])
  const [packageDetails, setPackageDetails] = useState()
  const [couponData, setCouponData] = useState()
  const [couponCode, setCouponCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false)
  const [isVisaModalOpen, setIsVisaModalOpen] = useState(false)
  const [isMadaModalOpen, setIsMadaModalOpen] = useState(false)
  const [selectedCard, setSelectedCard] = useState(null)
  const [pointsBalance, setPointsBalance] = useState(0)

  console.log(selectedCard)

  const totalImageFee =
    productFullData?.listImageFile.length > selectedCatProps?.freeProductImagesCount + packageDetails?.countImage
      ? selectedCatProps?.extraProductImageFee *
        (productFullData?.listImageFile.length - selectedCatProps?.freeProductImagesCount - packageDetails?.countImage)
      : 0

  const totalVideoFee =
    productFullData?.videoUrl?.length > selectedCatProps?.freeProductVidoesCount + packageDetails?.countVideo
      ? selectedCatProps?.extraProductVidoeFee *
        (productFullData?.videoUrl?.length - selectedCatProps?.freeProductVidoesCount - packageDetails?.countVideo)
      : 0

  const auctionFee =
    packageDetails?.enableAuction === true
      ? 0
      : productFullData?.IsAuctionEnabled
      ? selectedCatProps?.enableAuctionFee
      : 0

  const negotiationFee =
    packageDetails?.enableNegotiable === true
      ? 0
      : productFullData?.IsNegotiationEnabled
      ? selectedCatProps?.enableNegotiationFee
      : 0

  const fixedFee =
    packageDetails?.enableFixedPrice === true
      ? 0
      : productFullData?.IsFixedPriceEnabled
      ? selectedCatProps?.enableFixedPriceSaleFee
      : 0

  const pakaFee = !!(productFullData?.pakatId && productFullData?.isNewPackage) ? packageDetails?.price : 0

  const auctionClosingTime =
    packageDetails?.auctionClosingTimeOption === true
      ? 0
      : productFullData?.IsAuctionClosingTimeFixed === false
      ? selectedCatProps?.auctionClosingTimeFee
      : 0

  const couponDiscount = couponData ? couponData.discountValue : 0

  const subtitleFee =
    packageDetails?.showSupTitle === true
      ? 0
      : !!(productFullData?.subTitleAr?.trim() !== "" || productFullData?.subTitleEn?.trim() !== "")
      ? selectedCatProps?.subTitleFee
      : 0

  const totalCost =
    +selectedCatProps?.productPublishPrice +
    +subtitleFee +
    +totalImageFee +
    +totalVideoFee +
    +auctionFee +
    +negotiationFee +
    +fixedFee +
    +pakaFee -
    +couponDiscount +
    +auctionClosingTime

  const aditionalImagesFee =
    selectedCatProps?.extraProductImageFee *
    (productFullData.listImageFile.length - selectedCatProps?.freeProductImagesCount - packageDetails?.countImage)

  const aditionalVideoFee =
    selectedCatProps?.extraProductVidoeFee *
    (productFullData.videoUrl.length - selectedCatProps?.freeProductVidoesCount - packageDetails?.countVideo)

  const taxValue = (totalCost * (15 / 100)).toFixed(2)

  const totalWithTax = +totalCost + +taxValue

  const getShippingOptions = useCallback(async () => {
    const data = await axios.get(`/GetAllShippingOptions`)
    const shippingNames = (data?.data?.data).filter((item) => productFullData.ShippingOptions.includes(item.id))
    setShippingOptions(shippingNames)
  }, [productFullData.ShippingOptions])

  const getPackage = useCallback(async () => {
    if (productFullData.pakatId || productFullData["ProductPaymentDetailsDto.PakatId"]) {
      const data = await axios.get(
        `/GetPakaById?Pakatid=${productFullData.pakatId || productFullData["ProductPaymentDetailsDto.PakatId"]}
      `,
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

  const handleSubmit = async (e) => {
    e.preventDefault()

    setLoading(true)

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
    if (pathname.includes("add")) {
      formData.append("ExecutePaymentDto.PaymentCard.PaymentMethodId", paymentOption)
      formData.append("ExecutePaymentDto.PaymentCard.TotalAmount", totalWithTax)
      if (paymentOption === 1 || paymentOption === 2) {
        formData.append("ExecutePaymentDto.PaymentCard.Number", selectedCard?.accountNumber)
        formData.append("ExecutePaymentDto.PaymentCard.ExpiryMonth", selectedCard?.expiaryDate.split("/")[0])
        formData.append("ExecutePaymentDto.PaymentCard.ExpiryYear", selectedCard?.expiaryDate.split("/")[1])
        formData.append("ExecutePaymentDto.PaymentCard.SecurityCode", selectedCard?.cvv)
        formData.append("ExecutePaymentDto.PaymentCard.HolderName", selectedCard?.bankHolderName)
      }
      try {
        await axios.post("/AddProduct", formData, multiFormData)
        toast.success(locale === "en" ? "Products has been created successfully!" : "تم اضافة المنتج بنجاح")
        push(`/${locale}/products`)
      } catch (error) {
        setLoading(false)
        toast.error(
          locale === "en"
            ? "Error Please recheck the data you entered!"
            : "حدث خطأ برجاء مراجعة البيانات و اعادة المحاولة",
        )
      }
    } else {
      try {
        await axios.post("/EditProduct", formData, multiFormData)
        toast.success(locale === "en" ? "Products has been created successfully!" : "تم اضافة المنتج بنجاح")
        push(`/${locale}/products`)
      } catch (error) {
        setLoading(false)
        toast.error(
          locale === "en"
            ? "Error Please recheck the data you entered!"
            : "حدث خطأ برجاء مراجعة البيانات و اعادة المحاولة",
        )
      }
    }
  }
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

  const handleAcceptPoints = (pointsBalance) => {
    setPaymentOption(3)
    setPointsBalance(pointsBalance)
  }

  const handleAcceptVisa = (selectedCard) => {
    setSelectedCard(selectedCard)
    setPaymentOption(1)
  }

  const handleAcceptMada = (selectedCard) => {
    setSelectedCard(selectedCard)
    setPaymentOption(2)
  }

  return (
    <div className="body-content">
      <Row>
        <Col lg={9}>
          <div className="contint_paner">
            <div className="d-flex align-items-center justify-content-between mb-4 gap-2 flex-wrap">
              <h6 className="f-b fs-4 m-0">{pathOr("", [locale, "Products", "productDetails"], t)}</h6>
              <button>
                <p className="f-b fs-5 main-color" onClick={() => handleBack()}>
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
                    <div className="f-b">{locale == "en" ? productFullData?.nameEn : productFullData?.nameAr}</div>
                    <div className="gray-color">
                      {locale == "en" ? productFullData?.subTitleEn : productFullData?.subTitleAr}
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
              {productFullData && (locale == "en" ? productFullData?.descriptionEn : productFullData?.descriptionAr)}
            </p>
          </div>
          <div className="contint_paner">
            <div className="d-flex align-items-center justify-content-between mb-4 gap-2 flex-wrap">
              <h6 className="f-b fs-4 m-0">{pathOr("", [locale, "Products", "sellingDetails"], t)}</h6>
              <button>
                <p className="f-b fs-5 main-color" onClick={() => handleBack()}>
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
                <p className="f-b fs-5 main-color" onClick={() => handleBack()}>
                  {pathOr("", [locale, "Products", "editFolder"], t)}
                </p>
              </button>
            </div>
            {productFullData.IsAuctionEnabled && (
              <Row>
                <h6 className="f-b m-0">{pathOr("", [locale, "Products", "offer_duration"], t)}</h6>
                <div className={styles["info_boxo_"]}>
                  <span>{productFullData && moment(productFullData.AuctionClosingTime).format("LLL")}</span>
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
                  <p className="f-b fs-5 main-color" onClick={() => handleBack()}>
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
            {!pathname.includes("edit") && (
              <div className={styles["Payment-details"]}>
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
                <h6 component="h1">{pathOr("", [locale, "Products", "PaymentDetails"], t)}</h6>
                <ul className={styles["list_salary"]}>
                  {selectedCatProps?.productPublishPrice > 0 && (
                    <li>
                      <span>{pathOr("", [locale, "Products", "publishing_price"], t)}</span>{" "}
                      <span>
                        {selectedCatProps?.productPublishPrice} {pathOr("", [locale, "Products", "currency"], t)}
                      </span>
                    </li>
                  )}
                  {couponData && (
                    <li>
                      <span>{pathOr("", [locale, "Products", "couponCode"], t)}</span> <span>{couponCode}</span>
                    </li>
                  )}
                  {subtitleFee > 0 && (
                    <li>
                      <span>{pathOr("", [locale, "Products", "subtitle_fee"], t)}</span>{" "}
                      <span>
                        {selectedCatProps?.subTitleFee} {pathOr("", [locale, "Products", "currency"], t)}
                      </span>
                    </li>
                  )}
                  {!!(
                    productFullData.listImageFile.length >
                    selectedCatProps?.freeProductImagesCount + packageDetails?.countImage
                  ) &&
                    !!(aditionalImagesFee > 0) && (
                      <li>
                        <span>{pathOr("", [locale, "Products", "additional_product_images_fee"], t)}</span>{" "}
                        <span>
                          {aditionalImagesFee} {pathOr("", [locale, "Products", "currency"], t)}
                        </span>
                      </li>
                    )}
                  {!!(
                    productFullData.videoUrl?.length >
                    selectedCatProps?.freeProductVidoesCount + packageDetails?.countVideo
                  ) &&
                    !!(aditionalVideoFee > 0) && (
                      <li>
                        <span>{pathOr("", [locale, "Products", "additional_product_videos_fee"], t)}</span>{" "}
                        <span>
                          {aditionalVideoFee} {pathOr("", [locale, "Products", "currency"], t)}
                        </span>
                      </li>
                    )}
                  {auctionFee > 0 && (
                    <li>
                      <span>{pathOr("", [locale, "Products", "auction_fee"], t)}</span>{" "}
                      <span>
                        {selectedCatProps?.enableAuctionFee} {pathOr("", [locale, "Products", "currency"], t)}
                      </span>
                    </li>
                  )}
                  {negotiationFee > 0 && (
                    <li>
                      <span>{pathOr("", [locale, "Products", "negotiation_fee"], t)}</span>{" "}
                      <span>
                        {selectedCatProps?.enableNegotiationFee} {pathOr("", [locale, "Products", "currency"], t)}
                      </span>
                    </li>
                  )}
                  {fixedFee > 0 && (
                    <li>
                      <span>{pathOr("", [locale, "Products", "fixed_price_selling_fee"], t)}</span>{" "}
                      <span>
                        {selectedCatProps?.enableFixedPriceSaleFee} {pathOr("", [locale, "Products", "currency"], t)}
                      </span>
                    </li>
                  )}
                  {auctionClosingTime > 0 && (
                    <li>
                      <span>{pathOr("", [locale, "Products", "AuctionClosingTimeFee"], t)}</span>{" "}
                      <span>
                        {auctionClosingTime} {pathOr("", [locale, "Products", "currency"], t)}
                      </span>
                    </li>
                  )}
                  {!!(productFullData?.pakatId && productFullData?.isNewPackage) && (
                    <li>
                      <span>{pathOr("", [locale, "Products", "package_price"], t)}</span>{" "}
                      <span>
                        {packageDetails?.price} {pathOr("", [locale, "Products", "currency"], t)}
                      </span>
                    </li>
                  )}
                  {couponData && (
                    <li>
                      <span>{pathOr("", [locale, "Products", "coupon_discount"], t)}</span>{" "}
                      <span>
                        {"-"}
                        {couponData.discountValue} {pathOr("", [locale, "Products", "currency"], t)}
                      </span>
                    </li>
                  )}
                  {taxValue > 0 && (
                    <li>
                      <span>{pathOr("", [locale, "Products", "tax"], t)}</span>{" "}
                      <span>
                        {totalCost < 0 ? 0 : taxValue} {pathOr("", [locale, "Products", "currency"], t)}
                      </span>
                    </li>
                  )}
                  <li>
                    <span>{pathOr("", [locale, "Orders", "total"], t)}</span>{" "}
                    <span>
                      {couponData && (
                        <span style={{ textDecoration: couponData ? "line-through" : undefined }}>
                          {totalWithTax + couponDiscount} {pathOr("", [locale, "Products", "currency"], t)}
                        </span>
                      )}{" "}
                      {totalWithTax && <span>{totalWithTax <= 0 ? 0 : totalWithTax}</span>}{" "}
                      {pathOr("", [locale, "Products", "currency"], t)}
                    </span>
                  </li>
                </ul>
                <hr />
                <div className="f-b mb-2">{pathOr("", [locale, "Products", "paymentOptions"], t)}</div>
                <div className="row">
                  <div className="col-lg-12">
                    <div className="form-group">
                      <div
                        className="form-control outer-check-input  d-flex justify-content-between"
                        style={{ borderColor: paymentOption === 1 ? "var(--main)" : null }}
                      >
                        <div className="form-check form-switch p-0 m-0 d-flex w-auto">
                          <input
                            className="form-check-input m-0"
                            type="checkbox"
                            role="switch"
                            id="visa"
                            checked={paymentOption === 1}
                            onChange={() => setIsVisaModalOpen(true)}
                          />
                          <span className="bord" />
                        </div>
                        <label htmlFor="visa">{pathOr("", [locale, "Products", "Visa_MasterCard"], t)}</label>
                      </div>
                    </div>
                    {!!(paymentOption === 1 && selectedCard) && (
                      <div className="form-group">
                        <div
                          style={{
                            borderColor: paymentOption === 1 ? "var(--main)" : null,
                            height: "100%",
                            border: "1px solid var(--main)",

                            borderRadius: "19px",
                          }}
                          className="d-flex flex-column gap-2"
                        >
                          <div
                            style={{ backgroundColor: "#F8F8F8", margin: "10px", padding: "10px", borderRadius: 13 }}
                          >
                            <div>
                              <p style={{ fontSize: 14 }}>{pathOr("", [locale, "Products", "NameOnCard"], t)}</p>
                              <p style={{ fontSize: 12, color: "#8B959E" }}>{selectedCard?.bankHolderName}</p>
                            </div>
                            <div>
                              <p style={{ fontSize: 14 }}>{pathOr("", [locale, "Products", "CardNumber"], t)}</p>
                              <p style={{ fontSize: 12, color: "#8B959E" }}>
                                {selectedCard.accountNumber?.slice(0, 10)}XXXXXX{" "}
                              </p>
                            </div>
                            <div>
                              <p style={{ fontSize: 14 }}>{pathOr("", [locale, "Products", "expiryDate"], t)}</p>
                              <p style={{ fontSize: 12, color: "#8B959E" }}>{selectedCard?.expiaryDate}</p>
                            </div>
                          </div>
                          <Button
                            variant="light"
                            className="rounded-pill mb-3"
                            style={{ border: "1px solid #eee", marginInline: "auto", width: "90%" }}
                            onClick={() => setIsVisaModalOpen(true)}
                          >
                            {pathOr("", [locale, "Products", "ChooseAnotherCard"], t)}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="col-lg-12">
                    <div className="form-group">
                      <div
                        className="form-control outer-check-input d-flex justify-content-between"
                        style={{ borderColor: paymentOption === 2 ? "var(--main)" : null }}
                      >
                        <div className="form-check form-switch p-0 m-0 w-auto">
                          <input
                            className="form-check-input m-0"
                            type="checkbox"
                            role="switch"
                            id="mada"
                            checked={paymentOption === 2}
                            onChange={() => setIsMadaModalOpen(true)}
                          />
                          <span className="bord" />
                        </div>
                        <label htmlFor="mada">{pathOr("", [locale, "Products", "Mada"], t)}</label>
                      </div>
                    </div>
                  </div>

                  {!!(paymentOption === 2 && selectedCard) && (
                    <div className="form-group">
                      <div
                        style={{
                          borderColor: paymentOption === 2 ? "var(--main)" : null,
                          height: "100%",
                          border: "1px solid var(--main)",

                          borderRadius: "19px",
                        }}
                        className="d-flex flex-column gap-2"
                      >
                        <div style={{ backgroundColor: "#F8F8F8", margin: "10px", padding: "10px", borderRadius: 13 }}>
                          <div>
                            <p style={{ fontSize: 14 }}>{pathOr("", [locale, "Products", "NameOnCard"], t)}</p>
                            <p style={{ fontSize: 12, color: "#8B959E" }}>{selectedCard?.bankHolderName}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: 14 }}>{pathOr("", [locale, "Products", "CardNumber"], t)}</p>
                            <p style={{ fontSize: 12, color: "#8B959E" }}>
                              {selectedCard.accountNumber?.slice(0, 10)}XXXXXX{" "}
                            </p>
                          </div>
                          <div>
                            <p style={{ fontSize: 14 }}>{pathOr("", [locale, "Products", "expiryDate"], t)}</p>
                            <p style={{ fontSize: 12, color: "#8B959E" }}>{selectedCard?.expiaryDate}</p>
                          </div>
                        </div>
                        <Button
                          variant="light"
                          className="rounded-pill mb-3"
                          style={{ border: "1px solid #eee", marginInline: "auto", width: "90%" }}
                          onClick={() => setIsMadaModalOpen(true)}
                        >
                          {pathOr("", [locale, "Products", "ChooseAnotherCard"], t)}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="col-lg-12">
                    <div className="form-group">
                      <div
                        className="form-control outer-check-input d-flex justify-content-between"
                        style={{
                          borderColor: paymentOption === 3 ? "var(--main)" : null,
                          backgroundColor: "#ccc !important",
                        }}
                      >
                        <div className="form-check form-switch p-0 m-0 w-auto">
                          <input
                            className="form-check-input m-0"
                            type="checkbox"
                            role="switch"
                            id="wallet"
                            checked={paymentOption === 3}
                            onChange={() => setIsPointsModalOpen(true)}
                          />
                          <span className="bord" />
                        </div>
                        <label htmlFor="wallet">{pathOr("", [locale, "Products", "MyPoints"], t)}</label>
                      </div>
                    </div>
                  </div>

                  {!!(paymentOption === 3) && (
                    <div className="form-group">
                      <div
                        style={{
                          borderColor: paymentOption === 1 ? "var(--main)" : null,
                          height: "100%",
                          border: "1px solid var(--main)",
                          borderRadius: "19px",
                        }}
                        className="d-flex flex-column gap-2"
                      >
                        <div
                          className="d-flex justify-content-center align-items-center gap-2"
                          style={{ padding: "20px" }}
                        >
                          <p style={{ fontSize: "16px" }}>
                            {pathOr("", [locale, "Products", "PointsBalance"], t)} {pointsBalance}{" "}
                            {pathOr("", [locale, "Products", "currency"], t)}
                          </p>
                          <Image src={wallet} alt="wallet" width={55} height={55} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <button
              className={`${styles["btn-main"]} btn-main mt-2 w-100`}
              data-bs-toggle="modal"
              data-bs-target="#add-product_"
              disabled={loading || !paymentOption}
              onClick={(e) => handleSubmit(e)}
            >
              {pathname.includes("add") && pathOr("", [locale, "Products", "addNewProduct"], t)}
              {pathname.includes("edit") && pathOr("", [locale, "Products", "save"], t)}
              {pathname.includes("repost") && pathOr("", [locale, "Products", "repost_product"], t)}
            </button>
          </div>
        </Col>
        {isPointsModalOpen && (
          <PointsModal
            isPointsModalOpen={isPointsModalOpen}
            setIsPointsModalOpen={setIsPointsModalOpen}
            totalCost={totalWithTax}
            handleAccept={handleAcceptPoints}
          />
        )}
        {isVisaModalOpen && (
          <VisaModal
            isVisaModalOpen={isVisaModalOpen}
            setIsVisaModalOpen={setIsVisaModalOpen}
            handleAccept={handleAcceptVisa}
          />
        )}
        {isMadaModalOpen && (
          <MadaModal
            isVisaModalOpen={isMadaModalOpen}
            setIsVisaModalOpen={setIsMadaModalOpen}
            handleAccept={handleAcceptMada}
          />
        )}
      </Row>
    </div>
  )
}

export default ProductDetails
