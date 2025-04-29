import { FaCheckCircle } from "react-icons/fa"
import styles from "./package.module.css"
import common from "../../../../public/images/common.png"
import commonEn from "../../../../public/images/commonEn.png"
import Image from "next/image"
import packStar from "../../../assets/images/pack_star.png"
import { useRouter } from "next/router"
import { pathOr } from "ramda"
import t from "../../../translations.json"
import { getProductPositionName } from "../../../common/functions"

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

const PackageCard = ({ pack, isCurrent, handleSubscribePackage }) => {
  const { locale } = useRouter()
  return (
    <div
      className={`${styles["box-Bouquet"]} ${pack?.common ? styles["box-Bouquet-gold"] : ""} ${
        isCurrent ? styles["activePack"] : ""
      }`}
    >
      {pack?.common && (
        <div style={{ position: "absolute", top: -16, left: -17, zIndex: 10 }}>
          <Image src={locale === "en" ? commonEn : common} alt="border" width={140} height={140} />
        </div>
      )}
      <div className={styles["head"]}>
        <div style={{ flexBasis: "100%", textAlign: "center" }}>
          {pack?.image && <Image src={pack?.image} alt="package" width={70} height={70} />}
        </div>
        <p>{pack?.name}</p>
        <p>{locale === "en" ? pack?.nameEn : pack?.nameAr}</p>
        <p>
          {pack.price} {pathOr("", [locale, "Products", "currency"], t)}
        </p>
      </div>

      <ul className={styles["info"]}>
        <PackageOption
          option={pathOr("", [locale, "Products", "PackageDuration"], t)}
          value={!!pack.numMonth ? pack.numMonth + pathOr("", [locale, "Products", "Month"], t) : false}
        />
        <PackageOption option={pathOr("", [locale, "Products", "NumOfAds"], t)} value={pack.countProducts} />
        <PackageOption option={pathOr("", [locale, "Products", "NumOfAdditionalImages"], t)} value={pack.countImage} />

        <PackageOption option={pathOr("", [locale, "Products", "NumOfAdditionalVideos"], t)} value={pack.countVideo} />

        {!pack?.smSsCount && (
          <PackageOption
            option={pathOr("", [locale, "Products", "AdDisplayPriority"], t)}
            value={getProductPositionName(pack.productPosition, locale)}
          />
        )}

        {!pack?.smSsCount && (
          <PackageOption
            option={pathOr("", [locale, "Products", "LargerAdSize"], t)}
            value={pack.productPosition === "StarRuf" ? pathOr("", [locale, "Products", "Yes"], t) : false}
          />
        )}

        {!!pack?.smSsCount && (
          <PackageOption option={pathOr("", [locale, "Packages", "NumberOfSMS"], t)} value={pack.smSsCount} />
        )}

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
      <input type="radio" name={"Bouquet" + pack.id} checked={isCurrent} value={isCurrent} readOnly />
      <span className={styles["check"]}>
        <FaCheckCircle />
      </span>

      {!isCurrent && (
        <button
          className={`btn-main`}
          style={{
            width: "100%",
            backgroundColor: pack.isBusinessAccountSubscriped ? "#ccc" : undefined,
            zIndex: 2,
            height: "fit-content",
          }}
          disabled={pack.isBusinessAccountSubscriped}
          onClick={() => {
            handleSubscribePackage(pack.id)
          }}
        >
          {pack.isBusinessAccountSubscriped
            ? pathOr("", [locale, "Packages", "subsribed"], t)
            : pathOr("", [locale, "Packages", "subscribe"], t)}
        </button>
      )}
    </div>
  )
}

export default PackageCard
