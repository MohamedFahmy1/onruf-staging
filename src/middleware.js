import { NextResponse } from "next/server"

export default function middleware(req) {
  let url = req.url
  let domainName = process.env.NODE_ENV === "development" ? "http://localhost:3000/" : "https://onruf.vercel.app/"
  if (
    url.includes("businessAccountId") &&
    url.includes("ProviderId") &&
    url.includes("Token") &&
    url.includes("UserId")
  ) {
    let parsedUrl = new URL(url, domainName)
    let params = new URLSearchParams(parsedUrl.search)
    let businessAccountId = params.get("businessAccountId")
    let providerId = params.get("ProviderId")
    let token = params.get("Token")
    let userId = params.get("UserId")
    let cookies = []
    if (businessAccountId) {
      cookies.push(`businessAccountId=${businessAccountId}; Path=/;`)
    }
    if (providerId) {
      cookies.push(`ProviderId=${providerId}; Path=/;`)
    }
    if (token) {
      cookies.push(`Token=${token}; Path=/;`)
    }
    if (userId) {
      cookies.push(`UserId=${userId}; Path=/;`)
    }
    const response = NextResponse.redirect(domainName)
    for (let cookie of cookies) {
      response.headers.append("Set-Cookie", cookie)
    }
    return response
  }
  return NextResponse.next()
}
