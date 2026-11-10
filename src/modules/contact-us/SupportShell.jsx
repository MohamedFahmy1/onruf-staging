import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { FiMenu, FiX } from "react-icons/fi"
import { pathOr } from "ramda"
import t from "../../translations.json"
import styles from "./shell.module.css"

const SupportShell = ({ children }) => {
  const { pathname, asPath, locale } = useRouter()
  const [navigationOpen, setNavigationOpen] = useState(false)
  const isNotifications = pathname === "/notifications"

  useEffect(() => {
    setNavigationOpen(false)
  }, [asPath])

  // Support pages use the shared application shell without route-specific overrides.
  if (!isNotifications) return children

  return (
    <div
      className={`${styles.notificationsShell} ${navigationOpen ? styles.navigationOpen : ""}`}
      dir={locale === "en" ? "ltr" : "rtl"}
    >
      <button
        type="button"
        className={styles.mobileMenuButton}
        aria-label={pathOr("", [locale, "navbar", navigationOpen ? "closeNavigation" : "openNavigation"], t)}
        aria-expanded={navigationOpen}
        onClick={() => setNavigationOpen((open) => !open)}
      >
        {navigationOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
      </button>
      {navigationOpen && (
        <button
          type="button"
          className={styles.backdrop}
          onClick={() => setNavigationOpen(false)}
          aria-label={pathOr("", [locale, "navbar", "closeNavigation"], t)}
        />
      )}
      {children}
    </div>
  )
}

export default SupportShell
