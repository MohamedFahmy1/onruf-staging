import { useRef, useState } from "react"
import { FiFile, FiUploadCloud, FiX } from "react-icons/fi"
import { toast } from "react-toastify"
import { pathOr } from "ramda"
import t from "../../translations.json"
import styles from "./contact-us.module.css"

const MAX_FILE_SIZE = 25 * 1024 * 1024
const ACCEPTED_EXTENSIONS = /\.(png|jpe?g|pdf|docx)$/i

const AttachmentUpload = ({ files, onChange, locale, disabled, existingFiles = [] }) => {
  const fileInput = useRef(null)
  const [dragging, setDragging] = useState(false)
  const text = (key) => pathOr("", [locale, "ContactUs", key], t)

  const addFiles = (incoming) => {
    if (disabled) return
    const nextFiles = [...files]
    Array.from(incoming).forEach((file) => {
      if (!ACCEPTED_EXTENSIONS.test(file.name)) {
        toast.error(text("uploadAllowedFilesError"))
      } else if (file.size > MAX_FILE_SIZE) {
        toast.error(text("uploadFileSizeError"))
      } else if (
        !nextFiles.some(
          (item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified,
        )
      ) {
        nextFiles.push(file)
      }
    })
    onChange(nextFiles)
  }

  return (
    <div className={styles.attachmentsGroup}>
      <span className={styles.attachmentLabel} id="support-attachments-label">
        {text("uploadAttachments")}
      </span>
      <input
        ref={fileInput}
        className={styles.fileInput}
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,.pdf,.docx"
        disabled={disabled}
        aria-labelledby="support-attachments-label"
        tabIndex={-1}
        onChange={(event) => {
          addFiles(event.target.files)
          event.target.value = ""
        }}
      />
      <button
        type="button"
        className={`${styles.dropzone} ${dragging ? styles.dragging : ""}`}
        disabled={disabled}
        onClick={() => fileInput.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          addFiles(event.dataTransfer.files)
        }}
      >
        <FiUploadCloud className={styles.uploadIcon} aria-hidden="true" />
        <span>{text("uploadInstructions")}</span>
        <span>{text("uploadFormats")}</span>
      </button>
      {(!!files.length || !!existingFiles.length) && (
        <ul className={styles.fileList}>
          {existingFiles.map((file) => (
            <li key={file.id || file.filePath}>
              <FiFile aria-hidden="true" />
              <a
                href={
                  /^https?:\/\//i.test(file.filePath || "") || (file.filePath || "").startsWith("/")
                    ? file.filePath
                    : undefined
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                {file.fileName}
              </a>
            </li>
          ))}
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}`}>
              <FiFile aria-hidden="true" />
              <span>{file.name}</span>
              <small dir="ltr">
                {(file.size / 1024 / 1024).toFixed(2)} {text("uploadMegabytes")}
              </small>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(files.filter((_, itemIndex) => itemIndex !== index))}
                aria-label={`${text("uploadRemove")} ${file.name}`}
              >
                <FiX aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default AttachmentUpload
