import { toast } from "react-toastify"
import t from "../translations.json"

export const showProductPublishSuccessToast = (locale, paid) => {
  const copy = t[locale] ?? t.ar
  const options = { toastId: "product-publish-success" }

  if (!paid) {
    toast.success(copy.Products.PaymentSuccess, options)
    return
  }

  const { title, body } = copy.Notifications.productPaymentSuccess
  toast.info(
    <div>
      <strong>{title}</strong>
      <div>{body}</div>
    </div>,
    options,
  )
}
