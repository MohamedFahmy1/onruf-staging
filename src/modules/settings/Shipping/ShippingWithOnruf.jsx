import { useCallback, useEffect, useState } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import { pathOr } from "ramda"
import Alerto from "../../../common/Alerto"
import { LoadingScreen } from "../../../common/Loading"
import { useFetch } from "../../../hooks/useFetch"
import { useRouter } from "next/router"
import t from "../../../translations.json"

const getInitialSelectedIds = (items = []) =>
  items.filter((item) => item?.isActive || item?.isSelected || item?.active).map((item) => item.id)

const areSameIdSets = (first = [], second = []) => {
  if (first.length !== second.length) return false

  const sortedFirst = [...first].sort((a, b) => a - b)
  const sortedSecond = [...second].sort((a, b) => a - b)

  return sortedFirst.every((value, index) => value === sortedSecond[index])
}

const ShippingTypeGroup = ({
  title,
  emptyText,
  savingText,
  options,
  selectedIds,
  isSubmitting,
  groupKey,
  onToggle,
}) => (
  <div
    style={{
      backgroundColor: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 16,
      padding: 20,
      height: "100%",
    }}
  >
    <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
      <h6 className="f-b m-0">{title}</h6>
      {isSubmitting && <span style={{ color: "#6b7280", fontSize: 12, fontWeight: 500 }}>{savingText}</span>}
    </div>

    {options.length === 0 ? (
      <p className="m-0" style={{ color: "#6b7280" }}>
        {emptyText}
      </p>
    ) : (
      options.map((option) => {
        const inputId = `${groupKey}-${option.id}`

        return (
          <div
            key={option.id}
            style={{
              border: "1px solid #f3f4f6",
              borderRadius: 12,
              padding: "12px 14px",
            }}
            className="mb-2"
          >
            <label
              htmlFor={inputId}
              className="d-flex align-items-center gap-2 m-0"
              style={{ cursor: isSubmitting ? "not-allowed" : "pointer" }}
            >
              <input
                id={inputId}
                type="checkbox"
                checked={selectedIds.includes(option.id)}
                disabled={isSubmitting}
                onChange={() => onToggle(option.id)}
              />
              <span>{option.name}</span>
            </label>
          </div>
        )
      })
    )}
  </div>
)

const PreferredCompaniesGroup = ({
  title,
  emptyText,
  savingText,
  companies,
  selectedCodes,
  isSubmitting,
  onToggle,
}) => (
  <div
    style={{
      backgroundColor: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 16,
      padding: 20,
    }}
  >
    <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
      <h6 className="f-b m-0">{title}</h6>
      {isSubmitting && <span style={{ color: "#6b7280", fontSize: 12, fontWeight: 500 }}>{savingText}</span>}
    </div>

    {!companies || companies?.length === 0 ? (
      <p className="m-0 p-5 text-center fs-4" style={{ color: "#6b7280" }}>
        {emptyText}
      </p>
    ) : (
      <div className="row">
        {companies.map((company) => (
          <div className="col-lg-6 col-12" key={company.code}>
            <div className="form-group">
              <div className="form-control outer-check-input">
                <div className="form-check form-switch p-0 m-0">
                  <input
                    className="form-check-input m-0"
                    type="checkbox"
                    role="switch"
                    id={`delivery-company-${company.code}`}
                    checked={selectedCodes.includes(company.code)}
                    disabled={isSubmitting}
                    onChange={() => onToggle(company.code)}
                  />
                  <label htmlFor={`delivery-company-${company.code}`}>{company.name}</label>
                  <span className="bord" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)

const ShippingWithOnruf = () => {
  const { data: deliveryCompanies, isLoading: deliveryCompaniesLoading } = useFetch("/GetDeliveryCompaniesList")
  const { locale } = useRouter()
  const translate = (key) => pathOr("", [locale, "Shipping", key], t)
  const [deliveryTypes, setDeliveryTypes] = useState([])
  const [pickupDropoffTypes, setPickupDropoffTypes] = useState([])
  const [pickupDeliveryOptions, setPickupDeliveryOptions] = useState([])
  const [fixedShippingOptions, setFixedShippingOptions] = useState([])
  const [selectedDeliveryTypeIds, setSelectedDeliveryTypeIds] = useState([])
  const [selectedPickupDropoffTypeIds, setSelectedPickupDropoffTypeIds] = useState([])
  const [selectedOptions, setSelectedOptions] = useState([])
  const [savedSelectedOptions, setSavedSelectedOptions] = useState([])
  const [selectedDeliveryCompanyCodes, setSelectedDeliveryCompanyCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState({
    delivery: false,
    pickupDropoff: false,
    deliveryOptions: false,
    preferredCompanies: false,
  })
  console.log(deliveryCompanies.slice(1, 2))
  const fetchDeliveryTypes = useCallback(async () => {
    try {
      setLoading(true)
      const {
        data: {
          data: {
            deliveryTypes: fetchedDeliveryTypes = [],
            pickupDropoffTypes: fetchedPickupDropoffTypes = [],
            pickUpDeliveryOptions: fetchedPickupDeliveryOptions = [],
            fixedShippingOptions: fetchedFixedShippingOptions = [],
          } = {},
        } = {},
      } = await axios.get("/GetDeliveryOptions")

      setDeliveryTypes(fetchedDeliveryTypes)
      setPickupDropoffTypes(fetchedPickupDropoffTypes)
      setPickupDeliveryOptions(fetchedPickupDeliveryOptions)
      setFixedShippingOptions(fetchedFixedShippingOptions)
      setSelectedDeliveryTypeIds(getInitialSelectedIds(fetchedDeliveryTypes))
      setSelectedPickupDropoffTypeIds(getInitialSelectedIds(fetchedPickupDropoffTypes))
      const initialSelectedOptions = [
        ...getInitialSelectedIds(fetchedPickupDeliveryOptions),
        ...getInitialSelectedIds(fetchedFixedShippingOptions),
      ]

      setSelectedOptions(initialSelectedOptions)
      setSavedSelectedOptions(initialSelectedOptions)
    } catch (error) {
      Alerto(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDeliveryTypes()
  }, [fetchDeliveryTypes, locale])

  useEffect(() => {
    if (!Array.isArray(deliveryCompanies)) return

    setSelectedDeliveryCompanyCodes(
      deliveryCompanies.filter((company) => company?.IsPreferred).map((company) => company.code),
    )
  }, [deliveryCompanies])

  const handleSelectionChange = async ({ id, currentIds, setSelectedIds, submitKey, endpoint }) => {
    if (submitting[submitKey]) return

    const nextSelectedIds = currentIds.includes(id)
      ? currentIds.filter((currentId) => currentId !== id)
      : [...currentIds, id]

    setSelectedIds(nextSelectedIds)
    setSubmitting((prev) => ({
      ...prev,
      [submitKey]: true,
    }))

    try {
      await axios.post(endpoint, nextSelectedIds)
    } catch (error) {
      setSelectedIds(currentIds)
      Alerto(error)
    } finally {
      setSubmitting((prev) => ({
        ...prev,
        [submitKey]: false,
      }))
    }
  }

  const handleShippingOptions = (optionIndex) => {
    const primaryOptions = [1, 2, 3]
    const secondaryOptionIds = fixedShippingOptions.map((item) => item.id)
    let nextSelectedOptions = [...selectedOptions]
    const isSelected = nextSelectedOptions.includes(optionIndex)

    if (primaryOptions.includes(optionIndex)) {
      nextSelectedOptions = nextSelectedOptions.filter((value) => !primaryOptions.includes(value))
    }

    if (isSelected) {
      nextSelectedOptions = nextSelectedOptions.filter((value) => value !== optionIndex)
    } else {
      nextSelectedOptions = [...nextSelectedOptions, optionIndex]

      if (optionIndex === 1) {
        nextSelectedOptions = nextSelectedOptions.filter((value) => value < 4)
      }
    }

    if (!nextSelectedOptions.includes(2) && !nextSelectedOptions.includes(3)) {
      nextSelectedOptions = nextSelectedOptions.filter((value) => !secondaryOptionIds.includes(value))
    }

    setSelectedOptions(nextSelectedOptions)
  }

  const handleSaveShippingOptions = async () => {
    if (submitting.deliveryOptions) return

    const secondaryOptionIds = fixedShippingOptions.map((item) => item.id)
    const hasTwoOrThreeSelected = selectedOptions.includes(2) || selectedOptions.includes(3)
    const hasSelectedSecondaryOption = selectedOptions.some((value) => secondaryOptionIds.includes(value))

    if (hasTwoOrThreeSelected && !hasSelectedSecondaryOption) {
      toast.error(translate("pickAtLeastOneMarkedOption"))
      return
    }

    setSubmitting((prev) => ({
      ...prev,
      deliveryOptions: true,
    }))

    try {
      await axios.post("/AddBusinessAccounttDeliveryOptions", selectedOptions)
      setSavedSelectedOptions(selectedOptions)
    } catch (error) {
      Alerto(error)
    } finally {
      setSubmitting((prev) => ({
        ...prev,
        deliveryOptions: false,
      }))
    }
  }

  const handlePreferredCompanies = async (companyCode) => {
    if (submitting.preferredCompanies) return

    const nextSelectedCodes = selectedDeliveryCompanyCodes.includes(companyCode)
      ? selectedDeliveryCompanyCodes.filter((code) => code !== companyCode)
      : [...selectedDeliveryCompanyCodes, companyCode]

    const payload = (deliveryCompanies || [])
      .filter((company) => nextSelectedCodes.includes(company.code))
      .map((company) => ({
        name: company.name ?? company.Name,
        code: company.code ?? company.Code,
      }))

    setSelectedDeliveryCompanyCodes(nextSelectedCodes)
    setSubmitting((prev) => ({
      ...prev,
      preferredCompanies: true,
    }))

    try {
      await axios.post("/AddBusinessAccounttPreferedDeliveryCompanies", payload)
    } catch (error) {
      setSelectedDeliveryCompanyCodes(selectedDeliveryCompanyCodes)
      Alerto(error)
    } finally {
      setSubmitting((prev) => ({
        ...prev,
        preferredCompanies: false,
      }))
    }
  }

  if (loading || deliveryCompaniesLoading) {
    return <LoadingScreen height="320px" />
  }

  const isDeliveryOptionsDirty = !areSameIdSets(selectedOptions, savedSelectedOptions)

  return (
    <div className="row">
      <div className="col-lg-6 col-12 mb-4">
        <ShippingTypeGroup
          title={translate("deliveryTypes")}
          emptyText={translate("noOptionsFound")}
          savingText={translate("saving")}
          options={deliveryTypes}
          selectedIds={selectedDeliveryTypeIds}
          isSubmitting={submitting.delivery}
          groupKey="delivery-types"
          onToggle={(id) =>
            handleSelectionChange({
              id,
              currentIds: selectedDeliveryTypeIds,
              setSelectedIds: setSelectedDeliveryTypeIds,
              submitKey: "delivery",
              endpoint: "/AddBusinessAccountDeliveryTypes",
            })
          }
        />
      </div>

      <div className="col-lg-6 col-12 mb-4">
        <ShippingTypeGroup
          title={translate("pickupDropoffTypes")}
          emptyText={translate("noOptionsFound")}
          savingText={translate("saving")}
          options={pickupDropoffTypes}
          selectedIds={selectedPickupDropoffTypeIds}
          isSubmitting={submitting.pickupDropoff}
          groupKey="pickup-dropoff-types"
          onToggle={(id) =>
            handleSelectionChange({
              id,
              currentIds: selectedPickupDropoffTypeIds,
              setSelectedIds: setSelectedPickupDropoffTypeIds,
              submitKey: "pickupDropoff",
              endpoint: "/AddBusinessAccounttPickupDropoff",
            })
          }
        />
      </div>

      <div className="col-12 mb-4">
        <div
          style={{
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 20,
          }}
        >
          <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
            <h6 className="f-b m-0">{translate("shippingOptionsTitle")}</h6>
            {submitting.deliveryOptions && (
              <span style={{ color: "#6b7280", fontSize: 12, fontWeight: 500 }}>{translate("saving")}</span>
            )}
          </div>

          <div className="row">
            <div className="col-lg-6 col-12">
              {pickupDeliveryOptions.map((item) => (
                <div className="form-group" key={item.id}>
                  <div className="form-control outer-check-input">
                    <div className="form-check form-switch p-0 m-0">
                      <input
                        className="form-check-input m-0"
                        type="checkbox"
                        role="switch"
                        id={`${item.id}-shipping-options-settings`}
                        checked={selectedOptions.includes(item.id)}
                        disabled={submitting.deliveryOptions}
                        onChange={() => handleShippingOptions(item.id)}
                      />
                      <label htmlFor={`${item.id}-shipping-options-settings`}>{item.name}</label>
                      <span className="bord" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {(selectedOptions.includes(2) || selectedOptions.includes(3)) && (
              <div className="col-lg-6 col-12">
                {fixedShippingOptions.map((item) => (
                  <div className="form-group" key={item.id}>
                    <div className="form-control outer-check-input orange-border">
                      <div className="form-check form-switch p-0 m-0">
                        <input
                          className="form-check-input m-0"
                          type="checkbox"
                          role="switch"
                          id={`${item.id}-shipping-options-highlighted`}
                          checked={selectedOptions.includes(item.id)}
                          disabled={submitting.deliveryOptions}
                          onChange={() => handleShippingOptions(item.id)}
                        />
                        <label htmlFor={`${item.id}-shipping-options-highlighted`}>{item.name}</label>
                        <span className="bord" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isDeliveryOptionsDirty && (
            <div className="d-flex justify-content-end mt-3">
              <button
                type="button"
                className="btn-main"
                disabled={submitting.deliveryOptions}
                onClick={handleSaveShippingOptions}
              >
                {translate("save")}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="col-12 mb-4">
        <PreferredCompaniesGroup
          title={translate("preferredDeliveryCompanies")}
          emptyText={translate("noCompaniesFound")}
          savingText={translate("saving")}
          companies={deliveryCompanies || []}
          selectedCodes={selectedDeliveryCompanyCodes}
          isSubmitting={submitting.preferredCompanies}
          onToggle={handlePreferredCompanies}
        />
      </div>
    </div>
  )
}

export default ShippingWithOnruf
