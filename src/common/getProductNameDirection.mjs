export const getProductNameDirection = (name) => {
  const firstWord = name?.trim().split(/\s+/, 1)[0] || ""
  return /\p{Script=Arabic}/u.test(firstWord) ? "rtl" : "ltr"
}
