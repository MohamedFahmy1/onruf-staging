import { useState, useEffect, useCallback, useRef } from "react"
import axios from "axios"
import { useRouter } from "next/router"
import styles from "./stepOne.module.css"
import t from "../../../../translations.json"
import { Col, Row } from "react-bootstrap"
import { pathOr } from "ramda"

const AddProductStepOne = ({ next, setSelectedCatProps, setProductPayload }) => {
  const { locale, query } = useRouter()
  const isDropShipping = query?.isDropShipping === "true"
  // `categoryOptionsByLevel[level]` holds the selectable categories for that level
  const [categoryOptionsByLevel, setCategoryOptionsByLevel] = useState([[]])
  // `selectedCategories[level]` holds the selected category id for that level (or null if not selected yet)
  const [selectedCategories, setSelectedCategories] = useState([null])
  // Only enable "Next" after we confirm the current last selection is a leaf (API returns no children)
  const [confirmedLeafId, setConfirmedLeafId] = useState(null)
  const [isFetchingSubcategories, setIsFetchingSubcategories] = useState(false)
  const subcategoriesRequestIdRef = useRef(0)

  const fetchMainCategories = useCallback(async () => {
    // Invalidate any in-flight subcategory requests (e.g., locale changed)
    subcategoriesRequestIdRef.current += 1
    setIsFetchingSubcategories(false)
    setConfirmedLeafId(null)
    try {
      const res = await axios.get(`/ListAllCategory?isShowInHome=false&lang=${locale}`)
      const cats = res?.data?.data
      const list = Array.isArray(cats) ? cats : []
      setCategoryOptionsByLevel([list])
      setSelectedCategories([null])
      setSelectedCatProps?.(null)
    } catch (e) {
      setCategoryOptionsByLevel([[]])
      setSelectedCategories([null])
      setSelectedCatProps?.(null)
    }
  }, [locale])

  useEffect(() => {
    fetchMainCategories()
  }, [fetchMainCategories])

  const fetchSubcategoriesByCategoryId = useCallback(async (categoryId) => {
    const res = await axios.get(`/GetSubCategoryByMainCategory?id=${categoryId}`)
    const subcats = res?.data?.data
    if (Array.isArray(subcats)) return subcats
    if (Array.isArray(subcats?.list)) return subcats.list
    return []
  }, [])

  const handleSelectionChange = useCallback(
    async (level, selectedId) => {
      // Always truncate deeper selections/options when user changes an earlier level
      setConfirmedLeafId(null)
      setSelectedCategories((prev) => {
        const nextSelected = prev.slice(0, level + 1)
        nextSelected[level] = selectedId
        return nextSelected
      })
      setCategoryOptionsByLevel((prev) => prev.slice(0, level + 1))

      if (!selectedId) {
        // Invalidate any in-flight requests so stale responses can't append levels
        subcategoriesRequestIdRef.current += 1
        setIsFetchingSubcategories(false)
        return
      }

      const requestId = ++subcategoriesRequestIdRef.current
      let subcats = []
      setIsFetchingSubcategories(true)
      try {
        subcats = await fetchSubcategoriesByCategoryId(selectedId)
      } catch (e) {
        if (subcategoriesRequestIdRef.current === requestId) {
          setIsFetchingSubcategories(false)
        }
        return
      }
      // Ignore stale results if user changed selection while the request was in-flight
      if (subcategoriesRequestIdRef.current !== requestId) return
      setIsFetchingSubcategories(false)

      // If subcategories exist, add a new select level and require user to pick from it
      if (subcats.length > 0) {
        setCategoryOptionsByLevel((prev) => {
          const base = prev.slice(0, level + 1)
          return [...base, subcats]
        })
        setSelectedCategories((prev) => {
          const base = prev.slice(0, level + 1)
          base[level] = selectedId
          return [...base, null]
        })
      } else {
        // No children returned => confirmed leaf
        setConfirmedLeafId(selectedId)
      }
    },
    [fetchSubcategoriesByCategoryId],
  )

  const getLeafSelection = () => {
    let leafLevel = -1
    let leafId = null
    for (let i = 0; i < selectedCategories.length; i++) {
      if (selectedCategories[i]) {
        leafLevel = i
        leafId = selectedCategories[i]
      }
    }
    const leafOptions = leafLevel >= 0 ? categoryOptionsByLevel[leafLevel] || [] : []
    const leafCatProps = leafOptions.find((c) => c.id === leafId)
    return { leafLevel, leafId, leafCatProps }
  }

  const handleNextStep = (e) => {
    e.preventDefault()
    const lastSelectedId = selectedCategories[selectedCategories.length - 1]
    // Must be a confirmed leaf selection
    if (!lastSelectedId) return
    if (isFetchingSubcategories) return
    if (confirmedLeafId !== lastSelectedId) return

    const { leafId: selectedCatId, leafCatProps: catProps } = getLeafSelection()
    if (!selectedCatId) return

    next(isDropShipping ? catProps : selectedCatId)
    setProductPayload((prev) => ({
      ...prev,
      categoryId: selectedCatId,
      "ProductPaymentDetailsDto.CategoryId": selectedCatId,
      "ProductPaymentDetailsDto.ProductPublishPrice": catProps?.productPublishPrice,
      "ProductPaymentDetailsDto.EnableFixedPriceSaleFee": catProps?.enableFixedPriceSaleFee,
      "ProductPaymentDetailsDto.EnableAuctionFee": catProps?.enableAuctionFee,
      "ProductPaymentDetailsDto.EnableNegotiationFee": catProps?.enableNegotiationFee,
      "ProductPaymentDetailsDto.FixedPriceSaleFee": catProps?.enableFixedPriceSaleFee,
      "ProductPaymentDetailsDto.AuctionFee": catProps?.enableAuctionFee,
      "ProductPaymentDetailsDto.NegotiationFee": catProps?.enableNegotiationFee,
      "ProductPaymentDetailsDto.ExtraProductImageFee": catProps?.extraProductImageFee,
      "ProductPaymentDetailsDto.ExtraProductVidoeFee": catProps?.extraProductVidoeFee,
      "ProductPaymentDetailsDto.SubTitleFee": catProps?.subTitleFee,
    }))
    setSelectedCatProps(catProps)
  }

  const isNextDisabled =
    !selectedCategories[selectedCategories.length - 1] ||
    isFetchingSubcategories ||
    confirmedLeafId !== selectedCategories[selectedCategories.length - 1]

  const renderSelectFields = () => {
    return selectedCategories.map((selectedId, level) => {
      const options = categoryOptionsByLevel[level] || []
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
            onChange={(e) => {
              const value = e.target.value
              if (!value) return handleSelectionChange(level, null)
              return handleSelectionChange(level, parseInt(value, 10))
            }}
          >
            <option value="" disabled hidden>
              {pathOr("", [locale, "Products", "selectOption"], t)}
            </option>
            {options.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      )
    })
  }

  return (
    <div className="contint_paner">
      <Row className="justify-content-center">
        <Col lg={6}>
          <div className="mt-4">
            <div className="text-center mb-3">
              <h2 className="f-b fs-3">{pathOr("", [locale, "Products", "sellWhat"], t)}</h2>
            </div>
            <div className="form-content">
              <form>
                {renderSelectFields()}
                <button
                  onClick={handleNextStep}
                  disabled={isNextDisabled}
                  className={`btn-main d-block w-100 ${isNextDisabled ? styles["btn-disabled"] : ""}`}
                >
                  {pathOr("", [locale, "Products", "next"], t)}
                </button>
              </form>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  )
}

export default AddProductStepOne
