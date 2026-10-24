import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/router"
import { FiX } from "react-icons/fi"
import { pathOr } from "ramda"
import t from "../../translations.json"
import { parseNotificationDate } from "./api"
import useNotifications from "./useNotifications"
import styles from "./notifications.module.css"

const notificationUrl = (value) => {
  if (!value || typeof value !== "string") return null
  try {
    const url = new URL(value, window.location.origin)
    return ["http:", "https:"].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

const Notifications = () => {
  const { locale = "ar" } = useRouter()
  const [sortDirection, setSortDirection] = useState("desc")
  const [sortOpen, setSortOpen] = useState(false)
  const dropdownRef = useRef(null)
  const sortButtonRef = useRef(null)
  const sortOptionRefs = useRef([])
  const {
    items,
    unreadCount,
    hasMore,
    loading,
    loadError,
    countError,
    actionError,
    pendingId,
    markingAll,
    loadMore,
    retryCount,
    mutate,
  } = useNotifications(sortDirection)
  const busy = pendingId !== null || markingAll
  const sortOptions = [
    { value: "desc", label: pathOr("", [locale, "Notifications", "newest"], t) },
    { value: "asc", label: pathOr("", [locale, "Notifications", "oldest"], t) },
  ]

  useEffect(() => {
    const closeOutside = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setSortOpen(false)
    }
    document.addEventListener("mousedown", closeOutside)
    document.addEventListener("focusin", closeOutside)
    return () => {
      document.removeEventListener("mousedown", closeOutside)
      document.removeEventListener("focusin", closeOutside)
    }
  }, [])

  useEffect(() => {
    if (sortOpen) sortOptionRefs.current[sortDirection === "desc" ? 0 : 1]?.focus()
  }, [sortOpen, sortDirection])

  const closeSort = () => {
    setSortOpen(false)
    sortButtonRef.current?.focus()
  }

  const handleSortKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault()
      closeSort()
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault()
      const current = sortOptionRefs.current.indexOf(document.activeElement)
      const index =
        event.key === "Home" ? 0 : event.key === "End" ? 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + 2) % 2
      sortOptionRefs.current[index]?.focus()
    }
  }

  const handleOpen = async (event, item, href) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || item.isRead) return
    event.preventDefault()
    if (busy) return
    const result = await mutate("read", item)
    if (result !== null) window.location.assign(href)
  }

  return (
    <div className={styles.page} dir={locale === "en" ? "ltr" : "rtl"}>
      <div className={styles.toolbar}>
        <div className={styles.headingGroup}>
          <h1 className={styles.heading}>{pathOr("", [locale, "Notifications", "AllNotifications"], t)}</h1>
          {unreadCount !== null && (
            <span
              className={styles.badge}
              aria-label={`${unreadCount >= 99 ? "99+" : unreadCount} ${pathOr(
                "",
                [locale, "Notifications", "unread"],
                t,
              )}`}
            >
              <span dir="ltr">{unreadCount >= 99 ? "99+" : unreadCount}</span>
            </span>
          )}
        </div>
        <div className={styles.toolbarActions}>
          <button
            type="button"
            className={styles.outlineButton}
            disabled={busy || loading || unreadCount === 0}
            onClick={() => mutate("all")}
          >
            {markingAll
              ? pathOr("", [locale, "Notifications", "marking"], t)
              : pathOr("", [locale, "Notifications", "markAll"], t)}
          </button>
          <div className={styles.sortDropdown} ref={dropdownRef}>
            <button
              type="button"
              id="notification-sort-button"
              ref={sortButtonRef}
              className={`${styles.sortToggle} ${sortOpen ? styles.sortOpen : ""}`}
              disabled={busy}
              aria-haspopup="menu"
              aria-expanded={sortOpen}
              aria-controls="notification-sort-menu"
              aria-label={`${pathOr("", [locale, "Notifications", "sortBy"], t)}: ${
                sortOptions.find((option) => option.value === sortDirection).label
              }`}
              onClick={() => setSortOpen((open) => !open)}
              onKeyDown={(event) => {
                if (["ArrowDown", "ArrowUp"].includes(event.key)) {
                  event.preventDefault()
                  setSortOpen(true)
                }
              }}
            >
              {pathOr("", [locale, "Notifications", "sortBy"], t)}
              <span className={styles.sortChevron} aria-hidden="true" />
              <span className={styles.sortCaret} aria-hidden="true" />
            </button>
            {sortOpen && (
              <div
                className={styles.sortMenu}
                id="notification-sort-menu"
                role="menu"
                aria-labelledby="notification-sort-button"
                onKeyDown={handleSortKeyDown}
              >
                {sortOptions.map((option, index) => (
                  <button
                    type="button"
                    key={option.value}
                    ref={(element) => (sortOptionRefs.current[index] = element)}
                    role="menuitemradio"
                    aria-checked={sortDirection === option.value}
                    className={`${styles.sortOption} ${sortDirection === option.value ? styles.sortSelected : ""}`}
                    onClick={() => {
                      setSortDirection(option.value)
                      closeSort()
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.panel} aria-busy={loading}>
        {countError && (
          <div className={styles.error} role="alert">
            {pathOr("", [locale, "Notifications", "countError"], t)}{" "}
            <button type="button" className={styles.retryButton} disabled={busy} onClick={retryCount}>
              {pathOr("", [locale, "Notifications", "retry"], t)}
            </button>
          </div>
        )}
        {actionError && (
          <p className={styles.error} role="alert">
            {pathOr("", [locale, "Notifications", "actionError"], t)}
          </p>
        )}
        <ul className={styles.list}>
          {items.map((item) => {
            const date = parseNotificationDate(item.createdAt)
            const href = notificationUrl(item.url)
            const content = (
              <>
                <div className={styles.titleRow}>
                  {!item.isRead && (
                    <span
                      className={styles.unreadDot}
                      aria-label={pathOr("", [locale, "Notifications", "unread"], t)}
                    />
                  )}
                  <h2 className={styles.title}>{item.title}</h2>
                </div>
                <p className={styles.body}>{item.body}</p>
              </>
            )
            return (
              <li className={`${styles.card} ${!item.isRead ? styles.unread : ""}`} key={item.id}>
                {href ? (
                  <a className={styles.cardMain} href={href} onClick={(event) => handleOpen(event, item, href)}>
                    {content}
                  </a>
                ) : (
                  <div className={styles.cardMain}>{content}</div>
                )}
                <div className={styles.cardActions}>
                  {date && (
                    <time className={styles.date} dateTime={date.toISOString()} dir="ltr">
                      {date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </time>
                  )}
                  {!item.isRead && (
                    <button
                      type="button"
                      className={styles.readButton}
                      disabled={busy || loading}
                      onClick={() => mutate("read", item)}
                    >
                      {pendingId === item.id
                        ? pathOr("", [locale, "Notifications", "marking"], t)
                        : pathOr("", [locale, "Notifications", "markRead"], t)}
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.deleteButton}
                    disabled={busy || loading}
                    aria-label={`${pathOr("", [locale, "Notifications", "delete"], t)}: ${item.title}`}
                    onClick={() => mutate("delete", item)}
                  >
                    <FiX aria-hidden="true" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
        {loadError && (
          <div className={styles.error} role="alert">
            <p>{pathOr("", [locale, "Notifications", "loadError"], t)}</p>
            <button type="button" className={styles.retryButton} onClick={loadMore}>
              {pathOr("", [locale, "Notifications", "retry"], t)}
            </button>
          </div>
        )}
        {!loading && !loadError && items.length === 0 && (
          <p className={styles.status}>{pathOr("", [locale, "Notifications", "empty"], t)}</p>
        )}
        {loading && items.length === 0 && (
          <p className={styles.status} role="status">
            {pathOr("", [locale, "Notifications", "loading"], t)}
          </p>
        )}
        {hasMore && !loadError && (
          <div className={styles.footer}>
            <button type="button" className={styles.showMore} disabled={loading || busy} onClick={loadMore}>
              {loading && <span className={styles.spinner} aria-hidden="true" />}
              {loading
                ? pathOr("", [locale, "Notifications", "loading"], t)
                : pathOr("", [locale, "Notifications", "showMore"], t)}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Notifications
