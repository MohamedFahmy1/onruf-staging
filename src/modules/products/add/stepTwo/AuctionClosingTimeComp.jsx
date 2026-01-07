import { useRef, useState, useMemo } from "react"
import styles from "./stepTwo.module.css"
import { useRouter } from "next/router"
import { pathOr } from "ramda"
import t from "../../../../translations.json"
import moment from "moment"
import { textAlignStyle } from "../../../../styles/stylesObjects"

const AuctionClosingTimeComp = ({ productPayload, setProductPayload, selectedCatProps }) => {
  const { locale } = useRouter()
  const [activeElementIndex, setActiveElementIndex] = useState(null)
  const dateTimeInput = useRef(null)

  const nowMoment = useMemo(() => moment(), [])
  const nowFormatted = useMemo(() => nowMoment.add(4, "hours").format("YYYY-MM-DD[T]HH:mm"), [nowMoment])

  const safeDefaultValue = useMemo(() => {
    if (!productPayload.AuctionClosingTime) return nowFormatted

    const payloadTime = moment(productPayload.AuctionClosingTime)
    return payloadTime.isBefore(nowMoment) ? nowFormatted : payloadTime.format("YYYY-MM-DD[T]HH:mm")
  }, [productPayload.AuctionClosingTime, nowFormatted, nowMoment])

  function renderFixedLengthDays(item) {
    switch (item) {
      case 1:
        return pathOr("", [locale, "Products", "one_day"], t)
      case 2:
        return pathOr("", [locale, "Products", "two_days"], t)
      default:
        return `${item} ${pathOr("", [locale, "Products", "days"], t)}`
    }
  }

  function renderFixedLengthWeeks(item) {
    switch (item) {
      case 1:
        return pathOr("", [locale, "Products", "one_week"], t)
      case 2:
        return pathOr("", [locale, "Products", "two_weeks"], t)
      default:
        return `${item} ${pathOr("", [locale, "Products", "weeks"], t)}`
    }
  }

  function renderFixedLengthMonths(item) {
    switch (item) {
      case 1:
        return pathOr("", [locale, "Products", "one_month"], t)
      case 2:
        return pathOr("", [locale, "Products", "two_months"], t)
      default:
        return `${item} ${pathOr("", [locale, "Products", "months"], t)}`
    }
  }

  const calculateFutureDate = (item, unit) => {
    const unitMapping = { 1: "days", 2: "weeks", 3: "months" }
    return moment().add(+item, unitMapping[unit]).format("YYYY-MM-DD[T]HH:mm")
  }

  const handleSelection = (item, auctionClosingTime) => {
    setProductPayload({
      ...productPayload,
      AuctionClosingTime: auctionClosingTime,
      IsAuctionClosingTimeFixed: true,
    })
    setActiveElementIndex(+item)
    if (dateTimeInput.current) dateTimeInput.current.value = ""
  }

  const handleChangeAuctionClosingTime = (e) => {
    const selected = moment(e.target.value)

    if (selected.isBefore(moment().add(4, "hours"))) {
      e.target.value = nowFormatted
      setProductPayload({
        ...productPayload,
        AuctionClosingTime: nowFormatted,
        IsAuctionClosingTimeFixed: false,
      })
      return
    }

    setProductPayload({
      ...productPayload,
      AuctionClosingTime: e.target.value,
      IsAuctionClosingTimeFixed: false,
    })
    setActiveElementIndex(null)
  }

  return (
    <div className="col-md-12 col-lg-6 d-flex flex-wrap flex-lg-nowrap w-100 gap-5 mb-4">
      <div
        className={`form-group contint_paner w-100 ${styles.p_select} ${
          productPayload.IsAuctionClosingTimeFixed ? styles.p_select_active : ""
        }`}
      >
        <div className="d-flex justify-content-between p-2">
          <label className="fs-5" style={{ textAlign: locale === "en" ? "left" : "right", display: "block" }}>
            {pathOr("", [locale, "Products", "fixed_length"], t)}
          </label>
          <input
            type="radio"
            name="AuctionDuration"
            onChange={() => {
              setActiveElementIndex(null)
              setProductPayload({
                ...productPayload,
                AuctionClosingTime: "",
                IsAuctionClosingTimeFixed: true,
              })
              if (dateTimeInput.current) dateTimeInput.current.value = ""
            }}
            checked={productPayload.IsAuctionClosingTimeFixed}
          />
        </div>

        <div className="d-flex gap-3 flex-wrap">
          {selectedCatProps.auctionClosingPeriods.split(",").map((item, index) => {
            const auctionClosingTime = calculateFutureDate(item, selectedCatProps.auctionClosingPeriodsUnit)
            return (
              <div
                key={index}
                onClick={() => handleSelection(item, auctionClosingTime)}
                className={`${styles.p_select} ${item == activeElementIndex ? styles.p_select_active : ""}`}
              >
                {selectedCatProps.auctionClosingPeriodsUnit === 1 && renderFixedLengthDays(+item)}
                {selectedCatProps.auctionClosingPeriodsUnit === 2 && renderFixedLengthWeeks(+item)}
                {selectedCatProps.auctionClosingPeriodsUnit === 3 && renderFixedLengthMonths(+item)}
              </div>
            )
          })}
        </div>
      </div>

      <div
        className={`form-group contint_paner w-100 ${styles.p_select} ${
          productPayload.IsAuctionClosingTimeFixed === false ? styles.p_select_active : ""
        }`}
      >
        <div className="d-flex justify-content-between p-2">
          <label className="fs-5" style={{ textAlign: locale === "en" ? "left" : "right", display: "block" }}>
            {pathOr("", [locale, "Products", "set_your_own_datetime"], t)}
          </label>
          <input
            type="radio"
            name="AuctionDuration"
            onChange={() => {
              setProductPayload({
                ...productPayload,
                AuctionClosingTime: nowFormatted,
                IsAuctionClosingTimeFixed: false,
              })
              setActiveElementIndex(null)
              if (dateTimeInput.current) {
                dateTimeInput.current.value = nowFormatted
              }
            }}
            checked={productPayload.IsAuctionClosingTimeFixed === false}
          />
        </div>

        {!!selectedCatProps?.auctionClosingTimeFee && (
          <p
            className="mb-2"
            style={{ ...textAlignStyle(locale), display: "block", color: "blue", fontWeight: "normal", fontSize: 14 }}
          >
            {`${pathOr("", [locale, "Products", "AuctionTimeDesc"], t)} ${
              selectedCatProps.auctionClosingTimeFee
            } ${pathOr("", [locale, "Products", "currency"], t)}`}
          </p>
        )}

        <input
          type="datetime-local"
          ref={dateTimeInput}
          min={nowFormatted}
          defaultValue={safeDefaultValue}
          onChange={handleChangeAuctionClosingTime}
          className="rounded"
        />
      </div>
    </div>
  )
}

export default AuctionClosingTimeComp
