import { useCallback, useEffect } from "react"
import { getToken, onMessage } from "firebase/messaging"
import { toast } from "react-toastify"
import { messaging } from "./firebase"
import axios from "axios"
import { useDispatch, useSelector } from "react-redux"
import { useRouter } from "next/router"
import { setId } from "../appState/deviceId/reducer"
import t from "../translations.json"
import { showProductPublishSuccessToast } from "./productPublishSuccessToast"

const FirebaseMessaging = () => {
  const { locale } = useRouter()
  const buisnessAccountId = useSelector((state) => state.authSlice.buisnessId)
  const dispatch = useDispatch()
  const generateToken = useCallback(async () => {
    const permission = await Notification.requestPermission()
    if (permission === "granted") {
      // get user token from firebase
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FCM,
      })
      dispatch(setId(token))
      if (token && buisnessAccountId) {
        // Send token to back-end
        await axios(
          `/ChangeAccount?businessAccountId=${buisnessAccountId}&deviceId=${token}&deviceType=BusinessAccount`,
        )
      }
    }
  }, [buisnessAccountId, dispatch])

  useEffect(() => {
    if (messaging) {
      generateToken()
    }
  }, [generateToken])

  useEffect(() => {
    if (!messaging) return

    return onMessage(messaging, ({ notification }) => {
      if (!notification) return

      const { title, body } = notification

      // Match the product announcement because the payment title is generic.
      if (title?.trim() === t.ar.Notifications.productPaymentSuccess.title && /عن\s+منتجك\s+للبيع/.test(body)) {
        showProductPublishSuccessToast(locale, true)
        return
      }

      toast.info(
        <div>
          <strong>{title}</strong>
          <div>{body}</div>
        </div>,
      )
    })
  }, [locale])

  return null
}

export default FirebaseMessaging
