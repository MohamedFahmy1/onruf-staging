import { useRouter } from "next/router"
import { pathOr } from "ramda"
import t from "../../../translations.json"
import { useSelector } from "react-redux"
import { formatDate } from "../../../common/functions"
import { useFetch } from "../../../hooks/useFetch"
import { Skeleton } from "@mui/material"
import PackageCard from "./PackageCard"
import { Col, Row } from "react-bootstrap"
import { useCallback, useEffect, useState } from "react"
import styles from "./package.module.css"
import axios from "axios"
import Alerto from "../../../common/Alerto"

const Packages = () => {
  const { locale, push } = useRouter()
  const providerId = useSelector((state) => state.authSlice.providerId)
  const { data: SMSPakat } = useFetch(`/GetAllPakatsList?isAdmin=${false}&PakatType=SMS`)
  const { data: CurrentPakat } = useFetch(`/GetClientSubcripePakats?clientId=${providerId}`)

  const [isLoading, setIsLoading] = useState(false)

  const [PublishPakat, setPublishPakat] = useState([])
  const [allCategories, setAllCategories] = useState([])
  const [selectedCategories, setSelectedCategories] = useState([null])

  const fetchCategories = useCallback(async () => {
    try {
      const {
        data: { data: cats },
      } = await axios(`/ListCategoryAndSub?lang=${locale}&currentPage=1`)
      setAllCategories(cats)
    } catch (error) {
      Alerto(error)
    }
  }, [locale])

  const fetchPublishPackages = async () => {
    try {
      setIsLoading(true)
      const catId = selectedCategories[selectedCategories.length - 1]
      const {
        data: { data: packs },
      } = await axios(`/GetAllPakatsList?isAdmin=${false}&categoryId=${catId}&PakatType=Publish`)
      setPublishPakat(packs?.length > 0 ? packs : null)
      setIsLoading(false)
    } catch (error) {
      setIsLoading(false)
      Alerto(error)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories, locale])

  const handleSelectionChange = (level, selectedId) => {
    const newSelectedCategories = selectedCategories.slice(0, level + 1)
    newSelectedCategories[level] = selectedId

    const selectedCategory = getCategoryById(allCategories, selectedId)
    if (selectedCategory && selectedCategory.list && selectedCategory.list.length > 0) {
      newSelectedCategories.push(null)
    }
    setSelectedCategories(newSelectedCategories)
  }

  const getCategoryById = (categories, id) => {
    for (const category of categories) {
      if (category.id === id) return category
      if (category.list) {
        const subcategory = getCategoryById(category.list, id)
        if (subcategory) return subcategory
      }
    }
    return null
  }

  const getSubcategories = (categories, selectedIds) => {
    let subcategories = categories
    for (const id of selectedIds) {
      const category = subcategories.find((c) => c.id === id)
      if (category && category.list) {
        subcategories = category.list
      } else {
        return []
      }
    }
    return subcategories
  }

  const renderSelectFields = () => {
    return selectedCategories.map((selectedId, level) => {
      const subcategories = getSubcategories(allCategories, selectedCategories.slice(0, level))
      return (
        <div key={level} className={`form-group ${styles["select_P"]}`}>
          <label className="d-block text-center" htmlFor={`selectCategory-${level}`}>
            {level > 0
              ? pathOr("", [locale, "Products", "subcategory"], t)
              : pathOr("", [locale, "Products", "selectCategory"], t)}
          </label>
          <select
            value={selectedId || ""}
            className="form-control form-select"
            name={`selectCategory-${level}`}
            id={`selectCategory-${level}`}
            onChange={(e) => handleSelectionChange(level, parseInt(e.target.value))}
          >
            <option value="" disabled hidden>
              {pathOr("", [locale, "Products", "selectOption"], t)}
            </option>
            {subcategories.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>
                {subcategory.name}
              </option>
            ))}
          </select>
        </div>
      )
    })
  }

  return (
    <div className="body-content">
      {/* Current Pakat */}
      <div className="mb-4">
        <div>
          <h6 className="f-b m-0">{pathOr("", [locale, "Packages", "currentPaka"], t)}</h6>
        </div>
        <div className="outer_boxsBouquet">
          {CurrentPakat !== undefined ? (
            CurrentPakat?.map((paka, idx) => (
              <div className="d-flex" key={idx}>
                {paka && <PackageCard isCurrent={true} pack={paka} key={idx} handleSubscribePackage={() => {}} />}
                <div className="box-Bouquet p-4">
                  <ul>
                    <li className="mb-4 d-flex justify-content-between">
                      <div>
                        <p>{pathOr("", [locale, "Packages", "lastPackageUpdate"], t)}</p>
                        <div className="f-b">{formatDate(paka.startDate)}</div>
                      </div>
                      <button className="btn-main">{pathOr("", [locale, "Orders", "download_invoice"], t)}</button>
                    </li>
                    <li className="mb-4 d-flex justify-content-between">
                      <div>
                        <p>{pathOr("", [locale, "Packages", "nextRenewalDate"], t)}</p>
                        <div className="f-b">{formatDate(paka.endDate)}</div>
                      </div>
                      <button
                        className="btn-main btn-main-B"
                        onClick={() => push(`packages/${paka.pakaId}?isSub=true`)}
                      >
                        {pathOr("", [locale, "Packages", "renewPaka"], t)}
                      </button>
                    </li>
                    {paka?.listCategories?.[0]?.name && (
                      <li className="mb-4 d-flex justify-content-between">
                        <p>{pathOr("", [locale, "Packages", "Category"], t)}</p>
                        <p>{paka?.listCategories?.map((item) => item.name).join(" - ")}</p>
                      </li>
                    )}
                    <li className="mb-4 d-flex justify-content-between">
                      <p>{pathOr("", [locale, "Packages", "PackageType"], t)}</p>
                      <p>{paka?.smSsCount > 0 ? "SMS" : "Publish"}</p>
                    </li>
                  </ul>
                </div>
              </div>
            ))
          ) : (
            <>
              <Skeleton variant="rectangular" width={730} height={405} />
              <Skeleton variant="rectangular" width={730} height={405} />
              <Skeleton variant="rectangular" width={730} height={405} />
            </>
          )}
        </div>
      </div>
      {/* SMS Pakat */}
      <div className="mb-4">
        <div className="mb-4">
          <h3 className="f-b m-0"> {pathOr("", [locale, "Packages", "packages"], t)} SMS</h3>
        </div>
        {SMSPakat?.length > 0 ? (
          <div className="outer_boxsBouquet">
            {SMSPakat?.map((paka) => (
              <PackageCard key={paka.id} pack={paka} handleSubscribePackage={() => push(`packages/${paka.id}`)} />
            ))}
          </div>
        ) : (
          <h2 className="text-center">{pathOr("", [locale, "Packages", "noPakat"], t)}</h2>
        )}
      </div>
      <hr />
      <div className="mb-4">
        <div className="mb-4">
          <h3 className="f-b m-0"> {pathOr("", [locale, "Packages", "packages"], t)} Publish</h3>
        </div>
        <Row className="justify-content-center">
          <Col lg={6}>
            <div className="mt-4">
              <div className="form-content">
                <form>
                  {renderSelectFields()}
                  <button
                    onClick={() => fetchPublishPackages()}
                    disabled={!selectedCategories[selectedCategories.length - 1] || isLoading}
                    type="button"
                    className={`btn-main d-block w-100 ${
                      !selectedCategories[selectedCategories.length - 1] ? styles["btn-disabled"] : ""
                    }`}
                  >
                    {pathOr("", [locale, "Products", "next"], t)}
                  </button>
                </form>
              </div>
            </div>
          </Col>
        </Row>
        {PublishPakat === null ? (
          <h2 className="text-center mt-3">{pathOr("", [locale, "Packages", "noPakat"], t)}</h2>
        ) : (
          <div className="outer_boxsBouquet">
            {PublishPakat?.map((paka) => (
              <PackageCard key={paka.id} pack={paka} handleSubscribePackage={() => push(`packages/${paka.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Packages
