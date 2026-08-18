import React from "react"
import { Col } from "react-bootstrap"
import chart from "../../../../public/images/screencapture-chartjs.png"
import Image from "next/image"

import { useRouter } from "next/router"
import t from "../../../translations.json"
import { pathOr } from "ramda"

const StatsOfPurchasesBars = () => {
  const { locale } = useRouter()

  return (
    <Col lg={9}>
      <div className="contint_paner">
        <h5 className="f-b mb-2">{pathOr("", [locale, "Reports", "statsOfPurchase"], t)}</h5>
        <Image src={chart} style={{ width: "100%", height: "220px" }} alt="Purchase statistics bar chart" />
      </div>
    </Col>
  )
}

export default StatsOfPurchasesBars
