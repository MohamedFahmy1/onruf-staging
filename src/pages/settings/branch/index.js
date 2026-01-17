import Branches from "../../../modules/settings/branches"
import Head from "next/head"
import { pathOr } from "ramda"
import { useRouter } from "next/router"
import t from "../../../translations.json"

const BranchPage = () => {
  const { locale } = useRouter()
  return (
    <main>
      <Head>
        <title>{pathOr("", [locale, "websiteTitles", "Branches"], t)}</title>
      </Head>
      <Branches />
    </main>
  )
}

export default BranchPage
