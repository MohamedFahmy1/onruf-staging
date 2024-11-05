import React from "react"
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api"

const GoogleMaps = ({ lat, lng, setLat, setLng }) => {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.REACT_APP_MAP_API_KEY,
  })

  const center = {
    lat: lat || 24.7484774,
    lng: lng || 46.7723477,
  }

  const [map, setMap] = React.useState(null)

  const onLoad = React.useCallback(
    (map) => {
      const bounds = new window.google.maps.LatLngBounds(center)
      map.fitBounds(bounds)
      setMap(map)
    },
    [center],
  )

  const onUnmount = React.useCallback(() => {
    setMap(null)
  }, [])

  // Handle map click to update lat and lng
  const handleMapClick = (event) => {
    const clickedLat = event.latLng.lat()
    const clickedLng = event.latLng.lng()

    // Update state using the passed setter functions
    if (setLat) setLat(clickedLat)
    if (setLng) setLng(clickedLng)
  }

  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={{ height: "250px", width: "100%" }}
      center={center}
      zoom={10}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={handleMapClick}
    >
      <Marker position={center} />
    </GoogleMap>
  ) : (
    <></>
  )
}

export default React.memo(GoogleMaps)
