import { NextResponse } from "next/server"

const authenticationParams = ["businessAccountId", "ProviderId", "Token", "UserId"]

export function proxy(request) {
  const { searchParams } = request.nextUrl
  const hasAuthenticationParams = authenticationParams.every((name) => searchParams.has(name))

  if (!hasAuthenticationParams) {
    return NextResponse.next()
  }

  const redirectUrl = process.env.NEXT_PUBLIC_BUSINESS_URL || new URL("/", request.url)
  const response = NextResponse.redirect(redirectUrl)

  for (const name of authenticationParams) {
    response.cookies.set(name, searchParams.get(name), {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })
  }

  return response
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
}
