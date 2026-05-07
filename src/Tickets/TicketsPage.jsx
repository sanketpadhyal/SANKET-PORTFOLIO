import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  ChevronDown,
  ChevronRight,
  Home,
  LogOut,
  Mail,
  X,
  Plus,
  Ticket,
  UserRound
} from "lucide-react"
import { onAuthStateChanged } from "firebase/auth"
import { auth, signInWithGoogle, signOutUser } from "../firebase"
import { authGoogle, getProfile, getTickets, updateProfile, createTicket, clearJWTToken } from "../api-calls/apicalls"
import "./TicketsPage.css"

const slugifyUsername = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

const buildDefaultProfile = (user) => {
  const emailName = user.email?.split("@")[0] ?? "user"
  return {
    name: user.displayName || "Guest User",
    username: slugifyUsername(emailName || user.uid.slice(0, 8)),
    email: user.email || "",
    showProfilePhoto: true,
    showUsername: true,
    createdAt: null
  }
}

const lockBodyScroll = () => {
  const { body } = document
  const scrollY = window.scrollY
  const previousStyles = {
    overflow: body.style.overflow,
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width
  }

  body.style.overflow = "hidden"
  body.style.position = "fixed"
  body.style.top = `-${scrollY}px`
  body.style.left = "0"
  body.style.right = "0"
  body.style.width = "100%"

  return () => {
    body.style.overflow = previousStyles.overflow
    body.style.position = previousStyles.position
    body.style.top = previousStyles.top
    body.style.left = previousStyles.left
    body.style.right = previousStyles.right
    body.style.width = previousStyles.width
    window.scrollTo(0, scrollY)
  }
}

const getDateFromTimestamp = (value) => {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value?.toDate === "function") {
    const date = value.toDate()
    return Number.isNaN(date.getTime()) ? null : date
  }

  const seconds = value.seconds ?? value._seconds

  if (typeof seconds === "number") {
    const date = new Date(seconds * 1000)
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  return null
}

const formatTicketDate = (value) => {
  const date = getDateFromTimestamp(value)

  if (!date) {
    return "Just now"
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date)
}

const clearPersistedAuthState = () => {
  if (typeof window === "undefined") {
    return
  }

  const clearMatchingKeys = (storage) => {
    if (!storage) {
      return
    }

    const keysToRemove = []

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)

      if (
        key &&
        (key.startsWith("firebase:authUser:") ||
          key.startsWith("firebase:persistence:") ||
          key.includes("sanketpadhyal-123"))
      ) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach((key) => {
      storage.removeItem(key)
    })
  }

  clearMatchingKeys(window.localStorage)
  clearMatchingKeys(window.sessionStorage)

  if (typeof window.indexedDB?.deleteDatabase === "function") {
    try {
      window.indexedDB.deleteDatabase("firebaseLocalStorageDb")
    } catch (error) {
      console.error("IndexedDB cleanup failed:", error)
    }
  }
}

export default function TicketsPage() {
  const [authUser, setAuthUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [isProfileHydrating, setIsProfileHydrating] = useState(true)
  const [isTicketsHydrating, setIsTicketsHydrating] = useState(true)
  const [profile, setProfile] = useState({
    name: "",
    username: "",
    email: "",
    showProfilePhoto: true,
    showUsername: true,
    createdAt: null
  })
  const [tickets, setTickets] = useState([])
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [signInError, setSignInError] = useState("")
  const [activeTicketThread, setActiveTicketThread] = useState(null)
  const [isThreadClosing, setIsThreadClosing] = useState(false)
  const [isCreatingTicket, setIsCreatingTicket] = useState(false)
  const [composerPreview, setComposerPreview] = useState(null)
  const [ticketCreateError, setTicketCreateError] = useState("")
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [saveStatus, setSaveStatus] = useState("")
  const [ticketRateLimit, setTicketRateLimit] = useState(null)
  const [draft, setDraft] = useState({
    title: "",
    details: "",
    useProfilePreferences: true,
    showProfilePhoto: true,
    showUsername: true
  })
  const profileMenuRef = useRef(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user)
      setAuthReady(true)
      setIsProfileHydrating(true)

      if (!user) {
        setProfile({
          name: "",
          username: "",
          email: "",
          showProfilePhoto: true,
          showUsername: true,
          createdAt: null
        })
        setTickets([])
        setIsComposerOpen(false)
        setIsProfileMenuOpen(false)
        setIsSignOutConfirmOpen(false)
        setIsSigningOut(false)
        setActiveTicketThread(null)
        setTicketRateLimit(null)
        setTicketCreateError("")
        setIsCreatingTicket(false)
        setIsTicketsHydrating(false)
        setDraft({
          title: "",
          details: "",
          useProfilePreferences: true,
          showProfilePhoto: true,
          showUsername: true
        })
        setIsProfileHydrating(false)
        return
      }

      try {
        const profileRes = await getProfile()

        if (profileRes.ok) {
          const profileData = profileRes.data.user
          setProfile({
            name: profileData.name || "Guest User",
            username: profileData.username || "",
            email: profileData.email || "",
            showProfilePhoto: profileData.showProfilePhoto ?? true,
            showUsername: profileData.showUsername ?? true,
            createdAt: profileData.createdAt || null
          })
        } else {
          const fallback = buildDefaultProfile(user)
          setProfile(fallback)
        }

        const res = await getTickets()

        if (res.ok) {
          setTickets(res.data.tickets || [])

          if (res.data.remaining !== undefined) {
            setTicketRateLimit({
              limit: res.data.total,
              remaining: res.data.remaining,
              used: res.data.total - res.data.remaining
            })
          }
        } else {
          setTickets([])
        }
      } finally {
        setIsProfileHydrating(false)
        setIsTicketsHydrating(false)
      }
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      useProfilePreferences: true,
      showProfilePhoto: profile.showProfilePhoto ?? true,
      showUsername: profile.showUsername ?? true
    }))
  }, [profile.showProfilePhoto, profile.showUsername])

  useEffect(() => {
    if (!isProfileMenuOpen) {
      setIsSignOutConfirmOpen(false)
      return undefined
    }

    const handlePointerDown = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setIsProfileMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isProfileMenuOpen])

  useEffect(() => {
    if (!isSignOutConfirmOpen) {
      return undefined
    }

    const unlockBodyScroll = lockBodyScroll()

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsSignOutConfirmOpen(false)
      }
    }

    document.addEventListener("keydown", handleEscape)

    return () => {
      unlockBodyScroll()
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isSignOutConfirmOpen])

  useEffect(() => {
    if (!activeTicketThread) {
      return undefined
    }

    const unlockBodyScroll = lockBodyScroll()

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeActiveTicketThread()
      }
    }

    document.addEventListener("keydown", handleEscape)

    return () => {
      unlockBodyScroll()
      document.removeEventListener("keydown", handleEscape)
    }
  }, [activeTicketThread])

  useEffect(() => {
    const root = document.documentElement

    if (activeTicketThread) {
      root.dataset.ticketThreadOpen = "true"
    } else {
      delete root.dataset.ticketThreadOpen
    }

    return () => {
      delete root.dataset.ticketThreadOpen
    }
  }, [activeTicketThread])

  useEffect(() => {
    if (activeTicketThread) {
      setIsThreadClosing(false)
    }
  }, [activeTicketThread])

  const handleProfileFieldChange = (field, value) => {
    setProfile((current) => ({
      ...current,
      [field]: field === "username" ? slugifyUsername(value) : value
    }))
  }

  const fetchTickets = useCallback(async (user) => {
    if (!user) {
      setTickets([])
      setIsTicketsHydrating(false)
      return
    }

    setIsTicketsHydrating(true)

    try {
      const res = await getTickets()

      if (res.ok) {
        setTickets(res.data.tickets || [])

        if (res.data.remaining !== undefined) {
          setTicketRateLimit({
            limit: res.data.total,
            remaining: res.data.remaining,
            used: res.data.total - res.data.remaining
          })
        }
      } else {
        setTickets([])
      }
    } catch {
      setTickets([])
    } finally {
      setIsTicketsHydrating(false)
    }
  }, [])

  useEffect(() => {
    if (!authUser) {
      return undefined
    }

    const handleTicketAgentUpdate = () => {
      void fetchTickets(authUser)
    }

    window.addEventListener("tickets-agent-updated", handleTicketAgentUpdate)

    return () => {
      window.removeEventListener("tickets-agent-updated", handleTicketAgentUpdate)
    }
  }, [authUser, fetchTickets])

  const saveProfile = async (nextProfile) => {
    if (!authUser) return

    setIsSavingProfile(true)
    setSaveStatus("Saving...")

    try {
      const res = await updateProfile(
        nextProfile.name,
        nextProfile.showProfilePhoto,
        nextProfile.showUsername
      )

      if (!res.ok) throw new Error()

      setSaveStatus("Saved")

      setTimeout(() => {
        setSaveStatus("")
      }, 1500)
    } catch {
      setSaveStatus("Failed ❌")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleNameCommit = async () => {
    const cleanName = profile.name.trim() || "Guest User"

    const nextProfile = {
      ...profile,
      name: cleanName
    }

    setProfile(nextProfile)

    try {
      await saveProfile(nextProfile)
    } catch (err) {
      console.error("Profile update failed:", err)
    }
  }

  const handleVisibilityToggle = (key, value) => {
    setProfile((current) => {
      const nextProfile = {
        ...current,
        [key]: value
      }

      void saveProfile(nextProfile).catch((err) => {
        console.error("Profile toggle update failed:", err)
      })

      return nextProfile
    })
  }

  const handleDraftChange = (field, value) => {
    setComposerPreview(null)
    setDraft((current) => ({
      ...current,
      [field]: value
    }))
  }

  const closeActiveTicketThread = () => {
    setIsThreadClosing(true)

    window.setTimeout(() => {
      setActiveTicketThread(null)
      setIsThreadClosing(false)
    }, 220)
  }

  const handleCreateTicket = async () => {
    const title = draft.title.trim()
    const details = draft.details.trim()

    if (!title || !details || isCreatingTicket) return

    if (!composerPreview || composerPreview.title !== title || composerPreview.details !== details) {
      setTicketCreateError("")
      setComposerPreview({ title, details })
      return
    }

    setIsCreatingTicket(true)
    setTicketCreateError("")

    try {
      const res = await createTicket(
        title,
        details,
        draft.useProfilePreferences ? draft.showProfilePhoto : false,
        draft.useProfilePreferences ? draft.showUsername : false
      )

      if (!res.ok) throw new Error(res.data.error)

      await fetchTickets(authUser)

      if (res.data.remaining !== undefined) {
        setTicketRateLimit({
          limit: res.data.total,
          remaining: res.data.remaining,
          used: res.data.total - res.data.remaining
        })
      }

      setDraft({
        title: "",
        details: "",
        useProfilePreferences: true,
        showProfilePhoto: profile.showProfilePhoto ?? true,
        showUsername: profile.showUsername ?? true
      })
      setComposerPreview(null)
      setIsComposerOpen(false)
    } catch (error) {
      setTicketCreateError(error?.message || "Unable to create ticket right now.")
      console.error("Ticket error:", error)
    } finally {
      setIsCreatingTicket(false)
    }
  }

  const handleSignOut = async () => {
    if (isSigningOut) {
      return
    }

    setIsSigningOut(true)
    setIsProfileMenuOpen(false)

    try {
      clearJWTToken()

      try {
        await signOutUser()
      } catch (error) {
        console.error("Firebase sign out error:", error)
      }

      clearPersistedAuthState()
    } catch (error) {
      console.error("Sign out process error:", error)
    } finally {
      setIsSignOutConfirmOpen(false)
      setIsSigningOut(false)

      setTimeout(() => {
        window.location.href = "/contact"
      }, 200)
    }
  }

  const handleSignIn = async () => {
    if (isSigningIn) {
      return
    }

    setSignInError("")
    setIsSigningIn(true)

    try {
      const result = await signInWithGoogle()
      const token = await result.user.getIdToken()
      const res = await authGoogle(token)

      if (!res.ok) {
        throw new Error(res.data?.error || "Unable to complete sign in.")
      }
    } catch (error) {
      console.error("Tickets sign in failed:", error)
      setSignInError("Login could not be completed. Please try again.")
    } finally {
      setIsSigningIn(false)
    }
  }

  useEffect(() => {
    if (!authReady || authUser) {
      return
    }

    window.history.replaceState({}, "", "/contact")
    try {
      window.dispatchEvent(new PopStateEvent("popstate"))
    } catch {
      window.dispatchEvent(new Event("popstate"))
    }
  }, [authReady, authUser])

  if (!authReady) {
    return (
      <main className="tickets-page">
        <section className="tickets-shell tickets-state-card">
          <div className="tickets-inline-loader" aria-hidden="true" />
          <p className="tickets-state-text">Checking your secure session</p>
        </section>
      </main>
    )
  }

  if (!authUser) {
    return (
      <main className="tickets-page">
        <section className="tickets-shell tickets-state-card">
          <h1 className="tickets-state-title">Log in to view tickets</h1>
          <p className="tickets-state-text">
            Please log in on the Tickets page first. After login, you can create tickets,
            read replies, and manage your private requests.
          </p>
          <button
            type="button"
            className="tickets-google-button"
            onClick={handleSignIn}
            disabled={isSigningIn}
          >
            {isSigningIn ? (
              <span className="tickets-button-loader" aria-hidden="true" />
            ) : (
              <span className="tickets-google-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="tickets-google-svg">
                  <path fill="#4285F4" d="M21.6 12.23c0-.7-.06-1.37-.18-2.01H12v3.81h5.39a4.61 4.61 0 0 1-2 3.03v2.52h3.24c1.9-1.75 2.97-4.34 2.97-7.35Z" />
                  <path fill="#34A853" d="M12 22c2.7 0 4.97-.89 6.63-2.42l-3.24-2.52c-.9.6-2.06.95-3.39.95-2.6 0-4.8-1.76-5.58-4.12H3.07v2.6A10 10 0 0 0 12 22Z" />
                  <path fill="#FBBC05" d="M6.42 13.89A5.96 5.96 0 0 1 6.11 12c0-.66.11-1.29.31-1.89V7.51H3.07A10 10 0 0 0 2 12c0 1.61.39 3.13 1.07 4.49l3.35-2.6Z" />
                  <path fill="#EA4335" d="M12 5.99c1.47 0 2.8.51 3.84 1.52l2.88-2.88C16.96 2.99 14.69 2 12 2A10 10 0 0 0 3.07 7.51l3.35 2.6c.78-2.36 2.98-4.12 5.58-4.12Z" />
                </svg>
              </span>
            )}
            <span>{isSigningIn ? "Signing in..." : "Continue with Google"}</span>
          </button>
          {signInError ? (
            <p className="tickets-create-error" role="alert">
              {signInError}
            </p>
          ) : null}
        </section>
      </main>
    )
  }

  const profileCreatedAtSeconds = profile.createdAt?.seconds ?? profile.createdAt?._seconds
  const fallbackRemaining =
    ticketRateLimit?.remaining ??
    Math.max(0, 10 - (tickets?.length || 0))

  const fallbackTotal = ticketRateLimit?.limit ?? 10
  const isTicketLimitLoading =
    isTicketsHydrating && ticketRateLimit == null && (tickets?.length || 0) === 0

  const signOutModal =
    isSignOutConfirmOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="tickets-signout-modal"
            role="presentation"
            onClick={() => {
              if (!isSigningOut) {
                setIsSignOutConfirmOpen(false)
              }
            }}
          >
            <div
              className="tickets-signout-modal-dialog tickets-signout-modal-dialog-subtle"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="tickets-signout-modal-title"
              aria-describedby="tickets-signout-modal-copy"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="tickets-signout-modal-header">
                <div
                  className="tickets-signout-modal-icon-wrap tickets-signout-modal-icon-wrap-neutral"
                  aria-hidden="true"
                >
                  <LogOut size={18} strokeWidth={2.1} className="tickets-signout-modal-icon" />
                </div>

                <div className="tickets-signout-modal-copy-wrap">
                  <p className="tickets-signout-modal-kicker">Session</p>
                  <h2 id="tickets-signout-modal-title" className="tickets-signout-modal-title">
                    Log out now?
                  </h2>
                  <p id="tickets-signout-modal-copy" className="tickets-signout-modal-copy">
                    You will leave this workspace and return to the contact page.
                  </p>
                </div>
              </div>

              <div className="tickets-signout-modal-actions tickets-signout-modal-actions-compact">
                <button
                  type="button"
                  className="tickets-signout-modal-btn tickets-signout-modal-btn-neutral"
                  onClick={() => setIsSignOutConfirmOpen(false)}
                  disabled={isSigningOut}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="tickets-signout-modal-btn tickets-signout-modal-btn-dark"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? (
                    <span className="tickets-button-loader" aria-hidden="true" />
                  ) : (
                    "Log out"
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null

  const ticketThreadModal =
    activeTicketThread && typeof document !== "undefined"
      ? createPortal(
          <div
            className={`tickets-thread-modal ${isThreadClosing ? "is-closing" : ""}`.trim()}
            role="presentation"
            onClick={closeActiveTicketThread}
          >
            <div
              className={`tickets-thread-dialog ${isThreadClosing ? "is-closing" : ""}`.trim()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="tickets-thread-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="tickets-thread-head">
                <div className="tickets-thread-hero">
                  <div className="tickets-thread-hero-copy">
                    <p className="tickets-thread-kicker">View ticket</p>
                    <h2 id="tickets-thread-title" className="tickets-thread-title">
                      {activeTicketThread.title}
                    </h2>
                    <p className="tickets-thread-subtitle">
                      Review the full exchange and track the latest admin response in one place.
                    </p>
                  </div>

                  <div className="tickets-thread-meta">
                    <span
                      className={`tickets-status ${(activeTicketThread.status || "").toLowerCase()}`.trim()}
                    >
                      {activeTicketThread.status || "Open"}
                    </span>
                    <span className="tickets-thread-meta-text">
                      {formatTicketDate(activeTicketThread.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="tickets-thread-actions">
                  <button
                    type="button"
                    className="tickets-thread-close"
                    onClick={closeActiveTicketThread}
                    aria-label="Close ticket thread"
                  >
                    <X size={18} strokeWidth={2.2} />
                  </button>
                </div>
              </div>

              <div className="tickets-thread-stream">
                <article className="tickets-thread-row user">
                  <div className="tickets-thread-avatar">
                    <img
                      src={authUser.photoURL || "/assets/profile.png"}
                      alt={authUser.displayName || "User"}
                      className="tickets-thread-avatar-image"
                    />
                  </div>
                  <div className="tickets-thread-message user">
                    <div className="tickets-thread-message-topline">
                      <p className="tickets-thread-message-role">You</p>
                      <span className="tickets-thread-message-time">
                        {formatTicketDate(activeTicketThread.createdAt)}
                      </span>
                    </div>
                    <p className="tickets-thread-message-body">{activeTicketThread.details}</p>
                  </div>
                </article>

                {activeTicketThread.reply ? (
                  <article className="tickets-thread-row admin">
                    <div className="tickets-thread-avatar admin">
                      <img
                        src="/assets/sanket.webp"
                        alt="Admin"
                        className="tickets-thread-avatar-image"
                      />
                    </div>
                    <div className="tickets-thread-message admin">
                      <div className="tickets-thread-message-topline">
                        <p className="tickets-thread-message-role">Admin reply</p>
                        <span className="tickets-thread-message-time">Latest update</span>
                      </div>
                      <p className="tickets-thread-message-body">{activeTicketThread.reply}</p>
                    </div>
                  </article>
                ) : (
                  <div className="tickets-thread-empty-reply">
                    <p className="tickets-thread-empty-reply-title">No reply yet</p>
                    <p className="tickets-thread-empty-reply-copy">
                      This thread view is ready. As soon as the admin replies, the conversation
                      will appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <main className="tickets-page">
      <section
        className={`tickets-shell ${isProfileMenuOpen ? "tickets-shell-panel-open" : ""}`.trim()}
      >
        <div className="tickets-topbar">
          <div className="tickets-topbar-copy">
            <nav className="page-breadcrumb" aria-label="Breadcrumb">
              <a href="/" className="page-breadcrumb-link" title="Home">
                <Home size={14} strokeWidth={2} />
                <span>Home</span>
              </a>
              <ChevronRight size={14} className="page-breadcrumb-separator" strokeWidth={2} />
              <a href="/contact" className="page-breadcrumb-link">
                Contact
              </a>
              <ChevronRight size={14} className="page-breadcrumb-separator" strokeWidth={2} />
              <span className="page-breadcrumb-current" aria-current="page">
                Tickets
              </span>
            </nav>
            <p className="tickets-kicker">Tickets</p>
            <h1 className="tickets-title">
              Secure Contact <span className="tickets-title-highlight">Workspace</span>
            </h1>
            <p className="tickets-subtitle">
              Create and manage support requests in one place.
            </p>
            <p className="tickets-topbar-remaining">
              {isTicketLimitLoading ? (
                <span className="tickets-remaining-loader" role="status" aria-label="Loading ticket limit" />
              ) : (
                <>
                  <span className="tickets-remaining-count">{fallbackRemaining}</span>{" "}
                  tickets remaining out of {fallbackTotal}
                </>
              )}
            </p>
          </div>

          <div className="tickets-profile-menu-wrap" ref={profileMenuRef}>
            <button
              type="button"
              className="tickets-profile-trigger"
              onClick={() => {
                if (isProfileHydrating) {
                  return
                }

                setIsProfileMenuOpen((open) => !open)
              }}
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="dialog"
              aria-busy={isProfileHydrating}
            >
              {isProfileHydrating ? (
                <>
                  <span className="tickets-skeleton-photo" aria-hidden="true" />
                  <span className="tickets-profile-trigger-copy tickets-skeleton-copy" aria-hidden="true">
                    <span className="tickets-skeleton-line tickets-skeleton-line-sm" />
                    <span className="tickets-skeleton-line tickets-skeleton-line-lg" />
                    <span className="tickets-skeleton-line tickets-skeleton-line-md" />
                  </span>
                </>
              ) : (
                <>
                  {profile.showProfilePhoto ? (
                    <span className="tickets-profile-trigger-photo-wrap">
                      <img
                        src={authUser.photoURL || "/assets/profile.png"}
                        alt={authUser.displayName || "Profile"}
                        className="tickets-profile-trigger-photo"
                      />
                    </span>
                  ) : null}
                  <span className="tickets-profile-trigger-copy">
                    <span className="tickets-profile-trigger-eyebrow">Account</span>
                    <span className="tickets-profile-trigger-name">
                      {profile.name || authUser.displayName}
                    </span>
                    {profile.showUsername ? (
                      <span className="tickets-profile-trigger-username">@{profile.username}</span>
                    ) : null}
                  </span>
                </>
              )}

              <ChevronDown size={16} strokeWidth={2.1} className="tickets-profile-trigger-icon" />
            </button>

            {isProfileMenuOpen ? (
              <div
                className="tickets-profile-dropdown"
                role="dialog"
                aria-label="Profile panel"
                aria-busy={isSavingProfile}
              >
                {isProfileHydrating ? (
                  <div className="tickets-profile-skeleton" aria-hidden="true">
                    <div className="tickets-profile-dropdown-head tickets-profile-dropdown-head-skeleton">
                      <span className="tickets-skeleton-line tickets-skeleton-line-sm" />
                      <span className="tickets-skeleton-line tickets-skeleton-line-lg" />
                    </div>

                    <div className="tickets-profile-editor">
                      <span className="tickets-skeleton-box tickets-skeleton-input" />
                      <span className="tickets-skeleton-box tickets-skeleton-input" />
                      <span className="tickets-skeleton-box tickets-skeleton-input" />
                    </div>

                    <div className="tickets-visibility-panel tickets-visibility-panel-skeleton">
                      <span className="tickets-skeleton-box tickets-skeleton-toggle" />
                      <span className="tickets-skeleton-box tickets-skeleton-toggle" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="tickets-profile-dropdown-head">
                      <p className="tickets-profile-dropdown-kicker">Profile settings</p>
                      <p className="tickets-profile-dropdown-name">Manage public identity</p>
                    </div>

                    {profileCreatedAtSeconds ? (
                      <div className="tickets-readonly-card compact">
                        <span>
                          Joined on{" "}
                          {new Intl.DateTimeFormat("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          }).format(new Date(profileCreatedAtSeconds * 1000))}
                        </span>
                      </div>
                    ) : null}

                    <div className="tickets-profile-editor">
                      <label className="tickets-field">
                        <span>Name</span>
                        <input
                          type="text"
                          value={profile.name}
                          onChange={(event) => handleProfileFieldChange("name", event.target.value)}
                          onBlur={handleNameCommit}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.currentTarget.blur()
                            }
                          }}
                          placeholder="Your name"
                        />
                      </label>

                      <div className="tickets-readonly-card compact">
                        <UserRound size={15} strokeWidth={2.1} />
                        <span>@{profile.username}</span>
                      </div>

                      <div className="tickets-readonly-card compact">
                        <Mail size={15} strokeWidth={2.1} />
                        <span>{profile.email || authUser.email}</span>
                      </div>
                    </div>

                    <div className="tickets-visibility-panel">
                      <div className="tickets-toggle-row">
                        <p className="tickets-toggle-label">Show profile photo</p>
                        <div className="tickets-toggle-buttons" role="group" aria-label="Show profile photo">
                          <button
                            type="button"
                            className={`tickets-toggle-btn ${profile.showProfilePhoto ? "active" : ""}`}
                            onClick={() => handleVisibilityToggle("showProfilePhoto", true)}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            className={`tickets-toggle-btn ${!profile.showProfilePhoto ? "active" : ""}`}
                            onClick={() => handleVisibilityToggle("showProfilePhoto", false)}
                          >
                            No
                          </button>
                        </div>
                      </div>

                      <div className="tickets-toggle-row">
                        <p className="tickets-toggle-label">Show username</p>
                        <div className="tickets-toggle-buttons" role="group" aria-label="Show username">
                          <button
                            type="button"
                            className={`tickets-toggle-btn ${profile.showUsername ? "active" : ""}`}
                            onClick={() => handleVisibilityToggle("showUsername", true)}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            className={`tickets-toggle-btn ${!profile.showUsername ? "active" : ""}`}
                            onClick={() => handleVisibilityToggle("showUsername", false)}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    </div>

                    {saveStatus && (
                      <p
                        className={`tickets-profile-saving ${
                          saveStatus.includes("Saving")
                            ? "saving"
                            : saveStatus.includes("Saved")
                            ? "saved"
                            : saveStatus.includes("Failed")
                            ? "error"
                            : ""
                        }`}
                      >
                        {saveStatus}
                      </p>
                    )}

                    <div className="tickets-profile-dropdown-actions">
                      <button
                        type="button"
                        className="tickets-signout"
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                      >
                        <LogOut size={15} strokeWidth={2.1} />
                        <span>{isSigningOut ? "Signing out..." : "Sign out"}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className={`tickets-board-card full ${isComposerOpen ? "tickets-board-card-composer-open" : ""}`.trim()}>
          {isComposerOpen ? (
            <button
              type="button"
              className="tickets-composer-floating-close"
              onClick={() => setIsComposerOpen(false)}
              aria-label="Close new ticket composer"
            >
              <X size={18} strokeWidth={2.2} />
            </button>
          ) : null}

          <div className="tickets-board-head">
            <div className="tickets-board-copy">
              <p className="tickets-board-kicker">Private Requests</p>
              <h2 className="tickets-board-title">Create and manage requests</h2>
              <p className="tickets-board-subtitle">
                Open a new ticket whenever you want to discuss a project, support need, or
                collaboration idea with Sanket.
              </p>
            </div>
            <button
              type="button"
              className={`tickets-new-button ${isComposerOpen ? "is-open" : ""}`.trim()}
              onClick={() => setIsComposerOpen((open) => !open)}
              aria-expanded={isComposerOpen}
              aria-controls="tickets-composer"
            >
              {isComposerOpen ? (
                <X size={15} strokeWidth={2.2} className="tickets-new-button-icon" />
              ) : (
                <Plus size={15} strokeWidth={2.2} className="tickets-new-button-icon" />
              )}
              <span>{isComposerOpen ? "Close Composer" : "New Ticket"}</span>
            </button>
          </div>

          <div
            id="tickets-composer"
            className={`tickets-composer-wrap ${isComposerOpen ? "open" : "closed"}`}
            aria-hidden={!isComposerOpen}
          >
            <div className="tickets-composer">
              <label className="tickets-field">
                <span>Ticket title</span>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(event) => handleDraftChange("title", event.target.value)}
                  placeholder="Need help with a project"
                />
              </label>

              <label className="tickets-field">
                <span>Details</span>
                <textarea
                  value={draft.details}
                  onChange={(event) => handleDraftChange("details", event.target.value)}
                  placeholder="Write what you want to discuss or request."
                  rows={5}
                />
              </label>

              {composerPreview ? (
                <div className="tickets-preview-panel" role="status" aria-live="polite">
                  <p className="tickets-composer-preferences-kicker">Ticket preview</p>
                  <p className="tickets-preview-title">{composerPreview.title}</p>
                  <p className="tickets-preview-details">{composerPreview.details}</p>
                  <p className="tickets-composer-preferences-text">
                    Review this carefully. Click Send Ticket only when it looks right.
                  </p>
                </div>
              ) : null}

              <div className="tickets-composer-preferences">
                <div className="tickets-composer-preferences-copy">
                  <p className="tickets-composer-preferences-kicker">Ticket preferences</p>
                  <p className="tickets-composer-preferences-text">
                    Do you want to use your saved profile preferences for this ticket?
                  </p>
                </div>

                <div className="tickets-visibility-panel">
                  <div className="tickets-toggle-row">
                    <p className="tickets-toggle-label">Use your preferences</p>
                    <div className="tickets-toggle-buttons" role="group" aria-label="Use saved profile preferences">
                      <button
                        type="button"
                        className={`tickets-toggle-btn ${draft.useProfilePreferences ? "active" : ""}`}
                        onClick={() => handleDraftChange("useProfilePreferences", true)}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        className={`tickets-toggle-btn ${!draft.useProfilePreferences ? "active" : ""}`}
                        onClick={() => handleDraftChange("useProfilePreferences", false)}
                      >
                        No
                      </button>
                    </div>
                  </div>
                </div>

                <p className="tickets-composer-preferences-summary">
                  {draft.useProfilePreferences
                    ? `Current profile settings: photo ${
                        draft.showProfilePhoto ? "shown" : "hidden"
                      }, username ${draft.showUsername ? "shown" : "hidden"}.`
                    : "This ticket will hide both your profile photo and username."}
                </p>
              </div>

              <button
                type="button"
                className="tickets-create-button"
                onClick={handleCreateTicket}
                disabled={isCreatingTicket || ticketRateLimit?.remaining === 0}
                aria-label={isCreatingTicket ? "Creating ticket" : composerPreview ? "Send ticket" : "Preview ticket"}
              >
                {isCreatingTicket ? (
                  <span className="tickets-button-loader" aria-hidden="true" />
                ) : composerPreview ? (
                  "Send Ticket"
                ) : (
                  "Preview Ticket"
                )}
              </button>

              {ticketCreateError ? (
                <p className="tickets-create-error" role="alert">
                  {ticketCreateError}
                </p>
              ) : null}

              <p className="tickets-limit-info">
                {isTicketLimitLoading ? (
                  <span
                    className="tickets-remaining-loader"
                    role="status"
                    aria-label="Loading ticket limit"
                  />
                ) : (
                  <>
                    <span className="tickets-remaining-count">
                      {fallbackRemaining}
                    </span>{" "}
                    tickets remaining out of {fallbackTotal}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="tickets-list">
            {isTicketsHydrating ? (
              Array.from({ length: 3 }).map((_, index) => (
                <article
                  className="tickets-item tickets-item-skeleton"
                  key={`ticket-skeleton-${index}`}
                  aria-hidden="true"
                >
                  <div className="tickets-item-head">
                    <div className="tickets-item-title-wrap tickets-item-title-wrap-skeleton">
                      <span className="tickets-skeleton-ticket-icon" />
                      <span className="tickets-skeleton-line tickets-skeleton-line-lg" />
                    </div>
                    <span className="tickets-skeleton-pill" />
                  </div>

                  <div className="tickets-item-details-skeleton">
                    <span className="tickets-skeleton-line tickets-skeleton-line-lg" />
                    <span className="tickets-skeleton-line tickets-skeleton-line-lg" />
                    <span className="tickets-skeleton-line tickets-skeleton-line-md" />
                  </div>

                  <span className="tickets-skeleton-line tickets-skeleton-line-sm tickets-skeleton-date" />
                </article>
              ))
            ) : tickets.length ? (
              tickets.map((ticket) => {
                const status = ticket.status || ""
                const statusClass = status.toLowerCase()
                const statusLabel =
                  status === "Sent" ? "Sent" : status === "Replied" ? "Replied" : status

                const ticketCard = (
                  <>
                    <div className="tickets-item-head">
                      <div className="tickets-item-title-wrap">
                        <Ticket size={15} strokeWidth={2.1} />
                        <h3 className="tickets-item-title">{ticket.title}</h3>
                      </div>
                      <span className={`tickets-status ${statusClass}`.trim()}>{statusLabel}</span>
                    </div>

                    <p className="tickets-item-details">{ticket.details}</p>
                    <p className="tickets-item-date">{formatTicketDate(ticket.createdAt)}</p>
                    <span className="tickets-thread-open-hint">View ticket</span>
                  </>
                )

                return (
                  <button
                    type="button"
                    className="tickets-item tickets-item-thread-trigger"
                    key={ticket.id}
                    onClick={() => setActiveTicketThread(ticket)}
                  >
                    {ticketCard}
                  </button>
                )
              })
            ) : (
              <div className="tickets-empty">
                <p className="tickets-empty-title">No tickets yet</p>
                <p className="tickets-empty-copy">
                  Create your first ticket to start a secure conversation with Sanket.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {signOutModal}
      {ticketThreadModal}
    </main>
  )
}
