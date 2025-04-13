import { pathOr } from "ramda"
import { Accordion, Col, Row } from "react-bootstrap"
import styles from "./stepTwo.module.css"
import { useRouter } from "next/router"
import bigger from "../../../../../public/images/screencaptur.png"
import t from "../../../../translations.json"
import { FaCheckCircle, FaRegStar } from "react-icons/fa"
import packStar from "../../../../assets/images/pack_star.png"
import Image from "next/image"
import moment from "moment"
import { useState } from "react"
import { useFetch } from "../../../../hooks/useFetch"
import { useSelector } from "react-redux"
import common from "../../../../../public/images/common.png"
import axios from "axios"
import Alerto from "../../../../common/Alerto"

const PublishingPackages = ({
  productPayload,
  setProductPayload,
  setEditModeOn,
  validateAll,
  handleGoToReviewPage,
  regions,
  catId,
}) => {
  const { locale, pathname } = useRouter()
  const providerId = useSelector((state) => state.authSlice.providerId)

  const { data: myPackat } = useFetch(`/GetClientSubcripePakats?clientId=${providerId}`)
  const [selectedPack, setselectedPack] = useState()
  const [isLoading, setIsLoading] = useState(false)
  const [packat, setPackat] = useState([])

  const myPackatIds = myPackat?.map((item) => item.pakaId)

  const fetchAllPackages = async () => {
    try {
      setIsLoading(true)
      const response = await axios.get(
        `/GetAllPakatsList?lang=${locale}&categoryId=${catId}&isAdmin=${true}&PakatType=Publish`,
      )
      if (response?.data?.data?.length > 0) {
        setPackat(response?.data?.data?.filter((item) => !myPackatIds?.includes(item.id)))
      } else {
        setPackat(null)
      }
      setIsLoading(false)
    } catch (error) {
      setIsLoading(false)
      Alerto(error)
    }
  }

  const handleChoosePackat = (pack, isNew) => {
    if (productPayload.pakatId === pack?.pakaId || productPayload.pakatId === pack?.id) {
      setProductPayload({
        ...productPayload,
        pakatId: null,
        "ProductPaymentDetailsDto.PakatId": 0,
        isNewPackage: isNew,
      })
      setselectedPack(null)
    } else {
      setProductPayload({
        ...productPayload,
        pakatId: pack?.pakaId || pack?.id,
        "ProductPaymentDetailsDto.PakatId": pack?.pakaId || pack?.id,
        isNewPackage: isNew,
      })
      setselectedPack(pack)
    }
  }

  const calculateTimeLeft = (closingTime) => {
    const duration = moment.duration(moment(closingTime).diff(moment()))
    return {
      days: Math.floor(duration.asDays()),
      hours: duration.hours(),
      minutes: duration.minutes(),
    }
  }

  const renderTimeLeft = (closingTime) => {
    if (new Date(closingTime) - new Date() > 0) {
      const { days, hours, minutes } = calculateTimeLeft(closingTime)
      return (
        <div className={styles["time"]}>
          <div>
            <span>{days}</span> {locale === "ar" ? "يوم" : "Day"}
          </div>
          <div>
            <span>{hours}</span> {locale === "ar" ? "ساعة" : "Hour"}
          </div>
          <div>
            <span>{minutes}</span> {locale === "ar" ? "دقيقة" : "Min"}
          </div>
        </div>
      )
    }
  }

  const ProductBox = ({ isLargerImage }) => {
    const imageUrl =
      productPayload.listMedia?.find((item) => item.isMainMadia === true)?.url ||
      URL.createObjectURL(productPayload.listImageFile[0])
    const imageSize = isLargerImage ? { width: 300, height: 200 } : { width: 400, height: 200 }
    return (
      <div className={`${styles["box-product"]} ${isLargerImage ? styles["box-product2"] : ""}`}>
        <div className={styles["imge"]}>
          <Image src={imageUrl} alt="product" width={imageSize.width} height={imageSize.height} />
          <div className={styles["two_btn_"]}>
            <button className={styles["btn_"]}>{pathOr("", [locale, "Products", "merchant"], t)}</button>
            <button className={styles["btn_"]}>{pathOr("", [locale, "Products", "freeDelivery"], t)}</button>
          </div>
          {productPayload.AuctionClosingTime && renderTimeLeft(productPayload.AuctionClosingTime)}
          <button className={styles["btn-star"]}>
            <FaRegStar />
          </button>
        </div>
        <div className={styles["info"]}>
          <div className="mb-3">
            <h5 className="f-b mb-1">{productPayload?.nameAr}</h5>
            <div className="font-18 gray-color">
              {regions?.find((item) => +item.id === +productPayload?.regionId)?.name} - {moment().format("L")}
            </div>
          </div>
          <div className="row">
            <div className="col-md-6">
              <div className="font-18">
                <div>{pathOr("", [locale, "Products", "purchasingPrice"], t)}</div>
                <div className="f-b main-color">
                  {productPayload?.Price} {pathOr("", [locale, "Products", "currency"], t)}
                </div>
              </div>
            </div>
            {productPayload?.HighestBidPrice && (
              <div className="col-md-6">
                <div className="font-18">
                  <div>{pathOr("", [locale, "Products", "highestPrice"], t)}</div>
                  <div className="f-b">
                    {productPayload?.HighestBidPrice} {pathOr("", [locale, "Products", "currency"], t)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const PackageOption = ({ option, value }) => {
    if (value) {
      return (
        <li>
          <div className="d-flex justify-content-between">
            <div className="d-flex gap-1 align-items-center">
              <Image src={packStar} alt="star" width={20} height={20} />
              <p>{option}</p>
            </div>
            <p>{value}</p>
          </div>
        </li>
      )
    }
  }

  return (
    <Accordion.Body className={`${styles["accordion-body"]} accordion-body`}>
      <div className="form-content">
        <div>
          <div className="text-center mt-4 mb-5">
            <h4 className="f-b"> {pathOr("", [locale, "Products", "choosepaka"], t)}</h4>
            <h5>{pathOr("", [locale, "Products", "getBenefits"], t)}</h5>
          </div>

          <Row className="justify-content-center">
            <Col lg={9}>
              <div className="row justify-content-center">
                {!!myPackat?.length > 0 ? (
                  myPackat.map((pack) => (
                    <Col md={6} key={pack?.pakaId}>
                      <div
                        className={`${styles["box-Bouquet"]} ${pack.commen ? styles["box-Bouquet-gold"] : ""} ${
                          productPayload?.pakaId == pack.pakaId ? styles["activePack"] : ""
                        }`}
                        onClick={() => handleChoosePackat(pack, false)}
                      >
                        {pack.commen && (
                          <div style={{ position: "absolute", top: -16, left: -17, zIndex: 10 }}>
                            <Image src={common} alt="border" width={140} height={140} />
                          </div>
                        )}
                        <div className={styles["head2"]}>
                          {pack.image && <Image src={pack.image} alt="package" width={70} height={70} />}
                          <p className="fs-4">{pack.name}</p>
                        </div>

                        <ul className={styles["info"]}>
                          <PackageOption
                            option={pathOr("", [locale, "Products", "PackageDuration"], t)}
                            value={
                              !!pack.numMonth ? pack.numMonth + pathOr("", [locale, "Products", "Month"], t) : false
                            }
                          />
                          <PackageOption
                            option={pathOr("", [locale, "Products", "NumOfAds"], t)}
                            value={pack.numMonth}
                          />
                          <PackageOption
                            option={pathOr("", [locale, "Products", "NumOfAdditionalImages"], t)}
                            value={pack.countImage}
                          />

                          <PackageOption
                            option={pathOr("", [locale, "Products", "NumOfAdditionalVideos"], t)}
                            value={pack.countVideo}
                          />

                          <PackageOption
                            option={pathOr("", [locale, "Products", "AdDisplayPriority"], t)}
                            value={pack.productPosition}
                          />

                          <PackageOption
                            option={pathOr("", [locale, "Products", "LargerAdSize"], t)}
                            value={pack.productPosition === "VIP" ? pathOr("", [locale, "Products", "Yes"], t) : false}
                          />

                          <PackageOption
                            option={pathOr("", [locale, "Products", "FeaturedAd"], t)}
                            value={pack.showHighLight ? pathOr("", [locale, "Products", "Yes"], t) : false}
                          />

                          <PackageOption
                            option={pathOr("", [locale, "Products", "ArabicSubtitle"], t)}
                            value={pack.showSupTitle ? pathOr("", [locale, "Products", "Yes"], t) : false}
                          />

                          <PackageOption
                            option={pathOr("", [locale, "Products", "FixedSalePriceOption"], t)}
                            value={pack.enableFixedPrice ? pathOr("", [locale, "Products", "Yes"], t) : false}
                          />

                          <PackageOption
                            option={pathOr("", [locale, "Products", "NegotiablePriceOption"], t)}
                            value={pack.enableNegotiable ? pathOr("", [locale, "Products", "Yes"], t) : false}
                          />

                          <PackageOption
                            option={pathOr("", [locale, "Products", "PublicAuctionOption"], t)}
                            value={pack.enableAuction ? pathOr("", [locale, "Products", "Yes"], t) : false}
                          />

                          <PackageOption
                            option={pathOr("", [locale, "Products", "AuctionClosingTimeOption"], t)}
                            value={pack.auctionClosingTimeOption ? pathOr("", [locale, "Products", "Yes"], t) : false}
                          />

                          <div
                            className="d-flex justify-content-between bg-white rounded-4 p-2 mt-3"
                            style={{ border: "1px solid #EE6C4D" }}
                          >
                            <p>{pathOr("", [locale, "Products", "expiryDate"], t)}</p>
                            {console.log(pack)}
                            <p>{moment(pack.endDate).format("L")}</p>
                          </div>
                        </ul>

                        <input
                          type="radio"
                          name="Bouquet"
                          checked={productPayload.pakatId === +pack?.pakaId}
                          value={+pack?.pakaId}
                          readOnly
                        />
                        <span className={styles["check"]}>
                          <FaCheckCircle />
                        </span>
                        <span className={styles["pord"]} />
                      </div>
                    </Col>
                  ))
                ) : (
                  <div
                    className="text-center bg-white"
                    style={{
                      border: "1px solid #EE6C4D",
                      paddingBlock: "90px",
                      paddingInline: "120px",
                      borderRadius: "14px",
                      maxWidth: "576px",
                    }}
                  >
                    <h3>{pathOr("", [locale, "Products", "NoCurrentPackages"], t)}</h3>
                  </div>
                )}
              </div>
            </Col>
          </Row>

          <button
            className="btn-main mt-3"
            style={{ display: "block", margin: "0 auto", width: "280px", fontSize: 20 }}
            type="button"
            disabled={isLoading}
            onClick={() => fetchAllPackages()}
          >
            {pathOr("", [locale, "Products", "BrowseOtherPackages"], t)}
          </button>

          <Row className="justify-content-center">
            <Col lg={9}>
              <div className="row justify-content-center">
                {!!packat?.length &&
                  packat.map((pack) => (
                    <Col md={6} key={pack?.id}>
                      <div
                        className={`${styles["box-Bouquet"]} ${pack.commen ? styles["box-Bouquet-gold"] : ""} ${
                          productPayload?.pakatId == pack.id ? styles["activePack"] : ""
                        }`}
                        onClick={() => handleChoosePackat(pack, true)}
                      >
                        {pack.commen && (
                          <div style={{ position: "absolute", top: -16, left: -17, zIndex: 10 }}>
                            <Image src={common} alt="border" width={140} height={140} />
                          </div>
                        )}
                        <div className={styles["head"]}>
                          <div style={{ flexBasis: "100%", textAlign: "center" }}>
                            {pack.image && <Image src={pack.image} alt="package" width={70} height={70} />}
                          </div>
                          <p>{pack.name}</p>
                          <p>
                            {pack.price} {pathOr("", [locale, "Products", "currency"], t)}
                          </p>
                        </div>

                        <ul className={styles["info"]}>
                          <PackageOption
                            option={pathOr("", [locale, "Products", "PackageDuration"], t)}
                            value={
                              !!pack.numMonth ? pack.numMonth + pathOr("", [locale, "Products", "Month"], t) : false
                            }
                          />
                          <PackageOption
                            option={pathOr("", [locale, "Products", "NumOfAds"], t)}
                            value={pack.countProducts}
                          />
                          <PackageOption
                            option={pathOr("", [locale, "Products", "NumOfAdditionalImages"], t)}
                            value={pack.countImage}
                          />

                          <PackageOption
                            option={pathOr("", [locale, "Products", "NumOfAdditionalVideos"], t)}
                            value={pack.countVideo}
                          />

                          <PackageOption
                            option={pathOr("", [locale, "Products", "AdDisplayPriority"], t)}
                            value={pack.productPosition}
                          />

                          <PackageOption
                            option={pathOr("", [locale, "Products", "LargerAdSize"], t)}
                            value={pack.productPosition === "VIP" ? pathOr("", [locale, "Products", "Yes"], t) : false}
                          />

                          <PackageOption
                            option={pathOr("", [locale, "Products", "FeaturedAd"], t)}
                            value={pack.showHighLight ? pathOr("", [locale, "Products", "Yes"], t) : false}
                          />

                          <PackageOption
                            option={pathOr("", [locale, "Products", "ArabicSubtitle"], t)}
                            value={pack.showSupTitle ? pathOr("", [locale, "Products", "Yes"], t) : false}
                          />

                          <PackageOption
                            option={pathOr("", [locale, "Products", "FixedSalePriceOption"], t)}
                            value={pack.enableFixedPrice ? pathOr("", [locale, "Products", "Yes"], t) : false}
                          />

                          <PackageOption
                            option={pathOr("", [locale, "Products", "NegotiablePriceOption"], t)}
                            value={pack.enableNegotiable ? pathOr("", [locale, "Products", "Yes"], t) : false}
                          />

                          <PackageOption
                            option={pathOr("", [locale, "Products", "PublicAuctionOption"], t)}
                            value={pack.enableAuction ? pathOr("", [locale, "Products", "Yes"], t) : false}
                          />

                          <PackageOption
                            option={pathOr("", [locale, "Products", "AuctionClosingTimeOption"], t)}
                            value={pack.auctionClosingTimeOption ? pathOr("", [locale, "Products", "Yes"], t) : false}
                          />
                        </ul>
                        <input
                          type="radio"
                          name="Bouquet"
                          checked={+productPayload.pakatId === +pack?.id}
                          value={+pack?.id}
                          readOnly
                        />
                        <span className={styles["check"]}>
                          <FaCheckCircle />
                        </span>
                        <span className={styles["pord"]} />
                      </div>
                    </Col>
                  ))}
                {packat === null && (
                  <div
                    className="text-center bg-white mt-4"
                    style={{
                      border: "1px solid #EE6C4D",
                      paddingBlock: "90px",
                      paddingInline: "120px",
                      borderRadius: "14px",
                      maxWidth: "576px",
                    }}
                  >
                    <h3>{pathOr("", [locale, "Products", "NoPackages"], t)}</h3>
                  </div>
                )}
              </div>
            </Col>
          </Row>

          {selectedPack?.productPosition === "VIP" && (
            <div className="mt-4">
              <h5 className="mb-3 f-b text-center">{pathOr("", [locale, "Products", "findChange"], t)}</h5>
              <Row className="align-items-center">
                <Col md={5} lg={4}>
                  <ProductBox isLargerImage={false} />
                </Col>
                <Col lg={2}>
                  <div className="text-center mt-3">
                    <Image src={bigger} className="img-fluid" alt="bigger" width={130} height={180} />
                  </div>
                </Col>
                <Col md={5}>
                  <ProductBox isLargerImage={true} />
                </Col>
              </Row>
            </div>
          )}
        </div>
      </div>
      <button
        className="btn-main mt-3"
        style={{ display: "block", margin: "0 auto", background: "#45495e", width: "280px" }}
        type="button"
        onClick={() => {
          if (validateAll() === true) {
            handleGoToReviewPage()
            pathname.includes("add") && setEditModeOn(true)
          }
        }}
      >
        {pathOr("", [locale, "Products", "next"], t)}
      </button>
    </Accordion.Body>
  )
}

export default PublishingPackages
