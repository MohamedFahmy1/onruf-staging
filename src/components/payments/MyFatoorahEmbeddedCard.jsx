import { useEffect, useMemo, useRef, useState } from "react"
import axios from "axios"
import { useSignalRPaymentStatus } from "../../hooks/useSignalRPaymentStatus"
import { useRouter } from "next/router"

function defaultMyFatoorahScriptSrc(environment) {
  // Kuwait live uses "portal.myfatoorah.com" per the docs (Kuwait/UAE/Bahrain/Jordan/Oman).
  if (environment === "live") return "https://portal.myfatoorah.com/payment/v1/session.js"
  return "https://demo.myfatoorah.com/payment/v1/session.js"
}

function loadScriptOnce(src) {
  if (typeof window === "undefined") return Promise.resolve()
  if (!src) return Promise.reject(new Error("Missing script src"))

  const existing = document.querySelector(`script[data-mf-session="true"][src="${src}"]`)
  if (existing) {
    if (window.myfatoorah) return Promise.resolve()
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", resolve, { once: true })
      existing.addEventListener("error", reject, { once: true })
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = src
    script.async = true
    script.defer = true
    script.setAttribute("data-mf-session", "true")
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load MyFatoorah session script: ${src}`))
    document.body.appendChild(script)
  })
}

function clearContainer(containerId) {
  if (typeof window === "undefined") return
  if (!containerId) return
  const el = document.getElementById(containerId)
  if (el) el.innerHTML = ""
}

function safeStringify(value) {
  try {
    return JSON.stringify(value)
  } catch (_) {
    try {
      return String(value)
    } catch (__) {
      return ""
    }
  }
}

function maskId(value) {
  if (!value) return ""
  const str = String(value)
  if (str.length <= 8) return str
  return `${str.slice(0, 4)}...${str.slice(-4)}`
}

function extractInitiateSessionData(apiResponse) {
  // Supports both:
  // - MyFatoorah raw response: { Data: { SessionId, CountryCode } }
  // - Your wrapper: { data: { data: { sessionId, countryCode } } }
  const root = apiResponse?.data ?? apiResponse

  const sessionId =
    root?.Data?.SessionId ??
    root?.data?.sessionId ??
    root?.data?.data?.sessionId ??
    root?.data?.data?.data?.sessionId ??
    root?.Data?.data?.sessionId ??
    null

  const countryCode =
    root?.Data?.CountryCode ??
    root?.data?.countryCode ??
    root?.data?.data?.countryCode ??
    root?.data?.data?.data?.countryCode ??
    root?.Data?.data?.countryCode ??
    null

  return { sessionId, countryCode }
}

function extractCallbackSessionId(cbResponse) {
  // MyFatoorah callback typically contains a session identifier; keep it flexible.
  return (
    cbResponse?.sessionId ?? cbResponse?.SessionId ?? cbResponse?.data?.sessionId ?? cbResponse?.Data?.SessionId ?? null
  )
}

function extractPaymentUrl(executeResponse) {
  const root = executeResponse?.data ?? executeResponse

  // Common direct shapes
  const direct =
    root?.Data?.PaymentURL ??
    root?.Data?.paymentUrl ??
    root?.Data?.PaymentUrl ??
    root?.PaymentURL ??
    root?.paymentUrl ??
    root?.PaymentUrl ??
    root?.data?.Data?.PaymentURL ??
    root?.data?.Data?.paymentUrl ??
    root?.data?.Data?.PaymentUrl ??
    root?.data?.PaymentURL ??
    root?.data?.paymentUrl ??
    root?.data?.PaymentUrl ??
    root?.data?.data?.Data?.PaymentURL ??
    root?.data?.data?.Data?.paymentUrl ??
    root?.data?.data?.Data?.PaymentUrl ??
    root?.data?.data?.PaymentURL ??
    root?.data?.data?.paymentUrl ??
    root?.data?.data?.PaymentUrl ??
    root?.data?.data?.data?.Data?.PaymentURL ??
    root?.data?.data?.data?.Data?.paymentUrl ??
    root?.data?.data?.data?.Data?.PaymentUrl ??
    root?.data?.data?.data?.PaymentURL ??
    root?.data?.data?.data?.paymentUrl ??
    root?.data?.data?.data?.PaymentUrl ??
    null
  if (direct) return direct

  // Fallback: walk object for a key that looks like paymentUrl
  const seen = new Set()
  const stack = [root]
  while (stack.length) {
    const cur = stack.pop()
    if (!cur || typeof cur !== "object") continue
    if (seen.has(cur)) continue
    seen.add(cur)

    for (const k of Object.keys(cur)) {
      const v = cur[k]
      if (typeof v === "string") {
        const key = String(k).toLowerCase()
        if (key === "paymenturl" || key === "payment_url" || key === "paymenturl3ds") return v
      }
      if (v && typeof v === "object") stack.push(v)
    }
  }

  return null
}

function deepMerge(a, b) {
  if (!b) return a
  const out = Array.isArray(a) ? [...a] : { ...(a || {}) }
  Object.keys(b).forEach((key) => {
    const av = out[key]
    const bv = b[key]
    if (bv && typeof bv === "object" && !Array.isArray(bv)) out[key] = deepMerge(av, bv)
    else out[key] = bv
  })
  return out
}

/**
 * Reusable MyFatoorah Embedded Card component (Card-only) with optional:
 * - Auto InitiateSession
 * - ExecutePayment (to get PaymentUrl)
 * - 3DS OTP iframe
 * - SignalR payment status listener
 */
export default function MyFatoorahEmbeddedCard({
  // Payment details
  amount,
  currencyCode = "KWD",
  language = "en",

  // Session init
  autoInitiateSession = true,
  initiateSessionEndpoint = "/InitiateSession",
  initiateSessionPayload,
  initiateSession, // optional async function override: () => ({ sessionId, countryCode, amount? })

  // MyFatoorah script
  environment = process.env.NEXT_PUBLIC_MYFATOORAH_ENV?.toString(), // "test" | "live"
  scriptSrc,

  // Embedded config
  containerId: containerIdProp,
  settings,
  onEmbeddedCallback,
  onReady,
  onError,
  showLoadingText = false,
  showSignalRStatusText = false,

  // Execute payment -> get PaymentUrl for 3DS
  executePayment, // async ({ sessionId, amount, response }) => ({ paymentUrl })
  onPaymentUrl,

  // 3DS OTP iframe
  iframeEnabled = true,
  iframeTitle = "3D Secure",
  iframeHeight = 560,
  iframeStyle,
  hideDefaultIframe = false,
  onIframeUrlChange,
  resetKey,
  closeIframeOn3DSMessage = false,
  on3DSRedirectUrl,

  // SignalR
  signalR = {},
  onPaymentStatus,
}) {
  const containerId = useMemo(
    () => containerIdProp || `mf-card-${Math.random().toString(16).slice(2)}`,
    [containerIdProp],
  )

  const [sessionData, setSessionData] = useState(null) // { sessionId, countryCode }
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [isScriptReady, setIsScriptReady] = useState(false)
  const [iframeUrl, setIframeUrl] = useState(null)
  const [last3dsUrl, setLast3dsUrl] = useState(null)
  const [hasPayStarted, setHasPayStarted] = useState(false)
  const { locale } = useRouter()
  const debug = !!signalR?.debug
  const log = (...args) => {
    if (!debug) return
    console.info("[MyFatoorahEmbeddedCard]", ...args)
  }

  const initKeyRef = useRef(null)
  const initiateKeyRef = useRef(null)
  const initiateInFlightRef = useRef(false)
  // Allow parent to force a full reset (useful after success/fail/cancel to restore the embedded button state)
  useEffect(() => {
    if (resetKey === undefined) return
    initKeyRef.current = null
    initiateKeyRef.current = null
    initiateInFlightRef.current = false
    setIframeUrl(null)
    setLast3dsUrl(null)
    setHasPayStarted(false)
    setSessionData(null)
    clearContainer(containerId)
  }, [resetKey])

  // Stabilize callback props to avoid re-running effects due to identity changes in parent renders
  const onErrorRef = useRef(onError)
  const onReadyRef = useRef(onReady)
  const onEmbeddedCallbackRef = useRef(onEmbeddedCallback)
  const onPaymentUrlRef = useRef(onPaymentUrl)
  const on3DSRedirectUrlRef = useRef(on3DSRedirectUrl)

  useEffect(() => {
    onErrorRef.current = onError
    onReadyRef.current = onReady
    onEmbeddedCallbackRef.current = onEmbeddedCallback
    onPaymentUrlRef.current = onPaymentUrl
    on3DSRedirectUrlRef.current = on3DSRedirectUrl
  }, [onError, onReady, onEmbeddedCallback, onPaymentUrl, on3DSRedirectUrl])

  const resolvedScriptSrc = scriptSrc || defaultMyFatoorahScriptSrc(environment)

  const resolvedHubUrl = useMemo(() => {
    if (signalR?.hubUrl) return signalR.hubUrl
    const base = process.env.NEXT_PUBLIC_API_URL
    if (!base) return ""
    return `${String(base).replace(/\/+$/, "")}/chatHub`
  }, [signalR?.hubUrl])

  const signalRStart = signalR?.start || "onMount" // "onMount" | "onPay" | "onPaymentUrl" | "manual"
  const [isSignalREnabled, setIsSignalREnabled] = useState(() => {
    if (signalR?.enabled === false) return false
    if (signalRStart === "onMount") return true
    return false
  })

  const DEFAULT_CARD_SETTINGS = {
    card: {
      style: {
        hideNetworkIcons: false,
        cardHeight: "250px",
        tokenHeight: "230px",
        input: {
          color: "#333333",
          fontSize: "15px",
          fontFamily: "Arial, sans-serif",
          inputHeight: "42px",
          inputMargin: "8px",
          borderColor: "#d1d5db",
          backgroundColor: "#ffffff",
          borderWidth: "1px",
          borderRadius: "8px",
          placeHolder: {
            holderName: locale === "en" ? "Card Holder Name" : "اسم صاحب البطاقة",
            cardNumber: locale === "en" ? "Card Number" : "رقم البطاقة",
            expiryDate: "MM/YY",
            securityCode: "CVV",
          },
        },
        label: {
          display: true,
          color: "#374151",
          fontSize: "14px",
          fontWeight: "bold",
          fontFamily: "Madani-Arabic-Regular, sans-serif",
          text: {
            holderName: "Card Holder Name",
            cardNumber: "Card Number",
            expiryDate: "Expiry Date",
            securityCode: "CVV",
          },
        },
        error: {
          borderColor: "#ef4444",
          borderRadius: "8px",
        },
        button: {
          useCustomButton: false,
          textContent: locale === "en" ? "Pay Now" : "ادفع الآن",
          fontSize: "18px",
          fontFamily: "serif",
          color: "#ffffff",
          backgroundColor: "#ee6c4d",
          height: "52px",
          borderRadius: "50px",
          width: "100%",
          margin: "16px auto 0 auto",
          cursor: "pointer",
        },
        text: {
          saveCard: "Save card for future payments",
          addCard: "Use another card",
          deleteAlert: {
            title: "Delete Card",
            message: "Are you sure you want to delete this card?",
            confirm: "Yes",
            cancel: "No",
          },
        },
      },
    },
  }

  useEffect(() => {
    // Allow parent to hard-disable
    if (signalR?.enabled === false) setIsSignalREnabled(false)
  }, [signalR?.enabled])

  useEffect(() => {
    if (signalR?.enabled === false) return
    if (signalRStart === "onPay") {
      if (!hasPayStarted) return
      setIsSignalREnabled(true)
      return
    }
    if (signalRStart === "onPaymentUrl") {
      if (!iframeUrl) return
      setIsSignalREnabled(true)
      return
    }
    if (signalRStart === "manual") {
      return
    }
    setIsSignalREnabled(true)
  }, [signalRStart, iframeUrl, hasPayStarted, signalR?.enabled])

  const { lastStatus } = useSignalRPaymentStatus({
    hubUrl: resolvedHubUrl,
    enabled: isSignalREnabled,
    eventName: signalR?.eventName || "PaymentStatusMessage",
    accessTokenFactory: signalR?.accessTokenFactory,
    skipNegotiation: signalR?.skipNegotiation,
    transport: signalR?.transport,
    headers: signalR?.headers,
    withUrlOptions: signalR?.withUrlOptions,
    onMessage: (message, eventName) => {
      if (typeof signalR?.onMessage === "function") signalR.onMessage(message, eventName)
      if (typeof onPaymentStatus === "function") onPaymentStatus(message, eventName)
    },
    logLevel: signalR?.logLevel || "Information",
    debug: signalR?.debug,
  })

  // Load MF script
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await loadScriptOnce(resolvedScriptSrc)
        if (!alive) return
        setIsScriptReady(true)
      } catch (e) {
        if (!alive) return
        setIsScriptReady(false)
        if (typeof onErrorRef.current === "function") onErrorRef.current(e)
      }
    })()
    return () => {
      alive = false
    }
  }, [resolvedScriptSrc])

  // InitiateSession
  useEffect(() => {
    if (!autoInitiateSession) return undefined
    if (sessionData?.sessionId) return undefined
    if (initiateInFlightRef.current) return undefined

    const key = `${initiateSessionEndpoint}|${typeof initiateSession === "function" ? "fn" : "http"}|${safeStringify(
      initiateSessionPayload,
    )}`
    if (initiateKeyRef.current === key) return undefined
    initiateKeyRef.current = key
    initiateInFlightRef.current = true

    let alive = true
    ;(async () => {
      setIsLoadingSession(true)
      try {
        let data
        if (typeof initiateSession === "function") {
          data = await initiateSession()
        } else {
          const res = await axios.post(initiateSessionEndpoint, initiateSessionPayload)
          data = extractInitiateSessionData(res)
        }
        if (!alive) return

        if (!data?.sessionId || !data?.countryCode) {
          throw new Error("InitiateSession did not return { sessionId, countryCode }")
        }
        setSessionData({ sessionId: data.sessionId, countryCode: data.countryCode })
        log("session initiated", { sessionId: maskId(data.sessionId), countryCode: data.countryCode })
      } catch (e) {
        if (!alive) return
        if (typeof onErrorRef.current === "function") onErrorRef.current(e)
        log("session init error", e)
      } finally {
        if (alive) setIsLoadingSession(false)
        initiateInFlightRef.current = false
      }
    })()

    return () => {
      alive = false
      initiateInFlightRef.current = false
    }
  }, [autoInitiateSession, sessionData?.sessionId, initiateSession, initiateSessionEndpoint, initiateSessionPayload])

  // Init embedded card once session + script are ready
  useEffect(() => {
    if (!isScriptReady) return
    if (!sessionData?.sessionId || !sessionData?.countryCode) return
    if (typeof window === "undefined") return
    if (!window.myfatoorah || typeof window.myfatoorah.init !== "function") return

    const computedSettings = deepMerge(DEFAULT_CARD_SETTINGS, settings?.card ? { card: settings.card } : settings)
    const initKey = [
      sessionData.sessionId,
      sessionData.countryCode,
      currencyCode,
      amount,
      language,
      containerId,
      JSON.stringify(computedSettings),
    ].join("|")

    if (initKeyRef.current === initKey) return
    initKeyRef.current = initKey

    // MF appends UI on re-init; ensure we never stack multiple embedded forms.
    clearContainer(containerId)

    const config = {
      sessionId: sessionData.sessionId,
      countryCode: sessionData.countryCode,
      currencyCode,
      amount,
      callback: (response) => {
        if (typeof onEmbeddedCallbackRef.current === "function") onEmbeddedCallbackRef.current(response)

        try {
          if (!response?.isSuccess) {
            log("embedded callback not successful", response)
            return
          }
          // User pressed Pay Now and MF accepted card input.
          setHasPayStarted(true)
          if (executePayment) {
            const cbSessionId = extractCallbackSessionId(response)
            if (!cbSessionId) throw new Error("MyFatoorah callback did not include a SessionId")
            log("executePayment requested", { sessionId: maskId(cbSessionId), amount })

            // IMPORTANT:
            // Do not `await` here — MF's embedded button can stay stuck in "Payment Loading"
            // while a returned promise is pending. Fire the backend call and handle results async.
            Promise.resolve(executePayment({ sessionId: cbSessionId, amount, response }))
              .then((result) => {
                const url = extractPaymentUrl(result)
                if (url) {
                  setIframeUrl(url)
                  log("payment url resolved", url)
                  if (typeof onIframeUrlChange === "function") onIframeUrlChange(url)
                  if (typeof onPaymentUrlRef.current === "function") onPaymentUrlRef.current(url, result)
                } else {
                  log("payment url missing", result)
                }
              })
              .catch((e) => {
                if (typeof onErrorRef.current === "function") onErrorRef.current(e)
                log("executePayment error", e)
              })
          }
        } catch (e) {
          if (typeof onErrorRef.current === "function") onErrorRef.current(e)
          log("embedded callback error", e)
        }
      },
      containerId,
      paymentOptions: ["Card"],
      language,
      settings: computedSettings,
    }

    try {
      window.myfatoorah.init(config)
      if (typeof onReadyRef.current === "function") onReadyRef.current({ sessionData, containerId })
    } catch (e) {
      if (typeof onErrorRef.current === "function") onErrorRef.current(e)
    }
  }, [isScriptReady, sessionData, currencyCode, amount, language, containerId, settings, executePayment])

  // 3DS postMessage listener (MF-3DSecure)
  useEffect(() => {
    if (!iframeEnabled) return undefined
    if (!iframeUrl) return undefined
    if (typeof window === "undefined") return undefined

    const handler = (event) => {
      if (!event?.data) return
      let message = event.data
      if (typeof message === "string") {
        try {
          message = JSON.parse(message)
        } catch (_) {
          return
        }
      }
      if (message?.sender !== "MF-3DSecure") return
      if (!message?.url) return

      setLast3dsUrl(message.url)
      if (typeof on3DSRedirectUrlRef.current === "function") on3DSRedirectUrlRef.current(message.url, message)
      if (closeIframeOn3DSMessage) setIframeUrl(null)
    }

    window.addEventListener("message", handler, false)
    return () => window.removeEventListener("message", handler, false)
  }, [iframeEnabled, iframeUrl, closeIframeOn3DSMessage])

  return (
    <div>
      <div id={containerId} />

      {showLoadingText && isLoadingSession && (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>Initializing payment session…</div>
      )}

      {iframeEnabled && iframeUrl && !hideDefaultIframe && (
        <div style={{ marginTop: 16 }}>
          <iframe
            title={iframeTitle}
            src={iframeUrl}
            style={{
              width: "100%",
              height: iframeHeight,
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              ...(iframeStyle || {}),
            }}
          />
        </div>
      )}

      {/* Optional tiny status UI (most apps will handle status via onPaymentStatus) */}
      {showSignalRStatusText && !!lastStatus && (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
          Status: <span style={{ fontWeight: 600 }}>{String(lastStatus)}</span>
          {!!last3dsUrl && <> • 3DS redirect received</>}
        </div>
      )}
    </div>
  )
}
