import t from "../translations.json"
import { pathOr } from "ramda"
import Image from "next/image"
import sadFace from "../assets/images/SadColor-Gray.svg"
import smileFace from "../assets/images/SmileFace-Color.svg"
import happyFace from "../assets/images/HappyFace-Color.svg"
import moment from "moment"
import { toast } from "react-toastify"

export const formatDate = (date) => {
  return moment(date).format("DD/MM/YYYY")
}

export const minDate = () => {
  const dateIntoArray = formatDate(new Date()).split("/")
  return `${dateIntoArray[2]}-${dateIntoArray[1]}-${dateIntoArray[0].trim()}`
}

export const onlyNumbersInInputs = (e) => {
  if (
    !["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "Backspace", "Delete", "ArrowRight", "ArrowLeft"].includes(
      e.key,
    )
  ) {
    e.preventDefault()
  }
}

export const handleFormErrors = (errors, name) => {
  return errors[name] && errors[name].message
}

export const orderStatusTranslate = (statusFromApi, locale) => {
  switch (statusFromApi) {
    case "Waiting For Payment":
      return pathOr("", [locale, "Orders", "waiting_for_payment"], t)
    case "Waiting For Review":
      return pathOr("", [locale, "Orders", "waiting_for_review"], t)
    case "In Progress":
      return pathOr("", [locale, "Orders", "in_progress"], t)
    case "Ready For Delivery":
      return pathOr("", [locale, "Orders", "ready_for_delivery"], t)
    case "Delivery In Progress":
      return pathOr("", [locale, "Orders", "delivery_in_progress"], t)
    case "Delivered":
      return pathOr("", [locale, "Orders", "delivered"], t)
    case "Canceled":
      return pathOr("", [locale, "Orders", "canceled"], t)
    default:
      if (statusFromApi?.match(/payment/gi) || statusFromApi === "بانتظار الدفع") {
        return pathOr("", [locale, "Orders", "waiting_for_payment"], t)
      } else if (statusFromApi?.match(/review/gi) || statusFromApi === "بانتظار المراجعة") {
        return pathOr("", [locale, "Orders", "waiting_for_review"], t)
      } else if (statusFromApi?.match(/in progress/gi) || statusFromApi === "فى تقدم") {
        return pathOr("", [locale, "Orders", "in_progress"], t)
      } else if (statusFromApi?.match(/ready/gi) || statusFromApi === "جاهزة للتسليم") {
        return pathOr("", [locale, "Orders", "ready_for_delivery"], t)
      } else if (statusFromApi?.match(/delivery in/gi) || statusFromApi === "التسليم قيد التقدم") {
        return pathOr("", [locale, "Orders", "delivery_in_progress"], t)
      } else if (statusFromApi?.match(/delivered/gi) || statusFromApi === "تم تسليم الطلب") {
        return pathOr("", [locale, "Orders", "delivered"], t)
      } else if (statusFromApi?.match(/cancel/gi) || statusFromApi === "ملغية") {
        return pathOr("", [locale, "Orders", "canceled"], t)
      } else return "Unknown payment type"
  }
}

export const paymentTypesTranslation = (typeFromApi, locale) => {
  switch (typeFromApi) {
    case "1":
      return pathOr("", [locale, "Products", "cash"], t)
    case "2":
      return pathOr("", [locale, "Products", "bankTransfer"], t)
    case "3":
      return pathOr("", [locale, "Products", "creditCard"], t)
    case "4":
      return pathOr("", [locale, "Products", "mada"], t)
    default:
      if (typeFromApi?.match(/cash/gi)) {
        return pathOr("", [locale, "Products", "cash"], t)
      } else if (typeFromApi?.match(/bank/gi)) {
        return pathOr("", [locale, "Products", "bankTransfer"], t)
      } else if (typeFromApi?.match(/card/gi)) {
        return pathOr("", [locale, "Products", "creditCard"], t)
      } else if (typeFromApi?.match(/mada/gi)) {
        return pathOr("", [locale, "Products", "mada"], t)
      }
      return "Unknown payment type"
  }
}

export const orderTypesTranslation = (typeFromApi, locale) => {
  if (typeFromApi?.match(/Fixed/gi)) {
    return pathOr("", [locale, "Orders", "fixedPrice"], t)
  } else if (typeFromApi?.match(/negotiation/gi)) {
    return pathOr("", [locale, "Orders", "negotiation"], t)
  } else if (typeFromApi?.match(/auction/gi)) {
    return pathOr("", [locale, "Orders", "auction"], t)
  } else return "Unknown order type"
}

export const negotiationTypeTranslation = (dataFromApi, locale) => {
  if (dataFromApi?.match(/Expired/gi)) {
    return pathOr("", [locale, "negotiation", "expired"], t)
  } else if (dataFromApi?.match(/Canceled/gi)) {
    return pathOr("", [locale, "negotiation", "canceled"], t)
  } else if (dataFromApi?.match(/Lost/gi)) {
    return pathOr("", [locale, "negotiation", "lost"], t)
  } else if (dataFromApi?.match(/Purchased/gi)) {
    return pathOr("", [locale, "negotiation", "purchased"], t)
  } else if (dataFromApi?.match(/New/gi)) {
    return pathOr("", [locale, "negotiation", "new"], t)
  } else if (dataFromApi?.match(/Accepted/gi)) {
    return pathOr("", [locale, "negotiation", "Accepted"], t)
  } else if (dataFromApi?.match(/Purchcased/gi)) {
    return pathOr("", [locale, "negotiation", "Purchcased"], t)
  } else if (dataFromApi?.match(/Refused/gi)) {
    return pathOr("", [locale, "negotiation", "refused"], t)
  } else return "Unknown negotiation type"
}

export const handleShowRatingEmoji = (rating) => {
  if (rating >= 1 && rating < 2) {
    return <Image src={sadFace} alt="angry emoji" width={30} height={30} />
  } else if (rating >= 2 && rating < 3) {
    return <Image src={smileFace} alt="smile emoji" width={30} height={30} />
  } else if (rating === 3) {
    return <Image src={happyFace} alt="happy emoji" width={30} height={30} />
  } else {
    return null
  }
}

export const handleNavigateToProductDetails = (id) => {
  window.open(`${process.env.NEXT_PUBLIC_WEBSITE}Home/GetProductById?id=${id}`, "_blank")
}

export const handleDownloadInvoice = (invoiceLink, locale) => {
  // handling download invoice if empty
  if (!invoiceLink) return toast.error(locale === "en" ? "Error downloading invoice" : "فشل تحميل الفاتورة")
  fetch(invoiceLink)
    .then((response) => response.blob())
    .then((blob) => {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = invoiceLink?.split("/")?.pop() || "invoice"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    })
    .catch(() => toast.error(locale === "en" ? "Error downloading invoice" : "فشل تحميل الفاتورة"))
}

export const getProductPositionName = (value, locale) => {
  switch (value) {
    case "StarRuf":
      return locale === "en" ? value : "رف النجوم"
    case "MoonRuf":
      return locale === "en" ? value : "رف القمر"
    case "CloudRuf":
      return locale === "en" ? value : "رف السحاب"
    default:
      return value
  }
}
