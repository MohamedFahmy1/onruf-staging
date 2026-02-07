import { Modal } from "react-bootstrap"
import t from "../../../../translations.json"
import { is, pathOr } from "ramda"
import { useRouter } from "next/router"
import loading from "../../../../../public/images/loading.png"
import success from "../../../../../public/images/success.png"
import failed from "../../../../../public/images/failed.png"
import Image from "next/image"
import { textAlignStyle } from "../../../../styles/stylesObjects"

const CheckoutModal = ({ isModalOpen, setIsModalOpen, totalAmount }) => {
  const { locale, push, pathname } = useRouter()

  const handleNavigate = () => {
    push("/products")
  }

  const handleGoToHomePage = () => {
    push("/", undefined, { locale: locale })
  }

  let content = <></>

  const isEdit = pathname.includes("edit")

  switch (isModalOpen) {
    case "loading":
      content = (
        <div className="mt-5">
          <Image src={loading} alt="loading" width={150} height={150} />
          <p style={{ fontSize: "26px", marginBlock: "40px" }}>
            {totalAmount == 0 && isEdit
              ? pathOr("", [locale, "Products", "EditLoading"], t)
              : pathOr("", [locale, "Products", "PaymentLoading"], t)}
          </p>
        </div>
      )
      break
    case "success":
      content = (
        <>
          <Image src={success} alt="success" width={150} height={150} />
          <p style={{ fontSize: "26px", marginBlock: "25px" }}>
            {isEdit
              ? pathOr("", [locale, "Products", "PaymentSuccessEdit"], t)
              : pathOr("", [locale, "Products", "PaymentSuccess"], t)}
          </p>
          <button
            className="btn-main"
            style={{ width: "326px", marginInline: "auto", fontSize: "24px", fontWeight: "normal" }}
            onClick={handleNavigate}
          >
            {pathOr("", [locale, "Products", "ViewTheProduct"], t)}
          </button>
          <p
            className="pointer"
            onClick={handleGoToHomePage}
            style={{ fontSize: "24px", marginTop: "5px", marginBottom: "40px" }}
          >
            {pathOr("", [locale, "Products", "BackToHomepage"], t)}
          </p>
        </>
      )
      break
    case "failed":
      content = (
        <div className="mt-5">
          <Image src={failed} alt="failed" width={150} height={150} />
          <p style={{ fontSize: "26px", marginBlock: "40px" }}>{pathOr("", [locale, "Products", "PaymentError"], t)}</p>
          <button
            className="btn-main mb-5"
            style={{ width: "326px", marginInline: "auto" }}
            onClick={() => setIsModalOpen(false)}
          >
            {pathOr("", [locale, "Products", "Ok"], t)}
          </button>
        </div>
      )
      break
    default:
      content = <></>
  }

  return (
    <Modal
      show={isModalOpen}
      onHide={() => {}}
      centered
      className="unique-send-offer-modal"
      style={textAlignStyle(locale)}
    >
      <Modal.Header className="justify-content-end">
        {isModalOpen === "success" && (
          <button type="button" className="btn-close" aria-label="close modal" onClick={handleNavigate}></button>
        )}
      </Modal.Header>
      <Modal.Body className="py-0">
        <div className="d-flex flex-column justify-content-center text-center">{content}</div>
      </Modal.Body>
    </Modal>
  )
}

export default CheckoutModal
