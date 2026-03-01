import { useEffect, useState } from "react"
import aramex from "../../../../public/images/aramex.png"
import Router, { useRouter } from "next/router"
import { Button } from "@mui/material"
import { pathOr } from "ramda"
import t from "../../../translations.json"
import axios from "axios"
import { useSelector } from "react-redux"
import { LoadingScreen } from "../../../common/Loading"
import Image from "next/image"
import Alerto from "../../../common/Alerto"
import Link from "next/link"
import Box from "@mui/material/Box"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import ShippingWithOnruf from "./ShippingWithOnruf"

const Shipping = () => {
  const { locale } = useRouter()
  const [shippingOptions, setShippingOptions] = useState()
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState(0)
  const { buisnessId } = useSelector((state) => state.authSlice)

  const fetchShippingOptions = async () => {
    try {
      setLoading(true)
      const {
        data: { data: shippingOptions },
      } = await axios.get("/GetAllShippingOptions", {
        params: { businessAccountId: buisnessId, lang: "ar" },
      })
      setShippingOptions(shippingOptions)
      setLoading(false)
    } catch (error) {
      setLoading(false)
      Alerto(error)
    }
  }

  useEffect(() => {
    fetchShippingOptions()
  }, [])

  let content

  if (loading) content = <LoadingScreen />

  if (shippingOptions?.length === 0)
    content = (
      <h1 className="text-center" style={{ marginTop: "200px" }}>
        {pathOr("", [locale, "Shipping", "noShipping"], t)}
      </h1>
    )

  if (shippingOptions?.length > 0) {
    content = (
      <div className="row">
        {shippingOptions?.map((option) => (
          <div className="col-lg-3 col-md-6" key={option.id}>
            <a onClick={() => Router.push(`/settings/shipping/${option.id}`)} className="box_company active">
              <Image
                src={option?.shippingOptionImage ? option?.shippingOptionImage : aramex?.src}
                width={200}
                height={200}
                alt="shipping"
              />
              <h6 className="f-b">
                {option.shippingOptionName} <br />
                <span style={{ fontSize: 12, color: "gray" }}>{option.shippingOptionDescription}</span>
              </h6>
              <button className="btn-main">{option.isActive ? "active" : "in-active"}</button>
              <span className="agree">
                <i className="fas fa-check-circle"></i>
              </span>
            </a>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="body-content">
      <div>
        {/*  Tabs header */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)} aria-label="shipping tabs">
            <Tab label={pathOr("", [locale, "Shipping", "shippingWithOnrufTab"], t)} style={{ textTransform: "capitalize" }} />
            <Tab label={pathOr("", [locale, "Shipping", "shippingOptionsTab"], t)} style={{ textTransform: "capitalize" }} />
          </Tabs>
        </Box>

        {tab === 0 && <ShippingWithOnruf />}

        {tab === 1 && (
          <>
            <div className="d-flex align-items-center justify-content-between mb-4 gap-2 flex-wrap">
              <div className="d-flex align-items-center">
                <h6 className="f-b m-0">{pathOr("", [locale, "Shipping", "shippingCompanies"], t)}</h6>
              </div>
              <Link href="/settings/shipping/add">
                <Button className="btn-main">{pathOr("", [locale, "Shipping", "addShippingOpt"], t)}</Button>
              </Link>
            </div>

            {content}

            {/* <Modal
          open={addConditionModal}
          onClose={() => {
            setAddConditionModal(false)
          }}
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
        >
          <Box sx={style}>
            <AddShippingOption
              setAddConditionModal={setAddConditionModal}
              fetchShippingOptions={fetchShippingOptions}
            />
          </Box>
        </Modal> */}
          </>
        )}
      </div>
    </div>
  )
}

export default Shipping
