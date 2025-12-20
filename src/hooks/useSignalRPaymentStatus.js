import { useEffect, useRef, useState } from "react"
import * as signalR from "@microsoft/signalr"

/**
 * Reusable SignalR hook focused on a single "payment status" message stream.
 *
 * @param {object} params
 * @param {string} params.hubUrl - Full hub URL (e.g. `${NEXT_PUBLIC_API_URL}/chatHub`)
 * @param {boolean} [params.enabled=true]
 * @param {string} [params.eventName="PaymentStatusMessage"] - SignalR event to listen to
 * @param {() => string | null | undefined} [params.accessTokenFactory] - Optional for auth-protected hubs
 * @param {boolean} [params.skipNegotiation] - If true, skips /negotiate (requires WebSockets transport)
 * @param {any} [params.transport] - signalR.HttpTransportType.WebSockets | LongPolling | ServerSentEvents
 * @param {Record<string, string>} [params.headers] - Optional extra headers (works for non-browser or some configs)
 * @param {object} [params.withUrlOptions] - Raw options passed to HubConnectionBuilder.withUrl
 * @param {(message: string) => void} [params.onMessage]
 * @param {keyof typeof signalR.LogLevel} [params.logLevel="Information"]
 */
export function useSignalRPaymentStatus({
  hubUrl,
  enabled = true,
  eventName = "PaymentStatusMessage",
  accessTokenFactory,
  skipNegotiation,
  transport,
  headers,
  withUrlOptions,
  onMessage,
  logLevel = "Information",
} = {}) {
  const [lastStatus, setLastStatus] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)

  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connectionRef = useRef(null)

  useEffect(() => {
    if (!enabled || !hubUrl) return undefined

    let didCancel = false

    const url = String(hubUrl)
    const options = { ...(withUrlOptions || {}) }
    if (accessTokenFactory) options.accessTokenFactory = accessTokenFactory
    if (typeof skipNegotiation === "boolean") options.skipNegotiation = skipNegotiation
    if (transport) {
      // Allow passing "WebSockets" | "LongPolling" | "ServerSentEvents" as a string from app code
      if (typeof transport === "string") {
        options.transport = signalR.HttpTransportType?.[transport] ?? transport
      } else {
        options.transport = transport
      }
    }
    if (headers) options.headers = headers

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(url, options)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel[logLevel] ?? signalR.LogLevel.Information)
      .build()

    connectionRef.current = connection

    connection.onclose((err) => {
      if (didCancel) return
      setIsConnected(false)
      if (err) setError(err)
    })

    connection.on(eventName, (message) => {
      if (didCancel) return
      setLastStatus(message)
      if (typeof onMessageRef.current === "function") onMessageRef.current(message)
    })
    ;(async () => {
      try {
        await connection.start()
        if (didCancel) return
        setIsConnected(true)
      } catch (e) {
        if (didCancel) return
        setError(e)
        setIsConnected(false)
      }
    })()

    return () => {
      didCancel = true
      try {
        connection.off(eventName)
      } catch (_) {
        // ignore
      }
      try {
        connection.stop()
      } catch (_) {
        // ignore
      }
    }
  }, [hubUrl, enabled, eventName, accessTokenFactory, skipNegotiation, transport, headers, withUrlOptions, logLevel])

  return { lastStatus, isConnected, error, connection: connectionRef.current }
}
