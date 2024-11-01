import React, { useEffect, useState } from "react"
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

const Shipping = () => {
  const { locale, push } = useRouter()
  const [shippingOptions, setShippingOptions] = useState()
  const [loading, setLoading] = useState(false)
  const { buisnessId } = useSelector((state) => state.authSlice)

  const fetchShippingOptions = async () => {
    try {
      setLoading(true)
      const {
        data: { data: shippingOptions },
      } = await axios.get("/GetAllShippingOptions", {
        params: { businessAccountId: buisnessId, lang: "ar" },
      })
      setLoading(false)
      setShippingOptions(shippingOptions)
    } catch (error) {
      setLoading(false)
      Alerto(error)
    }
  }

  useEffect(() => {
    fetchShippingOptions()
  }, [])

  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "90%",
    height: 720,
    bgcolor: "background.paper",
    boxShadow: 24,
    p: 4,
    borderRadius: 2,
    overflow: "scroll",
  }

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
      </div>
    </div>
  )
}

export default Shipping
