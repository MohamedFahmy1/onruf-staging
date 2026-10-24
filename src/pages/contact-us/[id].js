import Head from "next/head"
import { pathOr } from "ramda"
import t from "../../translations.json"
import { useRouter } from "next/router"
import ContactUsDetails from "../../modules/contact-us/details"

const ContactUsDetailsPage = () => {
  const { locale } = useRouter()

  return (
    <main>
      <Head>
        <title>{pathOr("", [locale, "websiteTitles", "ContactDetails"], t)}</title>
      </Head>
      <ContactUsDetails />
    </main>
  )
}

export default ContactUsDetailsPage
