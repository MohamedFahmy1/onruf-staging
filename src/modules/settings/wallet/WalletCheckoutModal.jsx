import { Modal } from "react-bootstrap"
import t from "../../../translations.json"
import { pathOr } from "ramda"
import { useRouter } from "next/router"
import loading from "../../../../public/images/loading.png"
import success from "../../../../public/images/success.png"
import failed from "../../../../public/images/failed.png"
import Image from "next/image"
import { textAlignStyle } from "../../../styles/stylesObjects"

const WalletCheckoutModal = ({ isModalOpen, setIsModalOpen, transType }) => {
  const { locale } = useRouter()

  const handleClose = () => {
    setIsModalOpen(false)
  }

  let content = <></>

  switch (isModalOpen) {
    case "loading":
      content = (
        <div className="mt-5">
          <Image src={loading} alt="loading" width={150} height={150} />
          <p style={{ fontSize: "26px", marginBlock: "40px" }}>
            {pathOr("", [locale, "Products", "PaymentLoading"], t)}
          </p>
        </div>
      )
      break
    case "success":
      content = (
        <>
          <Image src={success} alt="success" width={150} height={150} />
          <p style={{ fontSize: "26px", marginBlock: "25px" }}>
            {transType === "In"
              ? pathOr("", [locale, "BankAccounts", "RechargeSuccess"], t)
              : pathOr("", [locale, "BankAccounts", "WithdrawSuccess"], t)}
            .
          </p>
          {transType === "Out" && (
            <p style={{ fontSize: "26px", marginBlockEnd: "25px", paddingBlockEnd: "40px" }}>
              {transType === "Out" && pathOr("", [locale, "LastOrders", "orderNo"], t) + ": "}
              <span className="main-color">1213</span>
            </p>
          )}
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
          <button type="button" className="btn-close" aria-label="close modal" onClick={handleClose}></button>
        )}
      </Modal.Header>
      <Modal.Body className="py-0">
        <div className="d-flex flex-column justify-content-center text-center">{content}</div>
      </Modal.Body>
    </Modal>
  )
}

export default WalletCheckoutModal
