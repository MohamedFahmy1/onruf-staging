import React, { useEffect, useMemo } from "react"
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api"

const MapUnavailable = ({ height, label, onLoadError, error }) => {
  useEffect(() => {
    onLoadError?.(error)
  }, [error, onLoadError])

  return (
    <div role="status" style={{ minHeight: height, display: "grid", placeItems: "center", padding: 20 }}>
      {label}
    </div>
  )
}

const missingKeyError = new Error("Google Maps API key is unavailable")

const LoadedGoogleMaps = ({
  apiKey,
  lat,
  lng,
  setLat,
  setLng,
  height,
  zoom,
  onLocationSelect,
  onReady,
  onLoadError,
  loadingLabel,
  errorLabel,
}) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
  })

  const hasCoordinates =
    lat !== "" &&
    lat != null &&
    lng !== "" &&
    lng != null &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng)) &&
    Math.abs(Number(lat)) <= 90 &&
    Math.abs(Number(lng)) <= 180
  const center = useMemo(
    () => (hasCoordinates ? { lat: Number(lat), lng: Number(lng) } : { lat: 24.7484774, lng: 46.7723477 }),
    [hasCoordinates, lat, lng],
  )

  // Handle map click to update lat and lng
  const handleMapClick = (event) => {
    const clickedLat = event.latLng.lat()
    const clickedLng = event.latLng.lng()

    // Update state using the passed setter functions
    if (setLat) setLat(clickedLat)
    if (setLng) setLng(clickedLng)
    onLocationSelect?.({ lat: clickedLat, lng: clickedLng })
  }

  if (loadError) {
    return <MapUnavailable height={height} label={errorLabel} error={loadError} onLoadError={onLoadError} />
  }

  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={{ height, width: "100%" }}
      center={center}
      zoom={zoom}
      onLoad={(map) => onReady?.(map)}
      onUnmount={() => onReady?.(null)}
      onClick={handleMapClick}
    >
      {(hasCoordinates || !onLocationSelect) && <Marker position={center} />}
    </GoogleMap>
  ) : (
    <div role="status" style={{ minHeight: height, display: "grid", placeItems: "center" }}>
      {loadingLabel}
    </div>
  )
}

const GoogleMaps = ({
  height = "250px",
  zoom = 10,
  loadingLabel = "Loading map…",
  errorLabel = "The map is unavailable.",
  ...props
}) => {
  const apiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY || process.env.REACT_APP_MAP_API_KEY
  if (!apiKey) {
    return <MapUnavailable height={height} label={errorLabel} error={missingKeyError} onLoadError={props.onLoadError} />
  }

  return (
    <LoadedGoogleMaps
      {...props}
      apiKey={apiKey}
      height={height}
      zoom={zoom}
      loadingLabel={loadingLabel}
      errorLabel={errorLabel}
    />
  )
}

export default React.memo(GoogleMaps)
