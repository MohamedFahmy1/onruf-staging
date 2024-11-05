import React from "react"
import AddBranchComponent from "../../../../modules/settings/branches/AddBranch"
import Head from "next/head"
import { pathOr } from "ramda"
import { useRouter } from "next/router"
import t from "../../../../translations.json"

const AddBranchPage = (props) => {
  const { locale } = useRouter()
  return (
    <main>
      {/* <Head>
        <title>{pathOr("Add Branch", [locale, "Branch", "addBranch"], t)}</title>
      </Head> */}
      <AddBranchComponent {...props} />
    </main>
  )
}

export default AddBranchPage
