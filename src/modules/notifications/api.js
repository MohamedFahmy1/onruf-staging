import axios from "axios"

const getRequestConfig = ({ token, providerId, businessAccountId, locale = "ar", signal } = {}) => {
  const accountId = businessAccountId == null || businessAccountId === "" ? 0 : Number(businessAccountId)
  if (!Number.isSafeInteger(accountId) || accountId < 0) {
    throw new Error("A valid business account is required to load notifications")
  }
  if (!token || !providerId) {
    throw new Error("Sign in to load notifications")
  }

  const authorization = String(token).trim()
  return {
    headers: {
      Authorization: /^Bearer\s/i.test(authorization) ? authorization : `Bearer ${authorization}`,
      "Provider-Id": String(providerId),
      "Business-Account-Id": String(accountId),
      "User-Language": String(locale).toLowerCase().startsWith("ar") ? "ar" : "en",
    },
    signal,
  }
}

const requestNotifications = async (url, context, { method = "post", params } = {}) => {
  const response = await axios.request({ url, method, params, ...getRequestConfig(context) })
  const payload = response.data

  // These endpoints can return HTTP 200 with an error in the response body.
  if (Number(payload?.status_code) !== 200 || payload?.status !== "Success") {
    const error = new Error(payload?.message || "Notification request failed")
    error.response = response
    throw error
  }

  return payload
}

export const listNotifications = async (context, { pageIndex = 1, pageSize = 10, sortDirection = "desc" } = {}) => {
  if (!Number.isInteger(pageIndex) || pageIndex < 1 || !Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error("A positive notification page and page size are required")
  }

  const payload = await requestNotifications("/ListNotifications", context, {
    params: {
      pageIndex,
      PageRowsCount: pageSize,
      SortDirection: sortDirection === "asc" ? "asc" : "desc",
    },
  })
  return {
    items: Array.isArray(payload.data) ? payload.data : [],
    hasMore: Number(payload.numberOfPages) > pageIndex,
  }
}

export const getUnreadNotificationsCount = async (context) => {
  const payload = await requestNotifications("/UnreadNotificationsCount", context)
  const count = Number(payload.data)
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
}

export const markNotificationAsRead = async (id, context) => {
  await requestNotifications("/MarkNotificationAsRead", context, { params: { id } })
}

export const markAllNotificationsAsRead = async (context) => {
  let totalMarked = 0
  let marked
  do {
    const payload = await requestNotifications("/MarkAllNotificationsAsRead", context)
    marked = Number(payload.data) || 0
    totalMarked += marked
    // The server marks at most 50,000 items per request.
  } while (marked === 50000)
  return totalMarked
}

export const deleteNotification = async (id, context) => {
  await requestNotifications("/DeleteNotifications", context, { method: "delete", params: { id } })
}

export const parseNotificationDate = (value) => {
  if (!value) return null
  const timestamp = String(value)
  // The API returns UTC timestamps without a trailing Z.
  const utcTimestamp = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp) ? timestamp : `${timestamp}Z`
  const date = new Date(utcTimestamp)
  return Number.isNaN(date.getTime()) ? null : date
}
