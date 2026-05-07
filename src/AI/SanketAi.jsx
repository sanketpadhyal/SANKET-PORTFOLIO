import { ArrowUp, ArrowUpRight, MessagesSquare, Square, Trash2, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { callAI } from "../api-calls/apicalls"
import "./SanketAi.css"

const CHAT_STORAGE_KEY = "sanket-ai-chat"
const GITHUB_URL = "https://github.com/sanketpadhyal"

const suggestedQuestions = [
  "Tell me about Sanket's best projects",
  "Show Sanket's experience and education",
  "How can I contact Sanket for work?",
  "What is Sanket currently working on?"
]

const getInitialMessages = () => {
  if (typeof window === "undefined") return []
  try {
    const stored = window.localStorage.getItem(CHAT_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const renderFormattedContent = (content) => {
  const lines = content.split("\n")

  return lines.map((line, lineIndex) => {
    const parts = line.split(/(\*\*.*?\*\*)/g).filter(Boolean)

    return (
      <span key={`line-${lineIndex}`} className="sanket-ai-line">
        {parts.map((part, partIndex) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={`part-${lineIndex}-${partIndex}`}>
                {part.slice(2, -2)}
              </strong>
            )
          }

          return <span key={`part-${lineIndex}-${partIndex}`}>{part}</span>
        })}

        {lineIndex < lines.length - 1 ? <br /> : null}
      </span>
    )
  })
}

const getSuggestedActions = (text) => {
  const t = text.toLowerCase()
  const actions = []

  if (t.includes("github")) {
    actions.push({
      label: "Open GitHub",
      href: GITHUB_URL,
      external: true
    })
  }

  if (t.includes("contact") || t.includes("email")) {
    actions.push({
      label: "Open Contact",
      href: "/contact"
    })
  }

  return actions
}

export default function SanketAi({ isOpen, onClose, initialPrompt = "", initialPromptId = null, onInitialPromptConsumed }) {
  const [messages, setMessages] = useState(getInitialMessages)
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false)
  const scrollerRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const streamIntervalRef = useRef(null)
  const abortControllerRef = useRef(null)
  const isTypingRef = useRef(false)
  const isStreamingRef = useRef(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    isTypingRef.current = isTyping
  }, [isTyping])

  useEffect(() => {
    isStreamingRef.current = isStreaming
  }, [isStreaming])

  useEffect(() => {
    if (!isOpen) return

    const prevHtml = document.documentElement.style.overflow
    const prevBody = document.body.style.overflow

    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"

    return () => {
      document.documentElement.style.overflow = prevHtml
      document.body.style.overflow = prevBody
    }
  }, [isOpen])

  useEffect(() => {
    if (!scrollerRef.current) return
    scrollerRef.current.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth"
    })
  }, [messages, isTyping, isOpen])

  const sendMessage = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || isTypingRef.current || isStreamingRef.current) return

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }

    if (streamIntervalRef.current) {
      window.clearInterval(streamIntervalRef.current)
      streamIntervalRef.current = null
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed
      }
    ])

    setInputValue("")
    setIsTyping(true)
    isTypingRef.current = true

    try {
      const controller = new AbortController()
      abortControllerRef.current = controller

      const res = await callAI(trimmed, controller.signal)

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: "Slow down 😅 — try again in a moment"
          }
        ])

        setIsTyping(false)
        setIsStreaming(false)
        abortControllerRef.current = null
        return
      }

      const reply = (res.data.reply || "No response").trim()
      const assistantId = `assistant-${Date.now()}`
      const suggestedActions = getSuggestedActions(trimmed)

      setIsTyping(false)
      setIsStreaming(true)
  isTypingRef.current = false
  isStreamingRef.current = true
      abortControllerRef.current = null

      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          actions: suggestedActions
        }
      ])

      let index = 0

      streamIntervalRef.current = window.setInterval(() => {
        index += reply.length > 220 ? 4 : 2

        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: reply.slice(0, index)
                }
              : message
          )
        )

        if (index >= reply.length) {
          window.clearInterval(streamIntervalRef.current)
          streamIntervalRef.current = null
          setIsStreaming(false)
          isStreamingRef.current = false
        }
      }, 18)

    } catch (err) {
      if (err.name === "AbortError") {
        return
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: "Server error"
        }
      ])

      setIsTyping(false)
      setIsStreaming(false)
      isTypingRef.current = false
      isStreamingRef.current = false
      abortControllerRef.current = null
    }
  }

  const interruptStreaming = () => {
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }

    if (streamIntervalRef.current) {
      window.clearInterval(streamIntervalRef.current)
      streamIntervalRef.current = null
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    if (!isTyping && !isStreaming) {
      return
    }

    setIsTyping(false)
    setIsStreaming(false)
    isTypingRef.current = false
    isStreamingRef.current = false
    setMessages((prev) => [
      ...prev,
      {
        id: `system-${Date.now()}`,
        role: "system",
        content: "Streaming interrupted"
      }
    ])
  }

  const handlePromptClick = (question) => {
    sendMessage(question)
  }

  useEffect(() => {
    if (!isOpen || !initialPromptId) {
      return
    }

    const trimmedPrompt = initialPrompt.trim()
    if (!trimmedPrompt) {
      onInitialPromptConsumed?.()
      return
    }

    const launchAutoPrompt = () => {
      if (isTyping || isStreaming) {
        interruptStreaming()
        window.setTimeout(() => {
          void sendMessage(trimmedPrompt)
        }, 80)
      } else {
        void sendMessage(trimmedPrompt)
      }

      onInitialPromptConsumed?.()
    }

    const timer = window.setTimeout(launchAutoPrompt, 0)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPromptId, isOpen])

  const handleComposerSubmit = (event) => {
    event.preventDefault()
    sendMessage(inputValue)
  }

  const clearChat = () => {
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }

    if (streamIntervalRef.current) {
      window.clearInterval(streamIntervalRef.current)
      streamIntervalRef.current = null
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    setIsTyping(false)
    setIsStreaming(false)
    setMessages([])
    setIsClearConfirmOpen(false)

    try {
      window.localStorage.removeItem(CHAT_STORAGE_KEY)
    } catch {}
  }

  const showSuggestions = messages.length === 0

  return (
    <div className={`sanket-ai-shell ${isOpen ? "open" : ""}`} aria-hidden={!isOpen}>
      <div className="sanket-ai-backdrop" onClick={onClose} />

      <section className="sanket-ai-panel" aria-label="Sanket Assistant" data-lenis-prevent>
        {isClearConfirmOpen ? (
          <div className="sanket-ai-confirm-backdrop" onClick={() => setIsClearConfirmOpen(false)}>
            <div
              className="sanket-ai-confirm"
              role="dialog"
              aria-modal="true"
              aria-label="Clear chat confirmation"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="sanket-ai-confirm-title">Clear chat?</p>
              <p className="sanket-ai-confirm-text">Are you sure you want to remove this conversation?</p>
              <div className="sanket-ai-confirm-actions">
                <button
                  type="button"
                  className="sanket-ai-confirm-btn secondary"
                  onClick={() => setIsClearConfirmOpen(false)}
                >
                  No
                </button>
                <button
                  type="button"
                  className="sanket-ai-confirm-btn primary"
                  onClick={clearChat}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="sanket-ai-topbar">
          <div className="sanket-ai-brand">
            <div className="sanket-ai-avatar">
              <img src="/assets/sanket.webp" alt="Sanket Padhyal" className="sanket-ai-avatar-image" />
            </div>
            <div className="sanket-ai-brand-copy">
              <p className="sanket-ai-brand-title">Sanket Assistant</p>
              <p className="sanket-ai-brand-subtitle">Ask anything about Sanket Padhyal</p>
            </div>
          </div>

          <div className="sanket-ai-top-actions">
            <button
              type="button"
              className="sanket-ai-icon-btn sanket-ai-clear"
              aria-label="Clear chat"
              onClick={() => setIsClearConfirmOpen(true)}
            >
              <Trash2 size={16} strokeWidth={2.1} />
            </button>

            <button
              type="button"
              className="sanket-ai-icon-btn sanket-ai-close"
              onClick={onClose}
            >
              <X size={20} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        <div className="sanket-ai-content" ref={scrollerRef} data-lenis-prevent>
          <div className={`sanket-ai-prompts ${showSuggestions ? "visible" : "hidden"}`}>
            <p className="sanket-ai-prompts-title">
              <span>Quick Questions</span>
              <MessagesSquare size={13} strokeWidth={2.2} aria-hidden="true" />
            </p>

            {suggestedQuestions.map((q, i) => (
              <button
                key={q}
                className="sanket-ai-prompt"
                style={{ "--prompt-delay": `${i * 48}ms` }}
                onClick={() => handlePromptClick(q)}
              >
                <span className="sanket-ai-prompt-text">{q}</span>
                <span className="sanket-ai-prompt-icon" aria-hidden="true">
                  <ArrowUpRight size={16} />
                </span>
              </button>
            ))}
          </div>

          <div className={`sanket-ai-messages ${messages.length > 0 || isTyping ? "visible" : ""}`}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`sanket-ai-message-bubble ${msg.role}`}
              >
                {renderFormattedContent(msg.content)}
                {msg.role === "assistant" && Array.isArray(msg.actions) && msg.actions.length > 0 ? (
                  <div className="sanket-ai-message-actions">
                    {msg.actions.map((action) => (
                      <a
                        key={`${msg.id}-${action.label}`}
                        className="sanket-ai-message-action"
                        href={action.href}
                        target={action.external ? "_blank" : undefined}
                        rel={action.external ? "noopener noreferrer" : undefined}
                      >
                        <span>{action.label}</span>
                        <ArrowUpRight size={14} strokeWidth={2.2} />
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            {isTyping && (
              <div className="sanket-ai-message-bubble assistant typing">
                <span className="sanket-ai-dot" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>

        <div className="sanket-ai-composer-wrap">
          <form className="sanket-ai-composer" onSubmit={handleComposerSubmit}>
            <input
              className="sanket-ai-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything"
            />

            <button
              type={isTyping || isStreaming ? "button" : "submit"}
              className={`sanket-ai-send ${isTyping || isStreaming ? "streaming" : ""}`}
              onClick={isTyping || isStreaming ? interruptStreaming : undefined}
              aria-label={isTyping || isStreaming ? "Interrupt streaming" : "Send message"}
            >
              {isTyping || isStreaming ? (
                <Square size={15} strokeWidth={3.2} fill="currentColor" />
              ) : (
                <ArrowUp size={22} strokeWidth={2.8} />
              )}
            </button>
          </form>

          <p className="sanket-ai-footer">
            Sanket Assistant can make mistakes.
          </p>
        </div>
      </section>
    </div>
  )
}
