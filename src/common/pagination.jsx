import React from "react"
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io"
import Link from "next/link"
import { useRouter } from "next/router"

const Pagination = ({ listLength, pageSize = 10 }) => {
  const router = useRouter()
  const length = Math.ceil((listLength || 0) / pageSize)
  const page = Math.min(Math.max(1, parseInt(router.query.page, 10) || 1), Math.max(1, length))
  const previousPage = Math.max(1, page - 1)
  const nextPage = Math.min(Math.max(1, length), page + 1)

  const getPageHref = (nextPage) => ({ pathname: router.pathname, query: { ...router.query, page: nextPage } })

  return (
    <nav aria-label="Page navigation" className="mt-3">
      <ul className="pagination justify-content-center">
        <li className="page-item">
          <Link href={getPageHref(previousPage)}>
            <a className="page-link" aria-label={`Go to page ${previousPage}`}>
              {router.locale === "en" ? <IoIosArrowBack /> : <IoIosArrowForward />}
            </a>
          </Link>
        </li>
        {Array.from({ length }, (_, n) => n + 1).map((p) => (
          <li className="page-item" key={p}>
            <Link href={getPageHref(p)}>
              <a className={`page-link ${page === p ? "active" : ""}`} aria-label={`Go to page ${p}`}>
                {p}
              </a>
            </Link>
          </li>
        ))}
        <li className="page-item">
          <Link href={getPageHref(nextPage)}>
            <a className="page-link" aria-label={`Go to page ${nextPage}`}>
              {router.locale === "ar" ? <IoIosArrowBack /> : <IoIosArrowForward />}
            </a>
          </Link>
        </li>
      </ul>
    </nav>
  )
}

export default Pagination
