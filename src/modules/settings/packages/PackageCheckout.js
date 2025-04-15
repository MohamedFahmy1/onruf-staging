import { is, pathOr } from "ramda"
import React, { useEffect, useState } from "react"
import { Col, Row } from "react-bootstrap"
import { toast } from "react-toastify"
import { useFetch } from "../../../hooks/useFetch"
import { useRouter } from "next/router"
import t from "../../../translations.json"
import styles from "./package.module.css"
import axios from "axios"
import PackageCard from "./PackageCard"
import Alerto from "../../../common/Alerto"
import { useSelector } from "react-redux"
import moment from "moment"

const PackageCheckout = () => {
  const providerId = useSelector((state) => state.authSlice.providerId)
  const { query, push, locale } = useRouter()
  const id = query.id
  const isSub = query?.isSub === "true"
  const [paymentOption, setPaymentOption] = useState()
  const [couponData, setCouponData] = useState()
  const [couponCode, setCouponCode] = useState("")
  const [packageDetails, setPackageDetails] = useState()

  // const { data: packageDetails } = useFetch(`/GetPakaById?Pakatid=${id}`, true)

  // const { data: CurrentPakat, fetchData: fetchCurrentPakat } = useFetch(
  //   `/GetClientSubcripePakats?clientId=${providerId}`,
  // )

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
  }, [id])

  const totalCost = +packageDetails?.price - !!(couponData?.discountValue || 0)

  const handleSubscribePackage = async (pakaID) => {
    try {
      await axios.post("/AddPakatSubcription", [pakaID])
      toast.success(locale === "en" ? "You Subscribed To Package!" : "!تم الاشتراك  بالباقة بنجاح")
      push("/settings/packages")
    } catch (error) {
      Alerto(error)
    }
  }

  const handlePackageRenew = async (pakaID, id) => {
    try {
      await axios.post(`/RenewPaka?pakatId=${pakaID}&PakatSubsriptionId=${id}`)
      toast.success(locale === "en" ? "You Renewed Package!" : "!تم تجديد الباقة بنجاح")
      push("/settings/packages")
    } catch (error) {
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
        <Col lg={9}>
          <div style={{ maxWidth: "420px", marginInline: "auto" }}>
            {packageDetails && (
              <PackageCard pack={packageDetails} isCurrent={isSub} handleSubscribePackage={() => {}} />
            )}
          </div>
          <div className="contint_paner" style={{ border: "1px solid #ddd" }}>
            <h4 className="main-color">{pathOr("", [locale, "Packages", "PackageDetails"], t)}</h4>
            <div className="d-flex justify-content-between">
              <div className="d-flex gap-1">
                <p>{pathOr("", [locale, "Packages", "Category"], t)}:</p>
                <p>{packageDetails?.listCategories?.[0]?.name}</p>
              </div>
              <div className="d-flex gap-1">
                <p>{pathOr("", [locale, "Packages", "PackageType"], t)}:</p>
                <p>{packageDetails?.smSsCount > 0 ? "SMS" : "Publish"}</p>
              </div>
              <div className="d-flex gap-1">
                <p>{pathOr("", [locale, "Packages", "EndDate"], t)}:</p>
                <p>{packageDetails?.endDate ? moment(packageDetails?.endDate).format("DD-MM-YYYY") : "-"}</p>
              </div>
            </div>
          </div>
        </Col>
        <Col lg={3}>
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

                <li className="d-flex justify-content-between px-3">
                  <span>{pathOr("", [locale, "Orders", "total"], t)}</span>{" "}
                  <span>
                    <span>{totalCost <= 0 ? 0 : totalCost}</span> {pathOr("", [locale, "Products", "currency"], t)}
                  </span>
                </li>
              </ul>
              <hr />
              <div className="f-b mb-2">{pathOr("", [locale, "Products", "paymentOptions"], t)}</div>
              <div className="row">
                <div className="col-lg-12">
                  <div className="form-group">
                    <div className="form-control outer-check-input  d-flex justify-content-between">
                      <div className="form-check form-switch p-0 m-0 d-flex w-auto">
                        <input
                          className="form-check-input m-0"
                          type="checkbox"
                          role="switch"
                          id="IsFixedPriceEnabled"
                          checked={paymentOption === 1}
                          onChange={() => setPaymentOption(1)}
                        />
                        <span className="bord" />
                      </div>
                      <label htmlFor="IsFixedPriceEnabled">
                        {pathOr("", [locale, "Products", "Visa_MasterCard"], t)}
                      </label>
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
                          id="IsAuctionEnabled"
                          checked={paymentOption === 2}
                          onChange={() => setPaymentOption(2)}
                        />
                        <span className="bord" />
                      </div>
                      <label htmlFor="IsFixedPriceEnabled">{pathOr("", [locale, "Products", "Mada"], t)}</label>
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
                          id="IsNegotiationEnabled"
                          checked={paymentOption === 3}
                          onChange={() => setPaymentOption(3)}
                        />
                        <span className="bord" />
                      </div>
                      <label htmlFor="IsFixedPriceEnabled">{pathOr("", [locale, "Products", "MyWallet"], t)}</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button
              className={`${styles["btn-main"]} btn-main mt-2 w-100`}
              onClick={
                isSub
                  ? () => handlePackageRenew(packageDetails?.pakaId, packageDetails?.id)
                  : () => handleSubscribePackage(packageDetails?.id)
              }
            >
              {isSub
                ? pathOr("", [locale, "Packages", "renewPaka"], t)
                : pathOr("", [locale, "Packages", "Subscribe"], t)}
            </button>
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
    </div>
  )
}

export default PackageCheckout
