export const getRemainingTimeParts = (expireDate, now = Date.now()) => {
  const expiresAt = new Date(expireDate).getTime()
  const totalSeconds = Math.ceil((expiresAt - now) / 1000)

  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return []

  const parts = [
    { value: Math.floor(totalSeconds / 86400), unit: "day" },
    { value: Math.floor((totalSeconds % 86400) / 3600), unit: "hour" },
    { value: Math.floor((totalSeconds % 3600) / 60), unit: "minute" },
    { value: totalSeconds % 60, unit: "second" },
  ]

  return parts.filter(({ value }) => value > 0)
}
