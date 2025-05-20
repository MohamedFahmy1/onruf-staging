import { useRouter } from "next/router"
import t from "../../translations.json"
import { pathOr } from "ramda"
import { useCallback, useEffect, useRef, useState } from "react"
import axios from "axios"
import moment from "moment"

const Notifications = () => {
  const { locale } = useRouter()
  const [notificationsList, setNotificationsList] = useState([])
  const page = useRef(1)

  const getNotifications = useCallback(async () => {
    try {
      const {
        data: { data: notifications },
      } = await axios.post(`/ListNotifications?pageIndex=${page.current}&PageRowsCount=10`)
      setNotificationsList((prev) => [...prev, ...notifications])
      notifications.length === 0 && (page.current = null)
    } catch (error) {
      Alerto(error)
    }
  }, [])

  useEffect(() => {
    getNotifications()
  }, [getNotifications])

  return (
    <div className="m-5">
      <h1 className="f-b fs-5 m-0">{pathOr("", [locale, "Notifications", "AllNotifications"], t)}</h1>
      <ul className="contint_paner d-flex flex-column gap-3">
        {!notificationsList?.length && (
          <h3 className="text-center my-5">{locale === "ar" ? "لا يوجد اشعارات" : "No Notifications Found"}</h3>
        )}
        {notificationsList?.map((item) => (
          <li className="p-3" style={{ backgroundColor: "#FBFBFB", borderRadius: "6px" }} key={item.id}>
            <section className="mb-1 d-flex justify-content-between">
              <p style={{ fontSize: 18 }}>{item.title} </p>
              <p className="main-color">{moment(item.createdAt).format("DD/MM/YYYY")}</p>
            </section>
            <p style={{ unicodeBidi: "plaintext", color: "#5F677B" }}>{item.body}</p>
          </li>
        ))}
        {!!(page.current && notificationsList?.length > 0) && (
          <button style={{ fontSize: 18 }} onClick={() => page.current++ && getNotifications()}>
            {pathOr("", [locale, "Notifications", "ReadMore"], t)}
          </button>
        )}
      </ul>
    </div>
  )
}

export default Notifications
