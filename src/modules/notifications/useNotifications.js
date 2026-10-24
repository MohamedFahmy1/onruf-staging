import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/router"
import { useSelector } from "react-redux"
import {
  deleteNotification,
  getUnreadNotificationsCount,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "./api"

const initialState = {
  items: [],
  unreadCount: null,
  hasMore: false,
  loading: true,
  loadError: null,
  countError: null,
  actionError: null,
  pendingId: null,
  markingAll: false,
}

const isActive = (session, current) => session === current && !session.context.signal.aborted

const appendUnique = (previous, items) => {
  const ids = new Set(previous.map((item) => item.id))
  return [...previous, ...items.filter((item) => !ids.has(item.id) && ids.add(item.id))]
}

const useNotifications = (sortDirection) => {
  const { locale = "ar" } = useRouter()
  const { token, providerId, buisnessId: businessAccountId } = useSelector((state) => state.authSlice)
  const [inbox, setInbox] = useState(initialState)
  const sessionRef = useRef(null)

  const refreshCount = useCallback(async (session) => {
    const request = ++session.countRequest
    try {
      const unreadCount = await getUnreadNotificationsCount(session.context)
      if (isActive(session, sessionRef.current) && request === session.countRequest) {
        setInbox((previous) => ({ ...previous, unreadCount, countError: null }))
      }
    } catch (error) {
      if (isActive(session, sessionRef.current) && request === session.countRequest) {
        setInbox((previous) => ({ ...previous, countError: error }))
      }
    }
  }, [])

  const loadPage = useCallback(async (session) => {
    if (session.loading || session.busy || (session.page > 0 && !session.hasMore)) return
    session.loading = true
    setInbox((previous) => ({ ...previous, loading: true, loadError: null }))
    try {
      if (session.refillRequired) {
        const { items, hasMore } = await listNotifications(session.context, {
          pageIndex: session.page,
          sortDirection: session.sortDirection,
        })
        if (!isActive(session, sessionRef.current)) return
        session.refillRequired = false
        session.hasMore = hasMore
        setInbox((previous) => ({
          ...previous,
          items: appendUnique(previous.items, items),
          hasMore,
          actionError: null,
        }))
        if (!hasMore) return
      }
      const pageIndex = session.page + 1
      const { items, hasMore } = await listNotifications(session.context, {
        pageIndex,
        sortDirection: session.sortDirection,
      })
      if (!isActive(session, sessionRef.current)) return
      session.page = pageIndex
      session.hasMore = hasMore
      setInbox((previous) => ({ ...previous, items: appendUnique(previous.items, items), hasMore }))
    } catch (error) {
      if (isActive(session, sessionRef.current)) {
        setInbox((previous) => ({ ...previous, loadError: error }))
      }
    } finally {
      session.loading = false
      if (isActive(session, sessionRef.current)) {
        setInbox((previous) => ({ ...previous, loading: false }))
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const session = {
      context: { token, providerId, businessAccountId, locale, signal: controller.signal },
      sortDirection,
      page: 0,
      hasMore: false,
      loading: false,
      busy: false,
      countRequest: 0,
      refillRequired: false,
    }
    sessionRef.current = session
    setInbox({ ...initialState, loading: Boolean(token && providerId) })
    if (token && providerId) {
      loadPage(session)
      refreshCount(session)
    }
    return () => controller.abort()
  }, [token, providerId, businessAccountId, locale, sortDirection, loadPage, refreshCount])

  const loadMore = useCallback(() => {
    if (sessionRef.current) return loadPage(sessionRef.current)
  }, [loadPage])

  const retryCount = useCallback(() => {
    if (sessionRef.current && !sessionRef.current.busy) return refreshCount(sessionRef.current)
  }, [refreshCount])

  const mutate = useCallback(
    async (action, item) => {
      const session = sessionRef.current
      if (
        !session ||
        session.busy ||
        (session.loading && action !== "read") ||
        !isActive(session, sessionRef.current)
      ) {
        return null
      }
      session.busy = true
      session.countRequest++
      setInbox((previous) => ({
        ...previous,
        actionError: null,
        pendingId: item?.id ?? null,
        markingAll: action === "all",
      }))
      try {
        if (action === "read") await markNotificationAsRead(item.id, session.context)
        else if (action === "delete") await deleteNotification(item.id, session.context)
        else await markAllNotificationsAsRead(session.context)
        if (!isActive(session, sessionRef.current)) return null
        setInbox((previous) => ({
          ...previous,
          items:
            action === "delete"
              ? previous.items.filter((notification) => notification.id !== item.id)
              : previous.items.map((notification) =>
                  action === "all" || notification.id === item.id ? { ...notification, isRead: true } : notification,
                ),
          unreadCount:
            action === "all"
              ? 0
              : !item.isRead && previous.unreadCount !== null && previous.unreadCount < 99
              ? Math.max(0, previous.unreadCount - 1)
              : previous.unreadCount,
        }))
        refreshCount(session)
        if (action === "delete" && session.page > 0) {
          // Refill the last loaded page: deleting shifts the server's page offsets.
          session.refillRequired = true
          try {
            const { items, hasMore } = await listNotifications(session.context, {
              pageIndex: session.page,
              sortDirection: session.sortDirection,
            })
            if (isActive(session, sessionRef.current)) {
              session.refillRequired = false
              session.hasMore = hasMore
              setInbox((previous) => ({ ...previous, items: appendUnique(previous.items, items), hasMore }))
            }
          } catch (error) {
            if (isActive(session, sessionRef.current)) {
              setInbox((previous) => ({ ...previous, actionError: error }))
            }
          }
        }
        return true
      } catch (error) {
        if (!isActive(session, sessionRef.current)) return null
        setInbox((previous) => ({ ...previous, actionError: error }))
        refreshCount(session)
        return false
      } finally {
        session.busy = false
        if (isActive(session, sessionRef.current)) {
          setInbox((previous) => ({ ...previous, pendingId: null, markingAll: false }))
        }
      }
    },
    [refreshCount],
  )

  return { ...inbox, loadMore, retryCount, mutate }
}

export default useNotifications
