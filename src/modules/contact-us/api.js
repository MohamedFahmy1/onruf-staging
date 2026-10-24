import axios from "axios"
import { multiFormData } from "../../common/axiosHeaders"
import { normalizeComment, normalizeHistoryEvent, normalizeTicket } from "./utils"

const unwrapResponse = (response) => {
  const payload = response.data
  if (Number(payload?.status_code) >= 400) {
    const error = new Error(payload.message || "Ticket request failed")
    error.response = response
    throw error
  }
  return payload && Object.prototype.hasOwnProperty.call(payload, "data") ? payload.data : payload
}

const getArray = (data) => (Array.isArray(data) ? data : [])

export const getContactUsLookups = async () => {
  const data = unwrapResponse(await axios.get("/GetContactUsLookups")) || {}
  return {
    communicationTypes: getArray(data.communicationTypes),
    categories: getArray(data.categories),
    subCategories: getArray(data.subCategories),
    statuses: getArray(data.statuses),
    reasons: getArray(data.reasons),
    priorities: getArray(data.priorities),
  }
}

export const listContactUs = async () => {
  const response = await axios.get("/ListContactUs", { params: { isAdmin: false } })
  const data = unwrapResponse(response)
  const tickets = getArray(data).map(normalizeTicket).filter(Boolean)
  return { tickets, totalRecords: Number(response.data?.totalRecords) || tickets.length }
}

export const getTicketDetails = async (id) => {
  return normalizeTicket(unwrapResponse(await axios.get("/GetContactUsById", { params: { id } })))
}

export const getTicketComments = async (ticketId) => {
  const data = unwrapResponse(await axios.get("/GetMyContactUsComments", { params: { ticketId } }))
  return getArray(data).map(normalizeComment).filter(Boolean)
}

export const getTicketHistory = async (ticketId) => {
  const baseURL = (axios.defaults.baseURL || process.env.NEXT_PUBLIC_API_URL || "").replace(
    /\/api\/v1\/?$/i,
    "/api/Tickets",
  )
  const data = unwrapResponse(await axios.get("/GetTicketStatusHistory", { baseURL, params: { ticketId } }))
  const eventTypes = ["Created", "Status", "Priority", "Assignment", "Attachment"]
  return getArray(data)
    .filter((event) => event && eventTypes.includes(event.eventType))
    .map(normalizeHistoryEvent)
}

export const saveContactUs = async (values, { saveAsDraft = false } = {}) => {
  const formData = new FormData()
  const fields = {
    Id: values.id || 0,
    TypeOfCommunication: values.typeOfCommunication || 0,
    CategoryId: values.categoryId || 0,
    SubCategoryId: values.subCategoryId || 0,
    ProblemTitle: values.problemTitle || "",
    MobileNumber: values.mobileNumber || "",
    Email: values.email || "",
    MeassageDetails: values.meassageDetails || values.messageDetails || "",
    SaveAsDraft: saveAsDraft,
  }
  Object.entries(fields).forEach(([key, value]) => formData.append(key, String(value)))
  Array.from(values.attachments || []).forEach((file) => formData.append("Attachments", file))
  const data = unwrapResponse(await axios.post("/AddEditContactUs", formData, multiFormData))
  return normalizeTicket(data)
}

export const addTicketComment = async ({ ticketId, body, attachments = [] }) => {
  const formData = new FormData()
  formData.append("TicketId", String(ticketId))
  formData.append("Body", body.trim())
  Array.from(attachments).forEach((file) => formData.append("Attachments", file))
  return normalizeComment(unwrapResponse(await axios.post("/AddMyContactUsComment", formData, multiFormData)))
}
