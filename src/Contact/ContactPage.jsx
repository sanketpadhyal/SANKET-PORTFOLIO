import { useEffect, useRef, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { ChevronRight, FileText, Home, Pin } from "lucide-react"
import { auth, signInWithGoogle } from "../firebase"
import { authGoogle } from "../api-calls/apicalls"
import "./ContactPage.css"

const RESUME_FILE_PATH = process.env.REACT_APP_RESUME_FILE_PATH || ""

const contactLinks = [
  {
    id: "web",
    label: "Professional Web Contact",
    sublabel: "Submit a private support ticket to connect directly with Sanket",
    icon: "https://avatars.githubusercontent.com/u/219556980?s=400&u=afcb28ee68ca0ae4ec8b0fb108a1c1d394dd56e2&v=4",
    iconAlt: "Web contact",
    iconClassName: "web",
    isPinned: true,
    onClick: () => {}
  },
  {
    id: "sparse",
    label: "Connect on Sparse",
    sublabel: "@sanket",
    icon: "https://sparse.in/assets/logo.png",
    iconAlt: "Sparse",
    iconClassName: "sparse",
    onClick: () => {
      window.open("https://sparse.in/u/sanket", "_blank", "noopener,noreferrer")
    }
  },
  {
    id: "mail",
    label: "Mail Sanket",
    sublabel: "Open a private contact ticket",
    icon: "https://www.gstatic.com/images/branding/product/1x/gmail_2020q4_48dp.png",
    iconAlt: "Gmail",
    iconClassName: "gmail",
    onClick: () => {}
  },
  {
    id: "github",
    label: "GitHub Profile",
    sublabel: "github.com/sanketpadhyal",
    icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/github.svg",
    iconAlt: "GitHub",
    iconClassName: "github",
    onClick: () => {
      window.open("https://github.com/sanketpadhyal", "_blank", "noopener,noreferrer")
    }
  },
]

export default function ContactPage() {
  const [downloadModalState, setDownloadModalState] = useState("closed")
  const [isWebAuthOpen, setIsWebAuthOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isGoogleAuthLoading, setIsGoogleAuthLoading] = useState(false)
  const [webAuthError, setWebAuthError] = useState("")
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [isDownloadComplete, setIsDownloadComplete] = useState(false)
  const timeoutRef = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
      }

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const navigateToPath = (path) => {
    if (window.location.pathname === path) {
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    window.history.pushState({}, "", path)
    try {
      window.dispatchEvent(new PopStateEvent("popstate"))
    } catch {
      window.dispatchEvent(new Event("popstate"))
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }

  useEffect(() => {
    if (!auth) {
      setIsAuthenticated(false)
      return undefined
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const loggedIn = Boolean(user)

      setIsAuthenticated(loggedIn)
    })

    return unsubscribe
  }, [])

  const triggerResumeDownload = () => {
    if (!RESUME_FILE_PATH) return

    const link = document.createElement("a")
    link.href = RESUME_FILE_PATH
    link.download = "Sanket-Padhyal-Resume"
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const startResumeDownload = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
    }

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }

    triggerResumeDownload()
    setDownloadModalState("loading")
    setIsDownloadComplete(false)
    setDownloadProgress(0)

    timeoutRef.current = window.setTimeout(() => {
      setDownloadModalState("progress")

      let progress = 0

      intervalRef.current = window.setInterval(() => {
        progress = Math.min(progress + (progress < 32 ? 5 : progress < 72 ? 4 : 3), 100)
        setDownloadProgress(progress)

        if (progress >= 100) {
          window.clearInterval(intervalRef.current)
          intervalRef.current = null
          setIsDownloadComplete(true)

          timeoutRef.current = window.setTimeout(() => {
            setDownloadModalState("closed")
          }, 1200)
        }
      }, 110)
    }, 720)
  }

  const handleResumeDownload = () => {
    if (!RESUME_FILE_PATH) {
      handleWebContact()
      return
    }

    setDownloadModalState("confirm")
  }

  const handleCancelResumeDownload = () => {
    setDownloadModalState("closed")
  }

  const handleOpenWebAuth = () => {
    setWebAuthError("")
    setIsWebAuthOpen(true)
  }

  const handleCloseWebAuth = () => {
    setWebAuthError("")
    setIsGoogleAuthLoading(false)
    setIsWebAuthOpen(false)
  }

  const handleContinueWithGoogle = async () => {
    setWebAuthError("")

    if (!auth) {
      setWebAuthError("Google sign-in is not configured for this local setup.")
      return
    }

    setIsGoogleAuthLoading(true)

    try {
      const result = await signInWithGoogle()
      const token = await result.user.getIdToken()

      const res = await authGoogle(token)

      if (!res.ok) {
        throw new Error(res.data.error || "Backend failed")
      }

      setIsWebAuthOpen(false)
      navigateToPath("/contact/tickets")
    } catch {
      setWebAuthError("Google sign-in could not be completed. Please try again.")
    } finally {
      setIsGoogleAuthLoading(false)
    }
  }

  const handleWebContact = () => {
    if (isAuthenticated) {
      navigateToPath("/contact/tickets")
      return
    }

    handleOpenWebAuth()
  }

  return (
    <main className="contact-page">
      {isWebAuthOpen ? (
        <div className="web-auth-backdrop" aria-hidden={!isWebAuthOpen}>
          <div className="web-auth-modal" role="dialog" aria-modal="true" aria-live="polite">
            <div className="web-auth-brand">
              <img
                src="/assets/sanket.webp"
                alt="Sanket logo"
                className="web-auth-logo"
              />
              <p className="web-auth-security">Secured by OAuth</p>
            </div>

            <p className="web-auth-title">Continue to private web contact</p>
            <p className="web-auth-copy">
              Sign in to continue with Google and open a secure contact flow for Sanket.
            </p>

            <button
              type="button"
              className="web-auth-google-button"
              onClick={handleContinueWithGoogle}
              disabled={isGoogleAuthLoading}
            >
              {isGoogleAuthLoading ? (
                <span className="web-auth-button-loader" aria-hidden="true" />
              ) : (
                <span className="web-auth-google-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="web-auth-google-svg">
                    <path
                      fill="#4285F4"
                      d="M21.6 12.23c0-.7-.06-1.37-.18-2.01H12v3.81h5.39a4.61 4.61 0 0 1-2 3.03v2.52h3.24c1.9-1.75 2.97-4.34 2.97-7.35Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 22c2.7 0 4.97-.89 6.63-2.42l-3.24-2.52c-.9.6-2.06.95-3.39.95-2.6 0-4.8-1.76-5.58-4.12H3.07v2.6A10 10 0 0 0 12 22Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M6.42 13.89A5.96 5.96 0 0 1 6.11 12c0-.66.11-1.29.31-1.89V7.51H3.07A10 10 0 0 0 2 12c0 1.61.39 3.13 1.07 4.49l3.35-2.6Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.99c1.47 0 2.8.51 3.84 1.52l2.88-2.88C16.96 2.99 14.69 2 12 2A10 10 0 0 0 3.07 7.51l3.35 2.6c.78-2.36 2.98-4.12 5.58-4.12Z"
                    />
                  </svg>
                </span>
              )}
              <span>{isGoogleAuthLoading ? "" : "Continue with Google"}</span>
            </button>

            {webAuthError ? <p className="web-auth-error">{webAuthError}</p> : null}

            <button
              type="button"
              className="web-auth-close"
              onClick={handleCloseWebAuth}
            >
              Not now
            </button>
          </div>
        </div>
      ) : null}

      {downloadModalState !== "closed" ? (
        <div className="resume-download-backdrop" aria-hidden={downloadModalState === "closed"}>
          <div
            className="resume-download-modal"
            role={downloadModalState === "confirm" ? "dialog" : "status"}
            aria-live="polite"
            aria-modal={downloadModalState === "confirm" ? "true" : undefined}
          >
            <p className="resume-download-kicker">Resume download</p>

            {downloadModalState === "confirm" ? (
              <>
                <p className="resume-download-title">Download Sanket&apos;s resume?</p>
                <p className="resume-download-copy">
                  Do you want to download Sanket Padhyal&apos;s professional resume now?
                </p>

                <div className="resume-download-actions">
                  <button
                    type="button"
                    className="resume-download-action secondary"
                    onClick={handleCancelResumeDownload}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    className="resume-download-action primary"
                    onClick={startResumeDownload}
                  >
                    Yes
                  </button>
                </div>
              </>
            ) : downloadModalState === "loading" ? (
              <>
                <div className="resume-download-loader" aria-hidden="true" />
                <p className="resume-download-title">Starting download</p>
                <p className="resume-download-copy">
                  Preparing the professional Sanket Padhyal resume for download.
                </p>
              </>
            ) : (
              <>
                {isDownloadComplete ? (
                  <>
                    <div className="resume-download-success" aria-hidden="true">
                      <span className="resume-download-success-ring" />
                      <span className="resume-download-success-check">
                        <svg viewBox="0 0 24 24" className="resume-download-success-icon">
                          <path
                            d="M20 6L9 17l-5-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </div>
                    <p className="resume-download-title">Downloaded</p>
                    <p className="resume-download-copy">
                      The professional Sanket Padhyal resume has been downloaded. Check your Downloads.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="resume-download-title">Preparing resume</p>
                    <p className="resume-download-copy">
                      Packaging the professional Sanket Padhyal resume file for download.
                    </p>

                    <div className="resume-download-track" aria-hidden="true">
                      <span
                        className="resume-download-fill"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>

                    <p className="resume-download-percent">{downloadProgress}%</p>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}

      <section className="contact-hero">
        <div className="contact-page-frame">
          <div className="contact-breadcrumb-container">
            <nav className="page-breadcrumb" aria-label="Breadcrumb">
              <a href="/" className="page-breadcrumb-link" title="Home">
                <Home size={14} strokeWidth={2} />
                <span>Home</span>
              </a>
              <ChevronRight size={14} className="page-breadcrumb-separator" strokeWidth={2} />
              <span className="page-breadcrumb-current" aria-current="page">
                Contact
              </span>
            </nav>
          </div>

          <div className="contact-shell">

          <h1 className="contact-title">
            <span className="contact-title-main">Get in</span>{" "}
            <span className="contact-title-accent">Touch</span>
          </h1>

          <p className="contact-sub">
            Reach out for collaboration, support, or any questions about Sanket Padhyal.
          </p>

          <div className="contact-actions">
            {contactLinks.map(({ id, label, sublabel, icon, iconAlt, iconClassName, onClick, isPinned }) => (
              <button
                key={label}
                type="button"
                className={`contact-btn ${isPinned ? "pinned" : ""}`.trim()}
                onClick={id === "web" || id === "mail" ? handleWebContact : onClick}
              >
                <span className={`contact-icon-wrap ${iconClassName}`}>
                  <img src={icon} alt={iconAlt} className="contact-icon" />
                </span>

                <span className="contact-copy">
                  <span className="contact-btn-label">{label}</span>
                  <span className="contact-btn-sub">{sublabel}</span>
                </span>

                {isPinned ? (
                  <span className="contact-pin" aria-label="Pinned contact option" title="Pinned">
                    <Pin size={12} strokeWidth={2.3} />
                  </span>
                ) : null}
              </button>
            ))}

            <button type="button" className="contact-btn resume" onClick={handleResumeDownload}>
              <span className="contact-icon-wrap resume">
                <span className="contact-resume-sheet" aria-hidden="true">
                  <FileText
                    size={22}
                    strokeWidth={2}
                    className="contact-icon contact-resume-icon"
                  />
                </span>
              </span>

              <span className="contact-copy">
                <span className="contact-btn-label">Download Resume</span>
                <span className="contact-btn-sub">Download the professional Sanket Padhyal resume</span>
              </span>
            </button>
          </div>
        </div>
        </div>
      </section>
    </main>
  )
}
