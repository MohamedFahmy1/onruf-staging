import style from "./Unauth.module.css"
import Logo from "../../../public/images/Logo2x.png"
import Image from "next/image"
import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { pathOr } from "ramda"
import { CircularProgress } from "@mui/material"
import t from "../../translations.json"

export const UnAuthorisedPage = () => {
  const { push, locale } = useRouter()
  const [message, setMessage] = useState(pathOr("", [locale, "navbar", "loading"], t))

  useEffect(() => {
    const timer = setTimeout(() => {
      setMessage(pathOr("", [locale, "navbar", "unauth"], t))
      push(process.env.NEXT_PUBLIC_WEBSITE)
    }, 3000)
    return () => clearTimeout(timer)
  }, [push])

  return (
    <main className={style.container}>
      <article className={style.content}>
        <Image src={Logo} alt="logo" height={150} width={300} priority />
        {message === pathOr("", [locale, "navbar", "loading"], t) && <CircularProgress className="main-color" />}
        <span className={style.text}>{message}</span>
      </article>
    </main>
  )
}
