import {
  FiActivity,
  FiAlertTriangle,
  FiArrowDownCircle,
  FiArrowUpCircle,
  FiCheckCircle,
  FiChevronsDown,
  FiFileText,
  FiFlag,
  FiHelpCircle,
  FiLoader,
  FiLock,
  FiMessageCircle,
  FiMinusCircle,
  FiPauseCircle,
  FiPlusSquare,
  FiRadio,
  FiRefreshCw,
  FiRepeat,
  FiRotateCcw,
  FiStar,
  FiTag,
  FiUser,
  FiUserMinus,
  FiZap,
} from "react-icons/fi"
import { pathOr } from "ramda"
import t from "../../translations.json"
import { getPriorityLabel, getStatusLabel, getTicketPriority, getTicketStatus } from "./utils"

const statusStyles = {
  1: { Icon: FiStar, tone: "statusNew" },
  2: { Icon: FiRadio, tone: "statusOpen" },
  3: { Icon: FiLoader, tone: "statusInProgress" },
  4: { Icon: FiMessageCircle, tone: "statusPendingCustomer" },
  5: { Icon: FiCheckCircle, tone: "statusResolved" },
  6: { Icon: FiLock, tone: "statusClosed" },
  7: { Icon: FiRotateCcw, tone: "statusReopened" },
  8: { Icon: FiPauseCircle, tone: "statusOnHold" },
  9: { Icon: FiFileText, tone: "statusDraft" },
}

const priorityStyles = {
  1: { Icon: FiChevronsDown, tone: "priorityLowest" },
  2: { Icon: FiArrowDownCircle, tone: "priorityLow" },
  3: { Icon: FiMinusCircle, tone: "blue" },
  4: { Icon: FiArrowUpCircle, tone: "purple" },
  5: { Icon: FiZap, tone: "red" },
}

export const getTimelinePresentation = (item, locale = "ar") => {
  const text = (key) => pathOr("", [locale === "en" ? "en" : "ar", "ContactUs", "timeline", key], t)
  const event = String(item.eventType || "Status")
    .replace(/[\s_-]/g, "")
    .toLowerCase()
  const label = item.label

  if (event === "created") {
    return { Icon: FiPlusSquare, tone: "created", text: label || text("created") }
  }

  if (event === "attachment") {
    return { Icon: FiTag, tone: "coral", text: label || text("attachmentsUpdated") }
  }

  if (event === "assignment" || event === "transfer") {
    if (event === "transfer" || item.action === "transfer") {
      return { Icon: FiRepeat, tone: "blue", text: label || text("transferred") }
    }
    if (item.action === "unassign") {
      return {
        Icon: FiUserMinus,
        tone: "unassigned",
        text: label || text("unassigned"),
      }
    }
    return {
      Icon: FiUser,
      tone: "yellow",
      text: label || (item.action === "assign" ? text("assigned") : text("assignmentUpdated")),
    }
  }

  if (event === "priority") {
    const value = item.toPriority || item.toPriorityName
    const priority = getTicketPriority(value)
    const priorityLabel = getPriorityLabel(value, locale)
    return {
      ...(priorityStyles[priority] || { Icon: FiFlag, tone: "purple" }),
      text:
        label ||
        (priorityLabel ? text("priorityChangedTo").replace("{priority}", priorityLabel) : text("priorityUpdated")),
    }
  }

  if (event === "escalated" || item.reason === 8 || String(item.reason).toLowerCase() === "escalated") {
    return { Icon: FiAlertTriangle, tone: "red", text: label || text("escalated") }
  }

  if (["updated", "edited", "detailsupdated"].includes(event)) {
    return {
      Icon: FiRefreshCw,
      tone: "green",
      text: label || text("detailsUpdated"),
    }
  }

  if (event === "status") {
    const value = item.toStatus || item.toStatusName
    const status = getTicketStatus(value)
    const previousStatus = getTicketStatus(item.fromStatus || item.fromStatusName)
    if (status && previousStatus === status) {
      return {
        Icon: FiRefreshCw,
        tone: "green",
        text: label || text("detailsUpdated"),
      }
    }
    if (statusStyles[status]) {
      return {
        ...statusStyles[status],
        text: label || text("statusChangedTo").replace("{status}", getStatusLabel(status, locale)),
      }
    }
    return {
      Icon: value ? FiHelpCircle : FiRefreshCw,
      tone: value ? "neutral" : "green",
      text:
        label ||
        (value ? text("statusChangedTo").replace("{status}", getStatusLabel(value, locale)) : text("statusUpdated")),
    }
  }

  return { Icon: FiActivity, tone: "neutral", text: label || text("activityUpdated") }
}
