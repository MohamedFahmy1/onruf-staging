import Head from "next/head"
import { useRouter } from "next/router"
import Search from "../../modules/search"
import t from "../../translations.json"

const SearchPage = () => {
  const { locale } = useRouter()

  return (
    <main>
      <Head>
        <title>{t[locale].search.title}</title>
      </Head>
      <Search />
    </main>
  )
}

export default SearchPage
