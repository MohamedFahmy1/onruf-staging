import React, { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/router"
import Image from "next/image"
import { pathOr } from "ramda"
import t from "../../translations.json"
import {
  FiBold,
  FiChevronDown,
  FiCornerUpLeft,
  FiCornerUpRight,
  FiEdit,
  FiImage,
  FiItalic,
  FiLink,
  FiList,
  FiPaperclip,
  FiPlus,
  FiVideo,
  FiX,
} from "react-icons/fi"
import { addTicketComment, getTicketComments, getTicketDetails, getTicketHistory } from "./api"
import {
  formatFileSize,
  formatTicketDate,
  getApiError,
  getStatusLabel,
  getTicketStatus,
  getTicketTimeline,
  getTicketAuthor,
} from "./utils"
import { getTimelinePresentation } from "./timelinePresentation"
import styles from "./details.module.css"

const safeAttachmentUrl = (value) => {
  if (!value || typeof value !== "string") return null
  if (/^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value)) return value
  return null
}

const AuthorAvatar = ({ name, imagePath }) => {
  const avatarUrl = safeAttachmentUrl(imagePath)
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
  return (
    <span className={styles.avatar} aria-hidden="true">
      {avatarUrl ? <Image src={avatarUrl} alt="" width={30} height={30} unoptimized /> : initials}
    </span>
  )
}

// Keep the editor's lightweight formatting readable without rendering untrusted HTML.
const inlineText = (text) =>
  String(text || "")
    .split(/(\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>
      if (part.startsWith("_") && part.endsWith("_")) return <em key={index}>{part.slice(1, -1)}</em>
      const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/)
      if (link)
        return (
          <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer">
            {link[1]}
          </a>
        )
      return part
    })

const CommentBody = ({ body }) => (
  <div className={styles.commentBody}>
    {String(body || "")
      .split(/\r?\n/)
      .map((line, index) => {
        if (line.startsWith("> ")) return <blockquote key={index}>{inlineText(line.slice(2))}</blockquote>
        if (line.startsWith("## "))
          return (
            <strong className={styles.bodyHeading} key={index}>
              {inlineText(line.slice(3))}
            </strong>
          )
        return <div key={index}>{inlineText(line) || <br />}</div>
      })}
  </div>
)

const Attachments = ({ attachments, locale }) => (
  <div className={styles.attachments}>
    {(attachments || []).map((file, index) => {
      const href = safeAttachmentUrl(file.filePath)
      if (!href) return null
      return (
        <a
          key={file.id || `${file.fileName}-${index}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.attachmentLink}
        >
          <FiPaperclip aria-hidden="true" />
          <span>{file.fileName || pathOr("", [locale, "ContactUs", "details", "attachmentName"], t)}</span>
          {Number(file.fileSize) > 0 && (
            <span className={styles.fileSize}>{formatFileSize(file.fileSize, locale)}</span>
          )}
        </a>
      )
    })}
  </div>
)

const ContactUsDetails = () => {
  const router = useRouter()
  const locale = router.locale === "en" ? "en" : "ar"
  const words = pathOr({}, [locale, "ContactUs", "details"], t)
  const ticketId = typeof router.query.id === "string" ? router.query.id : ""
  const [ticket, setTicket] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [ticketError, setTicketError] = useState("")
  const [commentsError, setCommentsError] = useState("")
  const [refresh, setRefresh] = useState(0)
  const [body, setBody] = useState("")
  const [files, setFiles] = useState([])
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState("")
  const [replyingTo, setReplyingTo] = useState("")
  const [editorHistory, setEditorHistory] = useState([""])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [paragraphStyle, setParagraphStyle] = useState("")
  const textareaRef = useRef(null)
  const attachmentRef = useRef(null)
  const imageRef = useRef(null)
  const videoRef = useRef(null)
  const activeTicketRef = useRef(ticketId)
  activeTicketRef.current = ticketId

  useEffect(() => {
    setTicket(null)
    setComments([])
    setBody("")
    setFiles([])
    setReplyingTo("")
    setSendError("")
    setSending(false)
    setEditorHistory([""])
    setHistoryIndex(0)
    setParagraphStyle("")
  }, [ticketId])

  useEffect(() => {
    if (!router.isReady || !ticketId) return undefined
    let active = true
    setLoading(true)
    setTicketError("")
    setCommentsError("")
    Promise.allSettled([getTicketDetails(ticketId), getTicketComments(ticketId)]).then(([details, replies]) => {
      if (!active) return
      if (details.status === "fulfilled" && details.value) {
        setTicket(details.value)
        // Retrieve the structured history only after the customer detail endpoint
        // has confirmed access to this ticket. History may be unavailable by role.
        getTicketHistory(ticketId)
          .then((history) => {
            if (active && history.length) setTicket({ ...details.value, history })
          })
          .catch(() => {})
      } else {
        setTicket(null)
        setTicketError(getApiError(details.reason, words.ticketError))
      }
      if (replies.status === "fulfilled") setComments(replies.value)
      else setCommentsError(getApiError(replies.reason, words.commentsError))
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [router.isReady, ticketId, locale, refresh])

  const timeline = useMemo(() => {
    if (!ticket) return []
    return [...getTicketTimeline(ticket)].sort(
      (a, b) => new Date(b.changedAt || b.createdAt || 0) - new Date(a.changedAt || a.createdAt || 0),
    )
  }, [ticket])
  const ticketAuthor = useMemo(() => getTicketAuthor(ticket, comments), [ticket, comments])

  const editBody = (value) => {
    setBody(value)
    setSendError("")
    const nextHistory = editorHistory.slice(0, historyIndex + 1)
    if (nextHistory[nextHistory.length - 1] !== value) nextHistory.push(value)
    setEditorHistory(nextHistory)
    setHistoryIndex(nextHistory.length - 1)
  }

  const insertFormatting = (prefix, suffix = "", fallback = "") => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = body.slice(start, end) || fallback
    editBody(`${body.slice(0, start)}${prefix}${selected}${suffix}${body.slice(end)}`)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length)
    })
  }

  const prefixLines = (prefix, remove = false) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = body.lastIndexOf("\n", Math.max(0, textarea.selectionStart - 1)) + 1
    const nextBreak = body.indexOf("\n", textarea.selectionEnd)
    const end = nextBreak < 0 ? body.length : nextBreak
    const lines = body.slice(start, end).split("\n")
    editBody(
      `${body.slice(0, start)}${lines
        .map((line, i) =>
          remove
            ? line.replace(typeof remove === "string" ? /^## / : /^ {1,2}/, "")
            : `${typeof prefix === "function" ? prefix(i) : prefix}${line}`,
        )
        .join("\n")}${body.slice(end)}`,
    )
    requestAnimationFrame(() => textarea.focus())
  }

  const undo = (direction) => {
    const nextIndex = historyIndex + direction
    if (nextIndex < 0 || nextIndex >= editorHistory.length) return
    setHistoryIndex(nextIndex)
    setBody(editorHistory[nextIndex])
    textareaRef.current?.focus()
  }

  const addFiles = (event) => {
    const selected = Array.from(event.target.files || [])
    setFiles((current) => [
      ...current,
      ...selected.filter(
        (file) =>
          !current.some(
            (item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified,
          ),
      ),
    ])
    event.target.value = ""
  }

  const handleReply = (comment) => {
    const name = comment.authorName || (comment.isCustomer ? words.customer : words.support)
    setReplyingTo(name)
    textareaRef.current?.focus()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (sending) return
    if (!body.trim()) {
      setSendError(words.bodyRequired)
      textareaRef.current?.focus()
      return
    }
    setSending(true)
    setSendError("")
    const submittingTicketId = ticketId
    try {
      const replyBody = replyingTo ? `${words.replying} ${replyingTo}:\n${body.trim()}` : body.trim()
      const comment = await addTicketComment({ ticketId: ticket.id || ticketId, body: replyBody, attachments: files })
      if (activeTicketRef.current !== submittingTicketId) return
      if (comment && comment.id) setComments((current) => [...current, comment])
      setBody("")
      setEditorHistory([""])
      setHistoryIndex(0)
      setParagraphStyle("")
      setFiles([])
      setReplyingTo("")
      setRefresh((value) => value + 1)
    } catch (error) {
      if (activeTicketRef.current === submittingTicketId) setSendError(getApiError(error, words.sendError))
    } finally {
      if (activeTicketRef.current === submittingTicketId) setSending(false)
    }
  }

  const toolbarButton = (label, Icon, action, disabled = false) => (
    <button
      type="button"
      className={styles.toolButton}
      title={label}
      aria-label={label}
      onClick={action}
      disabled={sending || disabled}
    >
      <Icon aria-hidden="true" />
    </button>
  )

  return (
    <section className={styles.page} dir={locale === "en" ? "ltr" : "rtl"}>
      <h1 className={styles.pageTitle} title={ticket?.problemTitle}>
        {words.title}
      </h1>
      {loading && !ticket && (
        <div className={styles.loading} role="status">
          {words.loading}
        </div>
      )}
      {ticketError && (
        <div className={styles.errorState} role="alert">
          <p>{ticketError}</p>
          <button onClick={() => setRefresh((value) => value + 1)}>{words.retry}</button>
        </div>
      )}
      {ticket && (
        <>
          <section className={`${styles.card} ${styles.statusCard}`} aria-labelledby="ticket-status-heading">
            <div className={styles.cardHeadingRow}>
              <h2 id="ticket-status-heading" className={styles.cardHeading}>
                <FiEdit aria-hidden="true" />
                {words.status}
              </h2>
              <span className={styles.currentStatus}>{getStatusLabel(getTicketStatus(ticket), locale)}</span>
            </div>
            <ol className={styles.timeline}>
              {timeline.map((item, index) => {
                const { Icon, tone, text } = getTimelinePresentation(item, locale)
                return (
                  <li className={styles.timelineItem} key={item.id || `${item.eventType}-${index}`}>
                    <span className={`${styles.timelineIcon} ${styles[tone]}`}>
                      <Icon aria-hidden="true" />
                    </span>
                    <div className={styles.timelineText}>{text}</div>
                    <div className={styles.timelineMeta}>
                      <time dateTime={item.changedAt || item.createdAt}>
                        {formatTicketDate(item.changedAt || item.createdAt, "en")}
                      </time>
                      {item.changedByName && (
                        <span>
                          {words.by} {item.changedByName}
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>

          <section className={`${styles.card} ${styles.commentsCard}`} aria-labelledby="ticket-comments-heading">
            <h2 id="ticket-comments-heading" className={styles.cardHeading}>
              <FiEdit aria-hidden="true" />
              {words.comments}
              <span className={styles.commentCount}>({comments.length})</span>
            </h2>
            {commentsError && (
              <div className={styles.commentsError} role="alert">
                <span>{commentsError}</span>
                <button onClick={() => setRefresh((value) => value + 1)}>{words.retry}</button>
              </div>
            )}
            <div className={styles.commentsList} aria-busy={loading}>
              {(ticket.meassageDetails || ticket.problemTitle || ticket.attachments?.length > 0) && (
                <article className={styles.comment}>
                  <header className={styles.commentHeader}>
                    <AuthorAvatar name={ticketAuthor.authorName || words.customer} imagePath={ticketAuthor.imagePath} />
                    <span className={styles.author}>{ticketAuthor.authorName || words.customer}</span>
                    <span className={styles.originalLabel}>{words.original}</span>
                  </header>
                  {ticket.problemTitle && <p className={styles.requestSubject}>{ticket.problemTitle}</p>}
                  <CommentBody body={ticket.meassageDetails} />
                  <Attachments attachments={ticket.attachments} locale={locale} />
                  <div className={styles.commentActions}>
                    <time dateTime={ticket.createdAt}>{formatTicketDate(ticket.createdAt, "en")}</time>
                  </div>
                </article>
              )}
              {!commentsError && comments.length === 0 && !ticket.meassageDetails && !ticket.problemTitle && (
                <p className={styles.emptyComments}>{words.empty}</p>
              )}
              {comments.map((comment, index) => {
                const name = comment.authorName || (comment.isCustomer ? words.customer : words.support)
                return (
                  <article className={styles.comment} key={comment.id || `comment-${index}`}>
                    <header className={styles.commentHeader}>
                      <AuthorAvatar name={name} imagePath={comment.imagePath} />
                      <span className={styles.author}>{name}</span>
                    </header>
                    <CommentBody body={comment.body} />
                    <Attachments attachments={comment.attachments} locale={locale} />
                    <div className={styles.commentActions}>
                      <button type="button" onClick={() => handleReply(comment)}>
                        {words.reply}
                      </button>
                      <time dateTime={comment.createdAt}>{formatTicketDate(comment.createdAt, "en")}</time>
                    </div>
                  </article>
                )
              })}
            </div>
            <form className={styles.composer} onSubmit={handleSubmit}>
              {replyingTo && (
                <div className={styles.replyingTo}>
                  <span>
                    {words.replying} {replyingTo}
                  </span>
                  <button type="button" onClick={() => setReplyingTo("")} aria-label={words.cancelReply}>
                    <FiX />
                  </button>
                </div>
              )}
              <div className={styles.editor}>
                <textarea
                  ref={textareaRef}
                  aria-label={words.write}
                  placeholder={words.write}
                  value={body}
                  onChange={(event) => editBody(event.target.value)}
                  disabled={sending}
                  rows={6}
                />
                <div className={styles.toolbar} dir="ltr">
                  <div className={styles.formatTools}>
                    {toolbarButton(words.bold, FiBold, () => insertFormatting("**", "**", words.bold))}
                    {toolbarButton(words.italic, FiItalic, () => insertFormatting("_", "_", words.italic))}
                    {toolbarButton(words.link, FiLink, () =>
                      insertFormatting("[", "](https://example.com)", words.link),
                    )}
                    {toolbarButton(words.bullets, FiList, () => prefixLines("• "))}
                    <button
                      type="button"
                      className={styles.toolButton}
                      title={words.numbers}
                      aria-label={words.numbers}
                      onClick={() => prefixLines((index) => `${index + 1}. `)}
                      disabled={sending}
                    >
                      1≡
                    </button>
                    <button
                      type="button"
                      className={styles.toolButton}
                      title={words.outdent}
                      aria-label={words.outdent}
                      onClick={() => prefixLines("", true)}
                      disabled={sending}
                    >
                      ⇤
                    </button>
                    <button
                      type="button"
                      className={styles.toolButton}
                      title={words.indent}
                      aria-label={words.indent}
                      onClick={() => prefixLines("  ")}
                      disabled={sending}
                    >
                      ⇥
                    </button>
                    {toolbarButton(words.image, FiImage, () => imageRef.current?.click())}
                    <button
                      type="button"
                      className={styles.toolButton}
                      title={words.quote}
                      aria-label={words.quote}
                      onClick={() => prefixLines("> ")}
                      disabled={sending}
                    >
                      ❝
                    </button>
                    <button
                      type="button"
                      className={styles.toolButton}
                      title={words.table}
                      aria-label={words.table}
                      onClick={() =>
                        insertFormatting("\n| ", " |\n| --- | --- |\n|  |  |\n", `${words.column} | ${words.column}`)
                      }
                      disabled={sending}
                    >
                      ▦
                    </button>
                    {toolbarButton(words.video, FiVideo, () => videoRef.current?.click())}
                    {toolbarButton(words.undo, FiCornerUpLeft, () => undo(-1), historyIndex === 0)}
                    {toolbarButton(
                      words.redo,
                      FiCornerUpRight,
                      () => undo(1),
                      historyIndex === editorHistory.length - 1,
                    )}
                  </div>
                  <div className={styles.editorControls}>
                    <div className={styles.paragraphControl} dir={locale === "en" ? "ltr" : "rtl"}>
                      <select
                        aria-label={words.paragraph}
                        value={paragraphStyle}
                        onChange={(event) => {
                          setParagraphStyle(event.target.value)
                          if (event.target.value === "heading") prefixLines("## ")
                          else prefixLines("", "heading")
                        }}
                        disabled={sending}
                      >
                        <option value="">{words.paragraph}</option>
                        <option value="heading">{words.heading}</option>
                      </select>
                      <FiChevronDown aria-hidden="true" />
                    </div>
                    {toolbarButton(words.attachment, FiPaperclip, () => attachmentRef.current?.click())}
                    <button
                      type="submit"
                      className={styles.sendButton}
                      disabled={sending || !body.trim()}
                      title={sending ? words.sending : words.send}
                      aria-label={sending ? words.sending : words.send}
                    >
                      <FiPlus aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
              <input
                ref={attachmentRef}
                className={styles.hiddenInput}
                type="file"
                multiple
                onChange={addFiles}
                aria-label={words.attachment}
              />
              <input
                ref={imageRef}
                className={styles.hiddenInput}
                type="file"
                accept="image/*"
                multiple
                onChange={addFiles}
                aria-label={words.image}
              />
              <input
                ref={videoRef}
                className={styles.hiddenInput}
                type="file"
                accept="video/*"
                multiple
                onChange={addFiles}
                aria-label={words.video}
              />
              {files.length > 0 && (
                <ul className={styles.selectedFiles}>
                  {files.map((file, index) => (
                    <li key={`${file.name}-${index}`}>
                      <FiPaperclip aria-hidden="true" />
                      <span>{file.name}</span>
                      <small>{formatFileSize(file.size, locale)}</small>
                      <button
                        type="button"
                        aria-label={`${words.remove}: ${file.name}`}
                        onClick={() =>
                          setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))
                        }
                        disabled={sending}
                      >
                        <FiX />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {sendError && (
                <p className={styles.sendError} role="alert">
                  {sendError}
                </p>
              )}
              {sending && (
                <span className={styles.sending} role="status">
                  {words.sending}
                </span>
              )}
            </form>
          </section>
        </>
      )}
    </section>
  )
}

export default ContactUsDetails
