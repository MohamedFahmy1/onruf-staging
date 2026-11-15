import axios from "axios"

export const searchOrdersAndProductsById = async (number, signal) => {
  const response = await axios.get("/SearchOrdersAndProductsById", {
    params: { number },
    signal,
  })
  const payload = response.data
  const hasErrorStatus =
    (payload?.status_code != null && Number(payload.status_code) !== 200) ||
    (payload?.status != null && payload.status !== "Success")
  const items = Array.isArray(payload) ? payload : payload?.data
  const hasValidItems =
    Array.isArray(items) &&
    items.every(
      (item) =>
        Number.isSafeInteger(item?.id) &&
        ["type", "name", "createdAt"].every((field) => item[field] == null || typeof item[field] === "string"),
    )

  if (hasErrorStatus || !hasValidItems) {
    const error = new Error(payload?.message || (hasErrorStatus ? "Search request failed" : "Invalid search response"))
    error.response = response
    throw error
  }

  return items
}
