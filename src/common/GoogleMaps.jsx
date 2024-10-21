import React from "react"
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api"

const GoogleMaps = ({ lat = 30.028959315994314, lng = 31.259650022849446 }) => {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.REACT_APP_MAP_API_KEY,
  })

  const center = {
    lat,
    lng,
  }

  const [map, setMap] = React.useState(null)

  const onLoad = React.useCallback(
    function callback(map) {
      const bounds = new window.google.maps.LatLngBounds(center)
      map.fitBounds(bounds)
      setMap(map)
    },
    [center],
  )

  const onUnmount = React.useCallback(function callback(map) {
    setMap(null)
  }, [])

  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={{ height: "250px", width: "100%" }}
      center={center}
      zoom={10}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={(args) => console.log({ args }, args?.pixel)}
    >
      <Marker position={center} />
    </GoogleMap>
  ) : (
    <></>
  )
}

export default React.memo(GoogleMaps)
