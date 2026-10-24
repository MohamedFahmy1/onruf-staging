import { pathOr } from "ramda"
import t from "../../translations.json"

const STATUS_NAMES = {
  1: "New",
  2: "Open",
  3: "InProgress",
  4: "PendingCustomer",
  5: "Resolved",
  6: "Closed",
  7: "Reopened",
  8: "OnHold",
  9: "Draft",
}

const PRIORITY_NAMES = {
  1: "Lowest",
  2: "Low",
  3: "Medium",
  4: "High",
  5: "Critical",
}

const REASON_NAMES = {
  1: "Solved",
  2: "Duplicate",
  3: "NoCustomerResponse",
  4: "OutOfScope",
  5: "InvalidRequest",
  6: "Spam",
  7: "CustomerWithdrew",
  8: "Escalated",
  9: "Other",
}

const enumKey = (value) =>
  String(value ?? "")
    .replace(/[\s_-]/g, "")
    .toLowerCase()

const enumValue = (value, names, translationKey) => {
  const number = Number(value)
  if (value !== null && value !== "" && names[number]) return number
  const key = enumKey(value)
  return (
    Number(
      Object.keys(names).find((id) => {
        return [
          names[id],
          ...["en", "ar"].map((locale) => pathOr("", [locale, "ContactUs", translationKey, id], t)),
        ].some((label) => enumKey(label) === key)
      }),
    ) || 0
  )
}

export const getTicketStatus = (ticket) =>
  enumValue(
    typeof ticket === "object" && ticket !== null ? ticket.status ?? ticket.statusName : ticket,
    STATUS_NAMES,
    "statuses",
  )

export const getStatusLabel = (status, locale = "ar") => {
  const id = getTicketStatus(status)
  return pathOr(String(status ?? ""), [locale === "en" ? "en" : "ar", "ContactUs", "statuses", String(id)], t)
}

export const getTicketPriority = (priority) => enumValue(priority, PRIORITY_NAMES, "priorities")

export const getPriorityLabel = (priority, locale = "ar") => {
  const id = getTicketPriority(priority)
  return pathOr(String(priority ?? ""), [locale === "en" ? "en" : "ar", "ContactUs", "priorities", String(id)], t)
}

export const getLookupLabel = (item, locale = "ar") => {
  if (!item) return ""
  return locale === "en" ? item.nameEn || item.name || item.nameAr || "" : item.nameAr || item.name || item.nameEn || ""
}

export const normalizeAttachment = (attachment) => {
  if (typeof attachment === "string") {
    return { id: attachment, filePath: attachment, fileName: attachment.split("/").pop(), fileSize: 0 }
  }
  return {
    ...attachment,
    id: attachment.id,
    filePath: attachment.filePath || "",
    fileName: attachment.fileName || attachment.filePath?.split("/").pop() || "",
    fileSize: Number(attachment.fileSize) || 0,
    isCommentAttachment: Boolean(attachment.isCommentAttachment),
  }
}

const getHistoryAction = (event) => {
  if (enumKey(event.eventType) !== "assignment") return ""
  if (["assign", "transfer", "unassign"].includes(event.action)) return event.action
  const note = typeof event.note === "string" ? event.note.trim() : ""
  if (/^Ticket unassigned$/i.test(note)) return "unassign"
  if (/^Ticket transferred to [^\r\n]+$/i.test(note)) return "transfer"
  if (/^Ticket assigned(?: to [^\r\n]+)?$/i.test(note)) return "assign"
  return ""
}

export const normalizeHistoryEvent = (event) => {
  // Retain only a known assignment action from machine-generated notes. Free
  // text has no customer visibility flag, including in embedded ticket history.
  const { note, ...publicEvent } = event
  return {
    ...publicEvent,
    action: getHistoryAction(event),
    fromStatus: event.fromStatus == null ? null : getTicketStatus(event.fromStatus),
    toStatus: event.toStatus == null ? null : getTicketStatus(event.toStatus),
    fromPriority: event.fromPriority == null ? null : enumValue(event.fromPriority, PRIORITY_NAMES, "priorities"),
    toPriority: event.toPriority == null ? null : enumValue(event.toPriority, PRIORITY_NAMES, "priorities"),
    reason: event.reason == null ? null : enumValue(event.reason, REASON_NAMES, "reasons"),
  }
}

export const normalizeTicket = (ticket) => {
  if (!ticket || typeof ticket !== "object" || Array.isArray(ticket)) return null
  const history = ticket.history || ticket.statusHistory || []
  return {
    ...ticket,
    id: ticket.id,
    referenceNumber: ticket.referenceNumber || "",
    problemTitle: ticket.problemTitle || "",
    meassageDetails: ticket.meassageDetails || ticket.messageDetails || "",
    messageDetails: ticket.meassageDetails || ticket.messageDetails || "",
    mobileNumber: ticket.mobileNumber || "",
    email: ticket.email || "",
    status: getTicketStatus(ticket),
    statusName: ticket.statusName || "",
    priority: enumValue(ticket.priority ?? ticket.priorityName, PRIORITY_NAMES, "priorities"),
    priorityName: ticket.priorityName || "",
    attachments: Array.isArray(ticket.attachments) ? ticket.attachments.filter(Boolean).map(normalizeAttachment) : [],
    history: Array.isArray(history) ? history.filter(Boolean).map(normalizeHistoryEvent) : [],
  }
}

export const normalizeComment = (comment) => {
  if (!comment || typeof comment !== "object" || Array.isArray(comment)) return null
  return {
    ...comment,
    body: comment.body || "",
    authorName: comment.createdByName || comment.authorName || "",
    authorUserId: comment.createdByUserId || comment.authorUserId || "",
    imagePath: comment.createdByImage || comment.imagePath || "",
    isCustomer: Boolean(comment.isFromCustomer ?? comment.isCustomer),
    attachments: Array.isArray(comment.attachments) ? comment.attachments.filter(Boolean).map(normalizeAttachment) : [],
  }
}

export const getTicketAuthor = (ticket, comments = []) => {
  const authorName = ticket?.customerName || ticket?.userName || ticket?.createdBy || ""
  const authorUserId = ticket?.customerUserId || ticket?.createdByUserId || ""
  const imagePath = ticket?.customerImage || ticket?.userImage || ticket?.createdByImage || ""
  const normalizeName = (name) =>
    String(name || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase()
  const matches = comments.filter((comment) => {
    if (!comment.isCustomer) return false
    if (authorUserId) return comment.authorUserId === authorUserId
    return !!authorName && normalizeName(comment.authorName) === normalizeName(authorName)
  })
  // The customer detail DTO has no avatar or owner ID. Use a matching customer
  // comment only when its identity is unambiguous; staff replies are excluded.
  const matchedIds = new Set(matches.map((comment) => comment.authorUserId).filter(Boolean))
  const authorComments = !authorUserId && matchedIds.size > 1 ? [] : matches
  return {
    authorName: authorName || authorComments.find((comment) => comment.authorName)?.authorName || "",
    authorUserId,
    imagePath: imagePath || authorComments.find((comment) => comment.imagePath)?.imagePath || "",
  }
}

export const getApiError = (error, fallback = "") => {
  const data = error?.response?.data
  return data?.message || data?.detail || data?.title || fallback || error?.message || ""
}

export const formatTicketDate = (value, locale = "ar", { withTime = false } = {}) => {
  const placeholder = pathOr("", [locale === "en" ? "en" : "ar", "ContactUs", "datePlaceholder"], t)
  if (!value) return placeholder
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return placeholder
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ar-EG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    numberingSystem: "latn",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date)
}

export const formatFileSize = (bytes, locale = "ar") => {
  const size = Number(bytes)
  if (!Number.isFinite(size) || size <= 0) return ""
  const units = pathOr([], [locale === "en" ? "en" : "ar", "ContactUs", "fileUnits"], t)
  if (!units.length) return ""
  const unit = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
  return `${Number((size / 1024 ** unit).toFixed(unit ? 1 : 0))} ${units[unit]}`
}

// The customer detail DTO has no status history. Keep the creation entry factual;
// additional events are shown only when the API actually supplies them.
export const getTicketTimeline = (ticket) => {
  if (!ticket) return []
  const history = Array.isArray(ticket.history) ? ticket.history.map(normalizeHistoryEvent) : []
  if (!history.some((event) => event.eventType === "Created") && ticket.createdAt) {
    history.push({
      id: `created-${ticket.id}`,
      eventType: "Created",
      changedAt: ticket.createdAt,
      changedByName: ticket.userName || "",
    })
  }
  return history.sort((a, b) => new Date(b.changedAt || 0) - new Date(a.changedAt || 0))
}
