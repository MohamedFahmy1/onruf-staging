import { Modal } from "react-bootstrap"
import t from "../../../../translations.json"
import { pathOr } from "ramda"
import { useRouter } from "next/router"
import wallet from "../../../../../public/images/wallet.png"
import Image from "next/image"
import { useEffect } from "react"
import { useFetch } from "../../../../hooks/useFetch"
import { textAlignStyle } from "../../../../styles/stylesObjects"

const WalletModal = ({ isWalletModalOpen, setIsWalletModalOpen, totalCost, handleAccept }) => {
  const { locale } = useRouter()
  const { data: walletData } = useFetch(`/GetUserWalletTransactions`)

  const isSufficient = walletData?.walletBalance > totalCost

  const closeModal = () => {
    setIsWalletModalOpen(false)
  }

  useEffect(() => {
    if (walletData) {
      isSufficient ? handleAccept() : null
    }
  }, [isSufficient, walletData])

  return (
    <Modal
      show={isWalletModalOpen && walletData}
      onHide={() => setIsWalletModalOpen(false)}
      centered
      className="unique-send-offer-modal"
      style={textAlignStyle(locale)}
    >
      <Modal.Header className="justify-content-end">
        <button
          type="button"
          className="btn-close"
          aria-label="close modal"
          onClick={() => setIsWalletModalOpen(false)}
        ></button>
      </Modal.Header>
      <Modal.Body className="py-0">
        <h1 className="disc-header fs-4 text-center  p-0" style={{ marginBottom: "50px" }}>
          {pathOr("", [locale, "Products", "MyWallet"], t)}
        </h1>
        <div className="d-flex flex-column justify-content-center text-center">
          <Image src={wallet} alt="wallet" width={230} height={230} />
          <p style={{ fontSize: "26px", marginTop: "40px" }}>
            {pathOr("", [locale, "Products", "WalletBalance"], t)} {walletData?.walletBalance}{" "}
            {pathOr("", [locale, "Products", "currency"], t)}
          </p>
          {isSufficient ? (
            <p style={{ marginBottom: "20px" }}>{pathOr("", [locale, "Products", "SuccessWalletDesc"], t)}</p>
          ) : (
            <p style={{ marginBottom: "20px" }}>{pathOr("", [locale, "Products", "ErrorWalletDesc"], t)}</p>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer className="modal-footer">
        <button type="button" className="btn-main" aria-label="next step" onClick={closeModal}>
          {pathOr("", [locale, "Products", "Accept"], t)}
        </button>
      </Modal.Footer>
    </Modal>
  )
}

export default WalletModal
