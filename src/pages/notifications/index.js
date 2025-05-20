import { useRouter } from "next/router"
import Notifications from "../../modules/notifications"
import Head from "next/head"
import { pathOr } from "ramda"
import t from "../../translations.json"

const NotificationsPage = () => {
  const { locale } = useRouter()

  return (
    <main>
      <Head>
        <title>{pathOr("", [locale, "websiteTitles", "Notifications"], t)}</title>
      </Head>
      <Notifications />
    </main>
  )
}

export default NotificationsPage
