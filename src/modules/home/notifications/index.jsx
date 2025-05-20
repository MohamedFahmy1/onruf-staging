import { useRouter } from "next/router"
import { pathOr } from "ramda"
import { Col } from "react-bootstrap"
import t from "../../../translations.json"
import { useCallback, useEffect, useState } from "react"
import Alerto from "../../../common/Alerto"
import axios from "axios"
import { useSelector } from "react-redux"
import moment from "moment"
import "moment/locale/ar"
import Link from "next/link"

const Notifications = () => {
  const { locale, push } = useRouter()
  const [notificationsList, setNotificationsList] = useState()
  const buisnessAccountId = useSelector((state) => state.authSlice.buisnessId)

  const getNotifications = useCallback(async () => {
    try {
      const {
        data: { data: notifications },
      } = await axios.post(`/ListNotifications?pageIndex=1&PageRowsCount=10`)
      setNotificationsList(notifications)
    } catch (error) {
      Alerto(error)
    }
  }, [])
  useEffect(() => {
    buisnessAccountId && getNotifications()
  }, [getNotifications, buisnessAccountId])

  return (
    <Col lg={3}>
      <article className="contint_paner py-2 px-0">
        <section className="d-flex align-items-center justify-content-between mb-2 px-3 fs-5">
          <p className="f-b fs-5 m-0">{pathOr("", [locale, "Notifications", "notifications"], t)}</p>
          <Link href={`${locale === "en" ? "/en" : ""}/notifications`} className="main-color text-decoration-none">
            {pathOr("", [locale, "Notifications", "viewall"], t)}
          </Link>
        </section>
        <ul className="list_notifcation px-3">
          {!notificationsList?.length && (
            <h4 className="text-center my-5">{locale === "ar" ? "لا يوجد اشعارات" : "No Notifications Found"}</h4>
          )}
          {notificationsList?.slice(0, 5).map((item) => {
            return (
              <li className="item agree py-2" key={item.id}>
                <section className="gray-color mb-1 d-flex justify-content-between">
                  <span>{item.title} </span>
                  <span>
                    {moment(item.createdAt)
                      .locale(locale === "ar" ? "ar" : "en")
                      .fromNow()}
                  </span>
                </section>
                <section className="po_R" style={{ unicodeBidi: "plaintext" }}>
                  {item.body}
                </section>
              </li>
            )
          })}
        </ul>
      </article>
    </Col>
  )
}

export default Notifications
