import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { useSelector } from "react-redux"
import moment from "moment"
import Table from "../../common/table"
import Pagination from "../../common/pagination"
import { formatDate } from "../../common/functions"
import t from "../../translations.json"
import { searchOrdersAndProductsById } from "./api"

const PAGE_SIZE = 10
const getResultType = (row) => row.type?.trim().toLowerCase() || ""
const getRowId = (row) => `${getResultType(row)}-${row.id}`
const getResultHref = (row) => {
  const type = getResultType(row)
  if (type === "order") return `/orders/${row.id}`
  if (type === "product") return `/products/edit/${row.id}?isDropShipping=false`
  return null
}

const SearchResults = ({ number, locale, canSearch }) => {
  const { pathname, query, replace } = useRouter()
  const copy = t[locale].search
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(Boolean(number && canSearch))
  const [error, setError] = useState(null)
  const [retryAttempt, setRetryAttempt] = useState(0)

  useEffect(() => {
    if (!number || !canSearch) return
    const controller = new AbortController()
    setResults([])
    setLoading(true)
    setError(null)

    searchOrdersAndProductsById(number, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setResults(items)
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [number, canSearch, retryAttempt])

  const lastPage = Math.max(1, Math.ceil(results.length / PAGE_SIZE))
  const requestedPage = Number(query.page || 1)
  const page = Number.isSafeInteger(requestedPage) ? Math.min(Math.max(1, requestedPage), lastPage) : 1
  const needsPageUpdate = String(query.page || 1) !== String(page)

  useEffect(() => {
    if (!number || loading || error || !needsPageUpdate) return
    replace({ pathname, query: { ...query, page } }, undefined, { shallow: true })
  }, [number, loading, error, needsPageUpdate, pathname, query, page, replace])

  const columns = useMemo(
    () => [
      {
        Header: copy.id,
        accessor: "id",
        Cell: ({ row: { original } }) => {
          const href = getResultHref(original)

          return href ? (
            <Link href={href}>
              <a className="main-color">#{original.id}</a>
            </Link>
          ) : (
            <span>#{original.id}</span>
          )
        },
      },
      {
        Header: copy.type,
        accessor: "type",
        Cell: ({ row: { original } }) => {
          const type = getResultType(original)
          return type === "product" || type === "order" ? copy[type] : original.type || "—"
        },
      },
      { Header: copy.name, accessor: "name", Cell: ({ value }) => value || "—" },
      {
        Header: copy.createdAt,
        accessor: "createdAt",
        Cell: ({ value }) => (value && moment(value).isValid() ? formatDate(value) : "—"),
      },
    ],
    [copy],
  )

  return (
    <div className="body-content">
      <h1 className="fs-4 f-b">{copy.title}</h1>
      <div className="contint_paner">
        {!number ? (
          <p className="mb-0" role="status">
            {copy.prompt}
          </p>
        ) : error ? (
          <div role="alert">
            <p>{copy.loadError}</p>
            <button type="button" className="btn btn-main" onClick={() => setRetryAttempt((attempt) => attempt + 1)}>
              {copy.retry}
            </button>
          </div>
        ) : (
          <>
            <div
              className="outer_table"
              role="region"
              aria-label={copy.title}
              aria-busy={loading || !canSearch || needsPageUpdate}
              tabIndex={0}
            >
              <Table
                columns={columns}
                data={results}
                loading={loading || !canSearch || needsPageUpdate}
                pageSize={PAGE_SIZE}
                isCheckbox={false}
                getRowId={getRowId}
                getRowHref={getResultHref}
              />
            </div>
            {!loading && !needsPageUpdate && results.length > PAGE_SIZE && (
              <Pagination listLength={results.length} pageSize={PAGE_SIZE} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

const Search = () => {
  const { query, locale, isReady } = useRouter()
  const { token, providerId, buisnessId } = useSelector((state) => state.authSlice)
  const number = typeof query.number === "string" ? query.number.trim() : ""

  if (!isReady) return null

  // Remount for a new search or session so previous account results never remain visible.
  return (
    <SearchResults
      key={JSON.stringify([number, locale, token, providerId, buisnessId])}
      number={number}
      locale={locale}
      canSearch={Boolean(token && providerId && buisnessId)}
    />
  )
}

export default Search
