import { X } from "lucide-react"
import { useEffect, useState } from "react"
import SanketAi from "./SanketAi"
import "./AiCircle.css"

const AI_NOTE_STORAGE_KEY = "ai-note-hidden"
const AI_OPEN_EVENT_NAME = "sanket-ai-open"

export default function AiCircle() {
  const [isNoteVisible, setIsNoteVisible] = useState(() => {
    if (typeof window === "undefined") {
      return true
    }

    return window.localStorage.getItem(AI_NOTE_STORAGE_KEY) !== "true"
  })
  const [isAiOpen, setIsAiOpen] = useState(false)
  const [launchRequest, setLaunchRequest] = useState(null)

  const handleCloseNote = () => {
    setIsNoteVisible(false)
    window.localStorage.setItem(AI_NOTE_STORAGE_KEY, "true")
  }

  const handleOpenAi = () => {
    if (isNoteVisible) {
      handleCloseNote()
    }

    setLaunchRequest(null)
    setIsAiOpen(true)
  }

  useEffect(() => {
    const handleOpenRequest = (event) => {
      const detail = event?.detail || {}
      const prompt = typeof detail.prompt === "string" ? detail.prompt.trim() : ""
      const requestId = typeof detail.requestId === "string" || typeof detail.requestId === "number"
        ? String(detail.requestId)
        : `${Date.now()}`

      if (isNoteVisible) {
        handleCloseNote()
      }

      setLaunchRequest(prompt ? { id: requestId, prompt } : null)
      setIsAiOpen(true)
    }

    window.addEventListener(AI_OPEN_EVENT_NAME, handleOpenRequest)

    return () => {
      window.removeEventListener(AI_OPEN_EVENT_NAME, handleOpenRequest)
    }
  }, [isNoteVisible])

  return (
    <div className="ai-widget">
      <SanketAi
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        initialPrompt={launchRequest?.prompt || ""}
        initialPromptId={launchRequest?.id || null}
        onInitialPromptConsumed={() => setLaunchRequest(null)}
      />

      {isNoteVisible ? (
        <div className="ai-note" role="status" aria-live="polite">
          <button
            type="button"
            className="ai-note-close"
            aria-label="Close AI note"
            onClick={handleCloseNote}
          >
            <X size={14} strokeWidth={2.4} />
          </button>

          <p className="ai-note-text">
            This AI can tell you about Sanket Padhyal. Ask it anything.
          </p>
        </div>
      ) : null}

      <button
        type="button"
        className="ai-circle"
        aria-label="Open AI assistant"
        onClick={handleOpenAi}
      >
        <span className="ai-circle-ring" aria-hidden="true" />
        <span className="ai-circle-core">
          <img src="/assets/sanket.webp" alt="Sanket Padhyal" className="ai-circle-logo" />
        </span>
      </button>
    </div>
  )
}
