import { useEffect } from "react"
import axios from "axios"
import { UnAuthorisedPage } from "../modules/404/Unauthorised"
import { useSelector, useDispatch } from "react-redux"
import { getTokensFromCookie } from "../appState/personalData/authActions"
import { Fragment } from "react"
import { useRouter } from "next/router"
import { fetchRoles } from "../appState/rolesSlice/rolesSlice"

export const AppWrapper = ({ children }) => {
  const { locale, pathname } = useRouter()
  const Token = useSelector((state) => state.authSlice.token)
  const buisnessAccountId = useSelector((state) => state.authSlice.buisnessId)
  const providerId = useSelector((state) => state.authSlice.providerId)
  const { loading = true } = useSelector((state) => state.roles)
  const dispatch = useDispatch()

  // set direction for all pages based on locale
  useEffect(() => {
    document.body.dir = locale === "ar" ? "rtl" : "ltr"
  }, [locale])

  // get tokens from cookie to store
  useEffect(() => {
    if (!Token || !buisnessAccountId || !providerId) {
      dispatch(getTokensFromCookie())
    }
  }, [dispatch, Token, buisnessAccountId, providerId])

  // set axios defaults
  axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL
  axios.defaults.headers.common["Authorization"] = Token
  axios.defaults.headers.common["Provider-Id"] = providerId
  axios.defaults.headers.common["Business-Account-Id"] = buisnessAccountId
  axios.defaults.headers.common["User-Language"] = locale
  axios.defaults.headers.common["Application-Source"] = "BusinessAccount"

  // fetch roles for the user
  useEffect(() => {
    dispatch(fetchRoles())
  }, [dispatch])

  if (loading) {
    return <UnAuthorisedPage />
  }

  let content
  if (pathname === `/en` || pathname === "/") {
    content = children
  } else if (Token && buisnessAccountId) {
    content = children
  } else {
    content = <UnAuthorisedPage />
  }
  return <Fragment>{content}</Fragment>
}
