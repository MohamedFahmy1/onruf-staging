import { useCallback, useEffect, useRef, useState } from "react"
import { FiCheckCircle, FiCopy, FiMap, FiMapPin, FiSearch } from "react-icons/fi"
import GoogleMaps from "../../../common/GoogleMaps"
import { getNeighborhoods, getRegions, lookupSpl } from "./api"
import { extractGoogleShortAddress, isSaudiCountry, isSaudiCountryCode, mapSplAddress } from "./accountUtils.mjs"
import styles from "./editAccount.module.css"

const locationFields = [
  "regionId",
  "region",
  "neighborhoodId",
  "neighborhood",
  "shortAddress",
  "buildingNumber",
  "street",
  "zipCode",
  "lat",
  "lon",
]

const googleGeocode = (request) =>
  new Promise((resolve, reject) => {
    if (!window.google?.maps?.Geocoder) {
      reject(new Error("googleLookupError"))
      return
    }
    new window.google.maps.Geocoder().geocode(request, (results, status) => {
      if (status === "OK" && Array.isArray(results) && results.length) resolve(results)
      else reject(new Error("googleLookupError"))
    })
  })

const BusinessAddress = ({ register, watch, setValue, countries = [], locale, copy, disabled, errors = {} }) => {
  const countryId = watch("countryId")
  const regionId = watch("regionId")
  const neighborhoodId = watch("neighborhoodId")
  const latitude = watch("lat")
  const longitude = watch("lon")
  const region = watch("region")
  const neighborhood = watch("neighborhood")
  const street = watch("street")
  const buildingNumber = watch("buildingNumber")
  const zipCode = watch("zipCode")
  const shortAddress = watch("shortAddress")
  const shortAddressCode = String(shortAddress || "")
    .trim()
    .toUpperCase()
  const country = countries.find((item) => String(item.id) === String(countryId))
  const isSaudi = isSaudiCountry(country)
  const [regions, setRegions] = useState([])
  const [neighborhoods, setNeighborhoods] = useState([])
  const [query, setQuery] = useState("")
  const [lookupLoading, setLookupLoading] = useState(false)
  const [error, setError] = useState("")
  const [mapError, setMapError] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [summary, setSummary] = useState(null)
  const [copied, setCopied] = useState(false)
  const requestId = useRef(0)
  const resolvedShortAddress = useRef("")
  const copyTimeout = useRef(null)

  useEffect(() => {
    if (country) {
      setValue("country", country.name)
      setValue("addressCountryCode", String(country.countryCode || ""))
      setValue("isSaudiLocation", isSaudi)
    }
  }, [country, isSaudi, setValue])

  useEffect(() => {
    requestId.current += 1
    setLookupLoading(false)
    return () => {
      requestId.current += 1
    }
  }, [countryId, locale])

  useEffect(() => () => clearTimeout(copyTimeout.current), [])

  useEffect(() => {
    let current = true
    setRegions([])
    if (countryId && country && !isSaudi) {
      getRegions(countryId, locale)
        .then((items) => current && setRegions(items))
        .catch(() => current && setError("lookupError"))
    }
    return () => {
      current = false
    }
  }, [countryId, country, isSaudi, locale])

  useEffect(() => {
    let current = true
    setNeighborhoods([])
    if (regionId && country && !isSaudi) {
      getNeighborhoods(regionId, locale)
        .then((items) => current && setNeighborhoods(items))
        .catch(() => current && setError("lookupError"))
    }
    return () => {
      current = false
    }
  }, [regionId, country, isSaudi, locale])

  const update = useCallback(
    (name, value) => setValue(name, value, { shouldDirty: true, shouldValidate: true }),
    [setValue],
  )

  const handleCountryChange = (event) => {
    const selected = countries.find((item) => String(item.id) === event.target.value)
    const countryCode = selected?.countryCode || event.currentTarget.selectedOptions[0]?.dataset.countryCode
    if (String(countryId) === event.target.value) {
      update("country", selected?.name || "")
      update("addressCountryCode", countryCode || "")
      update("isSaudiLocation", isSaudiCountryCode(countryCode))
      return
    }
    requestId.current += 1
    update("countryId", event.target.value)
    update("country", selected?.name || "")
    update("addressCountryCode", countryCode || "")
    update("isSaudiLocation", isSaudiCountryCode(countryCode))
    locationFields.forEach((name) => update(name, ""))
    setSummary(null)
    setQuery("")
    setError("")
    setMapError(false)
    setLookupLoading(false)
  }

  const applyAddress = useCallback(
    (address) => {
      resolvedShortAddress.current = `${locale}:${String(address.ShortAddress || "")
        .trim()
        .toUpperCase()}`
      Object.entries(mapSplAddress(address)).forEach(([name, value]) => update(name, value))
      setSummary(address)
    },
    [locale, update],
  )

  useEffect(() => {
    if (!isSaudi || !shortAddressCode || resolvedShortAddress.current === `${locale}:${shortAddressCode}`) return
    const currentRequest = ++requestId.current
    setLookupLoading(true)
    setError("")
    lookupSpl({ shortAddress: shortAddressCode, locale })
      .then((address) => {
        if (currentRequest === requestId.current) applyAddress(address)
      })
      .catch(() => {
        if (currentRequest === requestId.current) setError("lookupError")
      })
      .finally(() => {
        if (currentRequest === requestId.current) setLookupLoading(false)
      })
    return () => {
      if (currentRequest === requestId.current) requestId.current += 1
    }
  }, [applyAddress, isSaudi, locale, shortAddressCode])

  const fetchAddress = async (params, currentRequest) => {
    const address = await lookupSpl({ ...params, locale })
    if (currentRequest !== requestId.current) return
    if (!address) throw new Error("No address found")
    applyAddress(address)
  }

  const handleLocationSelect = async ({ lat, lng }) => {
    if (disabled) return
    const currentRequest = ++requestId.current
    update("lat", String(lat))
    update("lon", String(lng))
    setLookupLoading(true)
    setError("")
    try {
      const results = await googleGeocode({ location: { lat, lng } }).catch(() => [])
      if (currentRequest !== requestId.current) return
      const code = extractGoogleShortAddress(results)
      console.log(results)
      await fetchAddress({ shortAddress: code, lat, lng }, currentRequest)
    } catch (failure) {
      if (currentRequest === requestId.current)
        setError(["googleLookupError", "noBuildingAddress"].includes(failure.message) ? failure.message : "lookupError")
    } finally {
      if (currentRequest === requestId.current) setLookupLoading(false)
    }
  }

  const searchAddress = async () => {
    const addressQuery = query.trim()
    if (!addressQuery || disabled || lookupLoading) return
    const currentRequest = ++requestId.current
    setLookupLoading(true)
    setError("")
    try {
      if (/^[a-z]{4}\d{4}$/i.test(addressQuery)) {
        await fetchAddress({ shortAddress: addressQuery.toUpperCase() }, currentRequest)
      } else {
        if (!mapReady) throw new Error("googleLookupError")
        const results = await googleGeocode({
          address: addressQuery,
          componentRestrictions: { country: "SA" },
          region: "SA",
        })
        if (currentRequest !== requestId.current) return
        const result = results[0]
        const location = result?.geometry?.location
        if (!location) throw new Error("googleLookupError")
        const coordinates = { lat: location.lat(), lng: location.lng() }
        update("lat", String(coordinates.lat))
        update("lon", String(coordinates.lng))
        const code = extractGoogleShortAddress([result])
        console.log(result)
        await fetchAddress({ shortAddress: code, ...coordinates }, currentRequest)
      }
    } catch (failure) {
      if (currentRequest === requestId.current)
        setError(["googleLookupError", "noBuildingAddress"].includes(failure.message) ? failure.message : "lookupError")
    } finally {
      if (currentRequest === requestId.current) setLookupLoading(false)
    }
  }

  const onMapReady = useCallback((map) => {
    setMapReady(Boolean(map))
    if (map) setMapError(false)
  }, [])
  const onMapError = useCallback(() => setMapError(true), [])

  const fullAddress = [
    shortAddress,
    [buildingNumber, street].filter(Boolean).join(" "),
    summary?.AdditionalNumber,
    neighborhood,
    [summary?.City, zipCode].filter(Boolean).join(" "),
    country?.name,
  ]
    .filter(Boolean)
    .join(", ")
  const cityNeighborhood = [summary?.City, neighborhood].filter(Boolean).join(locale === "ar" ? "، " : ", ")

  const copyAddress = async (value) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      clearTimeout(copyTimeout.current)
      copyTimeout.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("copyError")
    }
  }

  const hiddenFields = [
    "country",
    "addressCountryCode",
    "isSaudiLocation",
    ...locationFields.filter((name) => isSaudi || !["regionId", "neighborhoodId"].includes(name)),
  ]

  return (
    <div>
      {hiddenFields.map((name) => (
        <input key={name} type="hidden" {...register(name)} />
      ))}
      <div className={styles.grid}>
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <div>
            <label className={styles.label} htmlFor="account-countryId">
              {copy("country")}
              <span style={{ color: "red", fontSize: "1.3rem" }}>*</span>
            </label>
            <div className={styles.inputGroup}>
              <span className={styles.inputIcon} aria-hidden="true">
                <FiMapPin />
              </span>
              <select
                {...register("countryId", { required: copy("required") })}
                id="account-countryId"
                className={`${styles.select} ${styles.countrySelect}`}
                onChange={handleCountryChange}
                disabled={disabled}
                aria-invalid={Boolean(errors.countryId)}
              >
                <option value="" disabled hidden>
                  {copy("selectOption")}
                </option>
                {countries.map((item) => (
                  <option key={item.id} value={item.id} data-country-code={item.countryCode}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            {errors.countryId && <span className={styles.fieldError}>{errors.countryId.message}</span>}
          </div>
        </div>
      </div>

      {error && (
        <div className={styles.grid}>
          <div className={`${styles.field} ${styles.fullWidth}`}>
            <div className={styles.errorBanner} role="alert">
              {copy(error)}
            </div>
          </div>
        </div>
      )}

      {isSaudi ? (
        <div className={styles.grid}>
          <div className={`${styles.field} ${styles.fullWidth}`}>
            <div className={styles.addressMap}>
              <div className={styles.addressSearch}>
                <label className="visually-hidden" htmlFor="account-addressSearch">
                  {copy("lookupPlaceholder")}
                </label>
                <input
                  id="account-addressSearch"
                  className={styles.input}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      searchAddress()
                    }
                  }}
                  placeholder={copy("lookupPlaceholder")}
                  disabled={disabled}
                />
                <button
                  type="button"
                  onClick={searchAddress}
                  disabled={disabled || lookupLoading || !query.trim()}
                  aria-label={copy("search")}
                >
                  <FiSearch aria-hidden="true" />
                </button>
              </div>
              <div className={styles.addressMapCanvas}>
                <GoogleMaps
                  lat={latitude}
                  lng={longitude}
                  height="100%"
                  zoom={latitude !== "" && latitude != null && longitude !== "" && longitude != null ? 16 : 10}
                  onLocationSelect={handleLocationSelect}
                  onReady={onMapReady}
                  onLoadError={onMapError}
                  loadingLabel={copy("mapLoading")}
                  errorLabel={copy("mapError")}
                />
              </div>
              {lookupLoading && <p role="status">{copy("lookupLoading")}</p>}
              {mapError && <p role="status">{copy("mapError")}</p>}
            </div>
          </div>

          <div className={`${styles.field} ${styles.fullWidth}`}>
            <div className={styles.addressSummary}>
              <div className={styles.addressSummaryHeader}>
                <span className={styles.addressSummaryStatus}>
                  <FiCheckCircle aria-hidden="true" />
                  {copy(summary || shortAddress ? "addressSelected" : "addressSummaryTitle")}
                </span>
                <button
                  type="button"
                  className={styles.copyButton}
                  onClick={() => copyAddress(shortAddress)}
                  disabled={!shortAddress}
                  aria-label={`${copy("copy")}: ${copy("shortAddress")}`}
                >
                  <FiCopy aria-hidden="true" />
                  <span dir={locale === "ar" ? "rtl" : "ltr"}>
                    {copy("shortAddress")}: <bdi>{shortAddress || "—"}</bdi>
                  </span>
                </button>
              </div>
              <div className={styles.summaryGrid}>
                {[
                  ["zipCode", zipCode],
                  ["buildingNumber", buildingNumber],
                  ["street", street],
                  ["cityNeighborhood", cityNeighborhood],
                ].map(([label, value]) => (
                  <div className={styles.summaryItem} key={label}>
                    <span className={styles.summaryLabel}>{copy(label)}:</span>
                    <p className={styles.summaryValue}>
                      <bdi>{value || "—"}</bdi>
                    </p>
                  </div>
                ))}
              </div>
              <div className={`${styles.summaryItem} ${styles.fullAddress}`}>
                <span className={styles.summaryLabel}>{copy("fullAddress")}:</span>
                <p className={styles.summaryValue}>
                  <bdi>{fullAddress || copy("noAddress")}</bdi>
                </p>
                {fullAddress && (
                  <button
                    type="button"
                    className={styles.fullAddressCopy}
                    onClick={() => copyAddress(fullAddress)}
                    aria-label={copy("copy")}
                  >
                    <FiCopy aria-hidden="true" />
                  </button>
                )}
              </div>
              {copied && (
                <span className="visually-hidden" role="status">
                  {copy("copied")}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={`${styles.grid} ${styles.regionGrid}`}>
          <div className={styles.field}>
            <div>
              <label className={styles.label} htmlFor="account-regionId">
                {copy("region")}
              </label>
              <div className={styles.inputGroup}>
                <span className={styles.inputIcon} aria-hidden="true">
                  <FiMap />
                </span>
                <select
                  {...register("regionId")}
                  id="account-regionId"
                  className={styles.select}
                  disabled={disabled || !countryId}
                  onChange={(event) => {
                    const selected = regions.find((item) => String(item.id) === event.target.value)
                    update("regionId", event.target.value)
                    update("region", selected?.name || "")
                    update("neighborhoodId", "")
                    update("neighborhood", "")
                  }}
                >
                  <option value="">{copy("selectOption")}</option>
                  {regionId && !regions.some((item) => String(item.id) === String(regionId)) && (
                    <option value={regionId}>{region}</option>
                  )}
                  {regions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className={styles.field}>
            <div>
              <label className={styles.label} htmlFor="account-neighborhoodId">
                {copy("neighborhood")}
              </label>
              <div className={styles.inputGroup}>
                <span className={styles.inputIcon} aria-hidden="true">
                  <FiMapPin />
                </span>
                <select
                  {...register("neighborhoodId")}
                  id="account-neighborhoodId"
                  className={styles.select}
                  disabled={disabled || !regionId}
                  onChange={(event) => {
                    const selected = neighborhoods.find((item) => String(item.id) === event.target.value)
                    update("neighborhoodId", event.target.value)
                    update("neighborhood", selected?.name || "")
                  }}
                >
                  <option value="">{copy("selectOption")}</option>
                  {neighborhoodId && !neighborhoods.some((item) => String(item.id) === String(neighborhoodId)) && (
                    <option value={neighborhoodId}>{neighborhood}</option>
                  )}
                  {neighborhoods.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BusinessAddress
