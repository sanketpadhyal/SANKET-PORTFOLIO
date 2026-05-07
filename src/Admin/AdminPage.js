import { useCallback, useMemo, useState, useEffect, useRef } from "react"
import { Fingerprint, LockKeyhole, LogOut, Ticket, CreditCard, LayoutDashboard, RefreshCcw, Trash2, Send, CheckCircle2, XCircle, ShieldX, Clock3, Search, ExternalLink, Smartphone } from "lucide-react"
import { startRegistration, startAuthentication } from "@simplewebauthn/browser"
import Navbar from "../navbar/Navbar"
import { adminDeletePayment, adminDeleteTicket, adminListLeaderboardSuccess, adminListPayments, adminListTickets, adminLogin, adminReplyTicket, adminUpdatePaymentStatus, adminGetRegistrationOptions, adminVerifyPasskeyRegistration, adminGetAuthenticationOptions, adminVerifyPasskeyAuthentication, adminListPasskeyDevices, adminRemovePasskeyDevice } from "../api-calls/apicalls"
import "./AdminPage.css"

const arrayBufferToBase64Url = (buffer) => {
  if (!buffer || buffer.byteLength === 0) {
    return ""
  }
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

const toBase64Url = (value) => {
  if (!value) {
    return ""
  }

  if (typeof value === "string") {
    return value
  }

  if (value instanceof ArrayBuffer) {
    return arrayBufferToBase64Url(value)
  }

  if (ArrayBuffer.isView(value)) {
    return arrayBufferToBase64Url(value.buffer)
  }

  return ""
}

const convertCredentialToJSON = (credential) => {
  const credentialIdBase64Url = toBase64Url(credential.rawId || credential.id)

  return {
    id: credentialIdBase64Url,
    rawId: credentialIdBase64Url,
    response: {
      clientDataJSON: toBase64Url(credential.response.clientDataJSON),
      attestationObject: toBase64Url(credential.response.attestationObject)
    },
    type: credential.type
  }
}

const convertAssertionToJSON = (assertion) => {
  const assertionIdBase64Url = toBase64Url(assertion.rawId || assertion.id)

  return {
    id: assertionIdBase64Url,
    rawId: assertionIdBase64Url,
    response: {
      clientDataJSON: toBase64Url(assertion.response.clientDataJSON),
      authenticatorData: toBase64Url(assertion.response.authenticatorData),
      signature: toBase64Url(assertion.response.signature)
    },
    type: assertion.type
  }
}

const initialForm = {
  username: "",
  password: ""
}

const navigateToPath = (path) => {
  if (typeof window === "undefined") {
    return
  }

  if (window.location.pathname === path) {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
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

const tryAdminLogin = async (payload) => {
  try {
    const response = await adminLogin(payload.username, payload.password)

    if (response.ok) {
      return response.data
    }

    throw new Error(response.data?.error || "Invalid credentials")
  } catch (error) {
    throw error instanceof Error ? error : new Error("Login failed")
  }
}

const getAdminTokenExpiry = () => {
  try {
    const token = localStorage.getItem("admin_token")
    const payload = token?.split(".")?.[1]
    if (!payload) return null

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/")
    const decoded = JSON.parse(window.atob(normalizedPayload))
    const expiresAt = Number(decoded?.exp) * 1000

    return Number.isFinite(expiresAt) && expiresAt > 0 ? expiresAt : null
  } catch {
    return null
  }
}

export default function AdminPage() {
  const [form, setForm] = useState(initialForm)
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("admin_token")
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [, setSessionExpired] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [sessionExpiresAt, setSessionExpiresAt] = useState(() => getAdminTokenExpiry())
  const sessionExpiryTimeout = useRef(null)

  const [tickets, setTickets] = useState([])
  const [overviewTickets, setOverviewTickets] = useState([])
  const [ticketsStatus, setTicketsStatus] = useState("Sent")
  const [ticketsQuery, setTicketsQuery] = useState("")
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [ticketsError, setTicketsError] = useState("")
  const [ticketReplies, setTicketReplies] = useState({})

  const [ticketsFresh, setTicketsFresh] = useState(false)
  const ticketsFreshTimeout = useRef(null)

  const [payments, setPayments] = useState([])
  const [overviewPayments, setOverviewPayments] = useState([])
  const [paymentsStatus, setPaymentsStatus] = useState("pending")
  const [paymentsQuery, setPaymentsQuery] = useState("")
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentsError, setPaymentsError] = useState("")
  const [isSyncAnimating, setIsSyncAnimating] = useState(false)
  const syncAnimationTimeout = useRef(null)
  const [paymentsFresh, setPaymentsFresh] = useState(false)
  const paymentsFreshTimeout = useRef(null)

  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [leaderboardError, setLeaderboardError] = useState("")

  const [passkeyDevices, setPasskeyDevices] = useState([])
  const [passkeyDevicesLoading, setPasskeyDevicesLoading] = useState(false)
  const [passkeySetupLoading, setPasskeySetupLoading] = useState(false)
  const [passkeySetupError, setPasskeySetupError] = useState("")
  const [passkeyDeviceName, setPasskeyDeviceName] = useState("")
  const [passkeyLoginLoading, setPasskeyLoginLoading] = useState(false)
  const [passkeyLoginError, setPasskeyLoginError] = useState("")
  const [showPasskeyLogin, setShowPasskeyLogin] = useState(false)
  const [showPasskeySetupModal, setShowPasskeySetupModal] = useState(false)

  const formatTimestamp = (value) => {
    if (!value) return ""
    try {
      if (typeof value.toDate === "function") return value.toDate().toLocaleString()
      if (typeof value.seconds === "number") return new Date(value.seconds * 1000).toLocaleString()
      if (typeof value._seconds === "number") return new Date(value._seconds * 1000).toLocaleString()
      const parsed = new Date(value)
      if (Number.isNaN(parsed.getTime())) return ""
      return parsed.toLocaleString()
    } catch {
      return ""
    }
  }

  const sessionExpiryLabel = useMemo(() => {
    if (!sessionExpiresAt) return "Expiry unavailable"
    return `Expires ${new Date(sessionExpiresAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })}`
  }, [sessionExpiresAt])

  const clearAdminSession = useCallback((message = "Session expired. Please relogin.") => {
    if (sessionExpiryTimeout.current) {
      clearTimeout(sessionExpiryTimeout.current)
      sessionExpiryTimeout.current = null
    }

    setIsAuthenticated(false)
    setError(message)
    setSessionExpired(true)
    setForm(initialForm)
    setActiveTab("overview")
    setSessionExpiresAt(null)
    localStorage.removeItem("admin_token")
  }, [])

  const loadTickets = useCallback(async ({
    silent = false,
    status = ticketsStatus,
    query = ticketsQuery,
    populateList = true,
    populateOverview = true
  } = {}) => {
    if (!silent) setTicketsLoading(true)
    setTicketsError("")
    try {
      const response = await adminListTickets({ status, query, limit: 200 })
      if (!response.ok) {
        throw new Error(response.data?.error || "Failed to load tickets")
      }
      const fetchedTickets = Array.isArray(response.data?.tickets) ? response.data.tickets : []
      if (populateList) {
        setTickets(fetchedTickets)
      }
      if (populateOverview && status === "all" && !query) {
        setOverviewTickets(fetchedTickets)
      }
      if (!silent) {
        setTicketsFresh(true)
        if (ticketsFreshTimeout.current) clearTimeout(ticketsFreshTimeout.current)
        ticketsFreshTimeout.current = setTimeout(() => setTicketsFresh(false), 4200)
      }
    } catch (loadError) {
      setTicketsError(loadError instanceof Error ? loadError.message : "Failed to load tickets")
    } finally {
      if (!silent) setTicketsLoading(false)
    }
  }, [ticketsQuery, ticketsStatus])

  const loadPayments = useCallback(async ({
    silent = false,
    status = paymentsStatus,
    query = paymentsQuery,
    populateList = true,
    populateOverview = true
  } = {}) => {
    if (!silent) setPaymentsLoading(true)
    setPaymentsError("")
    try {
      const response = await adminListPayments({ status, query, limit: 2500 })
      if (!response.ok) {
        throw new Error(response.data?.error || "Failed to load payments")
      }
      const fetchedPayments = Array.isArray(response.data?.payments) ? response.data.payments : []
      if (populateList) {
        setPayments(fetchedPayments)
      }
      if (populateOverview && status === "all" && !query) {
        setOverviewPayments(fetchedPayments)
      }
      if (!silent) {
        setPaymentsFresh(true)
        if (paymentsFreshTimeout.current) clearTimeout(paymentsFreshTimeout.current)
        paymentsFreshTimeout.current = setTimeout(() => setPaymentsFresh(false), 4200)
      }
    } catch (loadError) {
      setPaymentsError(loadError instanceof Error ? loadError.message : "Failed to load payments")
    } finally {
      if (!silent) setPaymentsLoading(false)
    }
  }, [paymentsQuery, paymentsStatus])

  const loadLeaderboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLeaderboardLoading(true)
    setLeaderboardError("")
    try {
      const response = await adminListLeaderboardSuccess({ limit: 12, query: "" })
      if (!response.ok) {
        throw new Error(response.data?.error || "Failed to load leaderboard")
      }
      const items = Array.isArray(response.data?.leaderboard) ? response.data.leaderboard : []
      setLeaderboard(items)
    } catch (err) {
      setLeaderboardError(err instanceof Error ? err.message : "Failed to load leaderboard")
    } finally {
      if (!silent) setLeaderboardLoading(false)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (syncAnimationTimeout.current) {
        clearTimeout(syncAnimationTimeout.current)
      }
      if (sessionExpiryTimeout.current) {
        clearTimeout(sessionExpiryTimeout.current)
      }
      if (ticketsFreshTimeout.current) clearTimeout(ticketsFreshTimeout.current)
      if (paymentsFreshTimeout.current) clearTimeout(paymentsFreshTimeout.current)
    }
  }, [])

  const handleSync = async () => {
    setIsSyncAnimating(false)
    requestAnimationFrame(() => {
      setIsSyncAnimating(true)
    })
    if (syncAnimationTimeout.current) {
      clearTimeout(syncAnimationTimeout.current)
    }

    setTicketsLoading(true)
    setPaymentsLoading(true)

    try {
      await Promise.all([
        loadTickets({
          silent: true,
          status: "all",
          query: "",
          populateList: activeTab === "tickets",
          populateOverview: true
        }),
        loadPayments({
          silent: true,
          status: "all",
          query: "",
          populateList: activeTab === "payments",
          populateOverview: true
        })
      ])

      if (activeTab === "tickets") {
        await loadTickets({ silent: true, status: ticketsStatus, query: ticketsQuery, populateOverview: false })
      }

      if (activeTab === "payments") {
        await loadPayments({ silent: true, status: paymentsStatus, query: paymentsQuery, populateOverview: false })
      }
    } finally {
      setTicketsLoading(false)
      setPaymentsLoading(false)
    }

    syncAnimationTimeout.current = setTimeout(() => {
      setIsSyncAnimating(false)
    }, 900)
  }

  const welcomeCopy = useMemo(
    () => ({
      title: "Sanket Padhyal",
      subtitle: "Tickets, leaderboard payments, and moderation controls in one protected console."
    }),
    []
  )

  const adminSubtitle = useMemo(() => {
    if (activeTab === "security") {
      return "Manage trusted devices, passkeys, and secure access to this admin console."
    }
    return welcomeCopy.subtitle
  }, [activeTab, welcomeCopy.subtitle])

  const ticketStats = useMemo(() => ({
    total: overviewTickets.length,
    pending: overviewTickets.filter((ticket) => (ticket.status || "Sent").toLowerCase() !== "replied").length,
    replied: overviewTickets.filter((ticket) => (ticket.status || "").toLowerCase() === "replied").length
  }), [overviewTickets])

  const paymentStats = useMemo(() => ({
    total: overviewPayments.length,
    pending: overviewPayments.filter((payment) => (payment.status || "pending").toLowerCase() === "pending").length,
    success: overviewPayments.filter((payment) => (payment.status || "").toLowerCase() === "success").length,
    failed: overviewPayments.filter((payment) => (payment.status || "").toLowerCase() === "failed").length
  }), [overviewPayments])

  const statusClassName = (status) => {
    const normalized = String(status || "pending").toLowerCase()
    if (normalized === "replied" || normalized === "success") return "is-success"
    if (normalized === "failed") return "is-danger"
    return "is-pending"
  }

  const handleFieldChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    const username = form.username.trim()
    const password = form.password

    if (!username || !password) {
      setError("Enter your username and password.")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const data = await tryAdminLogin({ username, password })
      localStorage.setItem("admin_token", data.token)
      setSessionExpiresAt(getAdminTokenExpiry())
      setSessionExpired(false)
      setIsAuthenticated(true)
      setForm(initialForm)
    } catch (submitError) {
      setError(submitError?.message || "Login failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setError("")
    setSessionExpired(false)
    setForm(initialForm)
    setActiveTab("overview")
    setSessionExpiresAt(null)
    localStorage.removeItem("admin_token")
    navigateToPath("/")
  }

  const loadPasskeyDevices = useCallback(async () => {
    setPasskeyDevicesLoading(true)
    try {
      const response = await adminListPasskeyDevices()
      if (response.ok) {
        setPasskeyDevices(response.data.devices || [])
      } else {
        setPasskeyDevicesLoading(false)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setPasskeyDevicesLoading(false)
    }
  }, [])

  const handleSetupPasskey = async () => {
    setPasskeySetupLoading(true)
    setPasskeySetupError("")
    try {
      const optionsResponse = await adminGetRegistrationOptions()
      if (!optionsResponse.ok) {
        setPasskeySetupError("Failed to get registration options")
        setPasskeySetupLoading(false)
        return
      }

      const attestationResponse = await startRegistration(optionsResponse.data.options)
      const credentialJSON = convertCredentialToJSON(attestationResponse)

      const verifyResponse = await adminVerifyPasskeyRegistration({
        credential: credentialJSON,
        deviceName: passkeyDeviceName || "My Device"
      })

      if (verifyResponse.ok) {
        setShowPasskeySetupModal(false)
        setPasskeyDeviceName("")
        await loadPasskeyDevices()
      } else {
        setPasskeySetupError(verifyResponse.data.error || "Registration failed")
      }
    } catch (err) {
      setPasskeySetupError(err.message || "Registration failed")
    } finally {
      setPasskeySetupLoading(false)
    }
  }

  const handleRemoveDevice = async (deviceId) => {
    if (!window.confirm("Remove this device?")) return

    try {
      const response = await adminRemovePasskeyDevice({ deviceId })
      if (response.ok) {
        await loadPasskeyDevices()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handlePasskeyLogin = async () => {
    setPasskeyLoginLoading(true)
    setPasskeyLoginError("")
    try {
      const optionsResponse = await adminGetAuthenticationOptions()
      if (!optionsResponse.ok) {
        setPasskeyLoginError("Failed to start authentication")
        setPasskeyLoginLoading(false)
        return
      }

      const assertionResponse = await startAuthentication(optionsResponse.data.options)
      const credentialJSON = convertAssertionToJSON(assertionResponse)

      const verifyResponse = await adminVerifyPasskeyAuthentication({
        credential: credentialJSON,
        sessionId: optionsResponse.data.sessionId
      })

      if (verifyResponse.ok) {
        localStorage.setItem("admin_token", verifyResponse.data.token)
        setSessionExpiresAt(getAdminTokenExpiry())
        setSessionExpired(false)
        setIsAuthenticated(true)
        setForm(initialForm)
        setShowPasskeyLogin(false)
      } else {
        setPasskeyLoginError(verifyResponse.data.error || "Authentication failed")
      }
    } catch (err) {
      setPasskeyLoginError(err.message || "Authentication failed")
    } finally {
      setPasskeyLoginLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return
    setSessionExpiresAt(getAdminTokenExpiry())
    if (activeTab === "overview") {
      void loadTickets({ silent: true, status: "all", query: "", populateList: false, populateOverview: true })
      void loadPayments({ silent: true, status: "all", query: "", populateList: false, populateOverview: true })
      void loadLeaderboard({ silent: true })
      return
    }
    if (activeTab === "tickets") void loadTickets()
    if (activeTab === "payments") void loadPayments()
    if (activeTab === "security") void loadPasskeyDevices()
  }, [activeTab, isAuthenticated, loadLeaderboard, loadPayments, loadTickets, loadPasskeyDevices])

  useEffect(() => {
    if (sessionExpiryTimeout.current) {
      clearTimeout(sessionExpiryTimeout.current)
      sessionExpiryTimeout.current = null
    }

    if (!isAuthenticated) return

    const expiresAt = sessionExpiresAt ?? getAdminTokenExpiry()
    if (!expiresAt) {
      return
    }

    const timeUntilExpiry = expiresAt - Date.now()
    if (timeUntilExpiry <= 0) {
      clearAdminSession()
      return
    }

    sessionExpiryTimeout.current = setTimeout(() => {
      clearAdminSession()
    }, timeUntilExpiry)

    return () => {
      if (sessionExpiryTimeout.current) {
        clearTimeout(sessionExpiryTimeout.current)
        sessionExpiryTimeout.current = null
      }
    }
  }, [clearAdminSession, isAuthenticated, sessionExpiresAt])

  useEffect(() => {
    if (!isAuthenticated) return
    if (activeTab !== "tickets") return
    const handle = window.setTimeout(() => void loadTickets({ silent: true }), 150)
    return () => window.clearTimeout(handle)
  }, [ticketsStatus, ticketsQuery, activeTab, isAuthenticated, loadTickets])

  useEffect(() => {
    if (!isAuthenticated) return
    if (activeTab !== "payments") return
    setPaymentsLoading(true)
    const handle = window.setTimeout(() => void loadPayments(), 150)
    return () => {
      window.clearTimeout(handle)
      setPaymentsLoading(false)
    }
  }, [paymentsStatus, paymentsQuery, activeTab, isAuthenticated, loadPayments])

  return (
    <>
      <Navbar />

      <main className="admin-page">
        <section className="admin-shell">
          {!isAuthenticated ? (
            <div className="admin-auth-layout">
              <form className="admin-login-card" onSubmit={handleSubmit}>
                <div className="admin-login-card-head">
                  <div className="admin-icon-tile" aria-hidden="true">
                    <img src="/assets/sanket.webp" alt="Sanket logo" className="admin-brand-mark-image" />
                  </div>
                  <div>
                    <p className="admin-login-kicker">Secure Login</p>
                    <h2 className="admin-login-title">Admin sign in</h2>
                  </div>
                </div>

                <label className="admin-field">
                  <span>Username</span>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(event) => handleFieldChange("username", event.target.value)}
                    placeholder="Enter admin username"
                    autoComplete="username"
                    disabled={isSubmitting}
                  />
                </label>

                <label className="admin-field">
                  <span>Password</span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => handleFieldChange("password", event.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                  />
                </label>

                {error ? (
                  <p className="admin-login-error" role="alert">
                    {error}
                  </p>
                ) : null}

                {!showPasskeyLogin ? (
                  <>
                    <button type="submit" className="admin-login-button" disabled={isSubmitting}>
                      {isSubmitting ? <span className="admin-button-loader" aria-hidden="true" /> : null}
                      <span>{isSubmitting ? "Signing in..." : "Sign in"}</span>
                    </button>
                    <div className="admin-login-divider" aria-hidden="true">
                      <span>or</span>
                    </div>
                    <button
                      type="button"
                      className="admin-login-toggle-button"
                      onClick={() => {
                        setShowPasskeyLogin(true)
                        setError("")
                        setPasskeyLoginError("")
                      }}
                    >
                        <Fingerprint size={16} strokeWidth={2.2} />
                        <span>Continue with Passkey</span>
                    </button>
                  </>
                ) : (
                  <>
                    {passkeyLoginError ? (
                      <p className="admin-login-error" role="alert">
                        {passkeyLoginError}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className="admin-login-button admin-login-button-passkey"
                      onClick={handlePasskeyLogin}
                      disabled={passkeyLoginLoading}
                    >
                      {passkeyLoginLoading ? <span className="admin-button-loader" aria-hidden="true" /> : null}
                      <Fingerprint size={16} strokeWidth={2.2} />
                      <span>{passkeyLoginLoading ? "Authenticating..." : "Continue with Passkey"}</span>
                    </button>
                    <button
                      type="button"
                      className="admin-login-toggle-button"
                      onClick={() => {
                        setShowPasskeyLogin(false)
                        setPasskeyLoginError("")
                      }}
                    >
                      <LockKeyhole size={16} strokeWidth={2.2} />
                      <span>Back to password login</span>
                    </button>
                  </>
                )}
              </form>
            </div>
          ) : (
            <section className="admin-dashboard">
              <aside className="admin-console-sidebar" aria-label="Admin navigation">
                <div className="admin-brand">
                  <div className="admin-brand-mark" aria-hidden="true">
                    <img src="/assets/sanket.webp" alt="Sanket logo" className="admin-brand-mark-image" />
                  </div>
                  <div>
                    <p className="admin-kicker">Admin Panel</p>
                    {(() => {
                      const parts = String(welcomeCopy.title || "").split(" ")
                      const first = parts.shift() || ""
                      const last = parts.join(" ")
                      return (
                        <h1 className="admin-title">
                          <span className="admin-name-first">{first}</span>
                          {last ? <span className="admin-name-last"> {last}</span> : null}
                        </h1>
                      )
                    })()}
                  </div>
                </div>

                <div className="admin-session-card">
                  <span className="admin-status-dot" aria-hidden="true" />
                  <div>
                    <p className="admin-session-title">Session active</p>
                    <p className="admin-session-expiry">{sessionExpiryLabel}</p>
                  </div>
                </div>

                <div className="admin-tabs" role="tablist" aria-label="Admin sections">
                  <button
                    type="button"
                    className={`admin-tab ${activeTab === "overview" ? "is-active" : ""}`}
                    onClick={() => setActiveTab("overview")}
                    role="tab"
                    aria-selected={activeTab === "overview"}
                  >
                    <LayoutDashboard size={16} strokeWidth={2.2} />
                    <span>Overview</span>
                  </button>
                  <button
                    type="button"
                    className={`admin-tab ${activeTab === "security" ? "is-active" : ""}`}
                    onClick={() => setActiveTab("security")}
                    role="tab"
                    aria-selected={activeTab === "security"}
                  >
                    <LockKeyhole size={16} strokeWidth={2.2} />
                    <span>Security</span>
                  </button>
                  <button
                    type="button"
                    className={`admin-tab ${activeTab === "tickets" ? "is-active" : ""}`}
                    onClick={() => setActiveTab("tickets")}
                    role="tab"
                    aria-selected={activeTab === "tickets"}
                  >
                    <Ticket size={16} strokeWidth={2.2} />
                    <span>Tickets</span>
                    <strong>{ticketStats.pending}</strong>
                  </button>
                  <button
                    type="button"
                    className={`admin-tab ${activeTab === "payments" ? "is-active" : ""}`}
                    onClick={() => setActiveTab("payments")}
                    role="tab"
                    aria-selected={activeTab === "payments"}
                  >
                    <CreditCard size={16} strokeWidth={2.2} />
                    <span>Payments</span>
                    <strong>{paymentStats.pending}</strong>
                  </button>
                </div>

                <button
                  type="button"
                  className="admin-passkey-setup-button"
                  onClick={() => setShowPasskeySetupModal(true)}
                >
                  <Fingerprint size={16} strokeWidth={2.1} />
                  <span>Set up Passkey</span>
                </button>

                <button
                  type="button"
                  className="admin-logout-button"
                  onClick={() => {
                    const ok = window.confirm("Are you sure you want to log out?")
                    if (!ok) return
                    handleLogout()
                  }}
                >
                  <LogOut size={16} strokeWidth={2.1} />
                  <span>Log out</span>
                </button>
              </aside>

              <div className="admin-console-main">
                <header className="admin-command-bar">
                  <div>
                    <p className="admin-kicker">{activeTab}</p>
                    <h2 className="admin-command-title">
                      {activeTab === "overview"
                        ? "Control center"
                        : activeTab === "security"
                          ? "Security"
                          : activeTab === "tickets"
                            ? "Ticket desk"
                            : "Payment review"}
                    </h2>
                    <p className="admin-subtitle">{adminSubtitle}</p>
                  </div>

                  <button type="button" className="admin-icon-button" onClick={handleSync}>
                    <RefreshCcw size={16} strokeWidth={2.2} className={`admin-sync-icon ${isSyncAnimating ? "is-animating" : ""}`} />
                    <span>Sync</span>
                  </button>
                </header>

                {activeTab === "overview" ? (
                  <>
                    <div className="admin-overview">
                      <article className="admin-metric-card">
                        <Ticket size={18} strokeWidth={2.2} />
                        <span>Open tickets</span>
                        <strong>{ticketStats.pending}</strong>
                      </article>
                      <article className="admin-metric-card">
                        <CreditCard size={18} strokeWidth={2.2} />
                        <span>Pending payments</span>
                        <strong>{paymentStats.pending}</strong>
                      </article>
                      <article className="admin-metric-card">
                        <CheckCircle2 size={18} strokeWidth={2.2} />
                        <span>Approved payments</span>
                        <strong>{paymentStats.success}</strong>
                      </article>
                      <article className="admin-metric-card">
                        <Clock3 size={18} strokeWidth={2.2} />
                        <span>Records loaded</span>
                        <strong>{ticketStats.total + paymentStats.total}</strong>
                      </article>
                    </div>

                    <div className="admin-leaderboard-section">
                      <div className="admin-leaderboard-header">
                        <h3 className="admin-section-title">Leaderboard (Successful Payments)</h3>
                        <button
                          type="button"
                          className="admin-icon-button"
                          onClick={() => loadLeaderboard()}
                          disabled={leaderboardLoading}
                        >
                          {leaderboardLoading ? (
                            <RefreshCcw size={16} strokeWidth={2.2} className="admin-refresh-icon is-animating" />
                          ) : (
                            <RefreshCcw size={16} strokeWidth={2.2} className="admin-refresh-icon" />
                          )}
                          <span>{leaderboardLoading ? "Loading..." : "Refresh"}</span>
                        </button>
                      </div>

                      {leaderboardError ? (
                        <p className="admin-inline-error" role="alert">{leaderboardError}</p>
                      ) : null}

                      {leaderboard.length === 0 && !leaderboardLoading ? (
                        <p className="admin-empty">No successful payments yet.</p>
                      ) : null}

                      <div className="admin-leaderboard-list" aria-busy={leaderboardLoading ? "true" : "false"}>
                        {leaderboard.map((row) => (
                          <div key={row.id} className="admin-leaderboard-row">
                            <div className="admin-leaderboard-left">
                              <div className="admin-leaderboard-rank">#{row.rank}</div>
                              <div className="admin-leaderboard-user">
                                {row.profilePhotoUrl ? (
                                  <img
                                    src={row.profilePhotoUrl}
                                    alt={row.name || "User"}
                                    className="admin-leaderboard-photo"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="admin-leaderboard-photo admin-leaderboard-photo-fallback" aria-hidden="true" />
                                )}
                                <div className="admin-leaderboard-meta">
                                  <div className="admin-leaderboard-name">{row.name || "Unknown"}</div>
                                </div>
                              </div>
                            </div>
                            <div className="admin-leaderboard-amount">
                              {row.amount} {row.currency || "INR"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}

              {activeTab === "security" ? (
                <section className="admin-section" aria-label="Security devices">
                  <header className="admin-section-header">
                    <div>
                      <p className="admin-panel-kicker">Security</p>
                      <h2 className="admin-panel-title">Security Devices</h2>
                    </div>
                    <button
                      type="button"
                      className="admin-icon-button"
                      onClick={() => loadPasskeyDevices()}
                      disabled={passkeyDevicesLoading}
                    >
                      {passkeyDevicesLoading ? (
                        <RefreshCcw size={16} strokeWidth={2.2} className="admin-refresh-icon is-animating" />
                      ) : (
                        <RefreshCcw size={16} strokeWidth={2.2} className="admin-refresh-icon" />
                      )}
                      <span>{passkeyDevicesLoading ? "Loading..." : "Refresh"}</span>
                    </button>
                  </header>

                  {passkeyDevicesLoading ? (
                    <div className="admin-device-skeleton-list" aria-hidden="true">
                      {[0, 1, 2].map((index) => (
                        <div key={`device-skeleton-${index}`} className="admin-device-skeleton">
                          <div className="admin-device-skeleton-info">
                            <span className="admin-device-skeleton-icon" />
                            <div className="admin-device-skeleton-copy">
                              <span className="admin-skeleton-line admin-skeleton-line-lg" />
                              <span className="admin-skeleton-line admin-skeleton-line-sm" />
                            </div>
                          </div>
                          <span className="admin-skeleton-pill admin-device-skeleton-pill" />
                        </div>
                      ))}
                    </div>
                  ) : passkeyDevices.length === 0 ? (
                    <p className="admin-empty">No devices registered. Set up Touch ID to get started.</p>
                  ) : (
                    <div className="admin-device-list">
                      {passkeyDevices.map((device) => (
                        <div key={device.id} className="admin-device-item">
                          <div className="admin-device-info">
                            <Smartphone size={18} strokeWidth={2} />
                            <div>
                              <p className="admin-device-name">{device.deviceName}</p>
                              <p className="admin-device-date">
                                Added {formatTimestamp(device.createdAt) || "Unknown"}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="admin-danger-button admin-device-remove-button"
                            onClick={() => handleRemoveDevice(device.id)}
                            aria-label={`Remove ${device.deviceName || "device"}`}
                            title="Remove device"
                          >
                            <ShieldX size={18} strokeWidth={2.2} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ) : null}

              {activeTab === "tickets" ? (
                <section className="admin-section" aria-label="Ticket management">
                  <header className="admin-section-header">
                    <div>
                      <p className="admin-panel-kicker">Tickets</p>
                      <h2 className="admin-panel-title">Ticket Operations</h2>
                    </div>
                    <button type="button" className="admin-icon-button" onClick={() => loadTickets()}>
                      {ticketsLoading ? (
                        <RefreshCcw size={16} strokeWidth={2.2} className="admin-refresh-icon is-animating" />
                      ) : ticketsFresh ? (
                        <CheckCircle2 size={16} strokeWidth={2.2} className="admin-refresh-icon is-ok" />
                      ) : (
                        <RefreshCcw size={16} strokeWidth={2.2} className="admin-refresh-icon" />
                      )}
                      <span>{ticketsLoading ? "Refreshing..." : ticketsFresh ? "Up to date" : "Refresh"}</span>
                    </button>
                  </header>

                  <div className="admin-filters">
                    <label className="admin-filter">
                      <span>Status</span>
                      <select value={ticketsStatus} onChange={(e) => setTicketsStatus(e.target.value)} disabled={ticketsLoading}>
                        <option value="Sent">Pending</option>
                        <option value="Replied">Replied</option>
                      </select>
                    </label>
                    <label className="admin-filter admin-filter-grow">
                      <span>Search</span>
                      <div className="admin-filter-search">
                        <Search size={15} strokeWidth={2.2} aria-hidden="true" />
                      <input
                        value={ticketsQuery}
                        onChange={(e) => setTicketsQuery(e.target.value)}
                        placeholder="Search title, email, uid..."
                        disabled={ticketsLoading}
                      />
                      </div>
                    </label>
                  </div>

                  {ticketsError ? <p className="admin-inline-error" role="alert">{ticketsError}</p> : null}

                  <div className="admin-list" aria-busy={ticketsLoading ? "true" : "false"}>
                    {tickets.length === 0 && !ticketsLoading ? (
                      <p className="admin-empty">
                        {ticketsQuery
                          ? "No tickets match your search."
                          : ticketsStatus === "Sent"
                            ? "No pending tickets."
                            : "No replied tickets."}
                      </p>
                    ) : null}

                    {tickets.map((ticket) => (
                      <article key={ticket.id} className="admin-item-card">
                        {ticket.profilePhoto || ticket.name ? (
                          <div className="admin-item-user-banner">
                            {ticket.profilePhoto ? (
                              <img src={ticket.profilePhoto} alt={ticket.name || "User"} className="admin-item-user-photo" />
                            ) : null}
                            {ticket.name ? (
                              <span className="admin-item-user-name">{ticket.name}</span>
                            ) : null}
                          </div>
                        ) : null}
                        <header className="admin-item-head">
                          <div className="admin-item-meta">
                            <h3 className="admin-item-title">{ticket.title || "Untitled"}</h3>
                            <p className="admin-item-sub">
                              <span className={`admin-status-badge ${statusClassName(ticket.status || "Sent")}`}>{ticket.status || "Sent"}</span>
                              {ticket.email ? <span>{ticket.email}</span> : null}
                              {ticket.createdAt ? <span>{formatTimestamp(ticket.createdAt)}</span> : null}
                            </p>
                          </div>
                          <div className="admin-item-actions">
                            <button
                              type="button"
                              className="admin-danger-button"
                              onClick={async () => {
                                const ok = window.confirm("Delete this ticket?")
                                if (!ok) return
                                const resp = await adminDeleteTicket({ ticketId: ticket.id })
                                if (!resp.ok) {
                                  setTicketsError(resp.data?.error || "Delete failed")
                                  return
                                }
                                void loadTickets({ silent: true })
                              }}
                            >
                              <Trash2 size={16} strokeWidth={2.2} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </header>

                        <p className="admin-item-body">{ticket.details || ""}</p>

                        {(ticket.status || "Sent").toLowerCase() === "replied" ? (
                          <div className="admin-reply admin-reply-disabled">
                            <p className="admin-reply-locked">✓ Already replied to this ticket</p>
                            {ticket.reply ? (
                              <div className="admin-reply-content">
                                <p className="admin-reply-label">Your reply:</p>
                                <p className="admin-reply-text">{ticket.reply}</p>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="admin-reply">
                            <textarea
                              value={ticketReplies[ticket.id] ?? (ticket.reply || "")}
                              onChange={(e) => setTicketReplies((current) => ({ ...current, [ticket.id]: e.target.value }))}
                              placeholder="Write a reply..."
                              rows={3}
                            />
                            <button
                              type="button"
                              className="admin-primary-button"
                              onClick={async () => {
                                const replyText = String(ticketReplies[ticket.id] ?? ticket.reply ?? "").trim()
                                if (!replyText) return
                                const ok = window.confirm("Are you sure you want to send this reply?")
                                if (!ok) return
                                const resp = await adminReplyTicket({ ticketId: ticket.id, reply: replyText })
                                if (!resp.ok) {
                                  setTicketsError(resp.data?.error || "Reply failed")
                                  return
                                }
                                setTicketReplies((current) => {
                                  const next = { ...current }
                                  delete next[ticket.id]
                                  return next
                                })
                                void loadTickets({ silent: true, status: ticketsStatus, query: ticketsQuery })
                              }}
                            >
                              <Send size={16} strokeWidth={2.2} />
                              <span>Send reply</span>
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              {activeTab === "payments" ? (
                <section className="admin-section" aria-label="Payment moderation">
                  <header className="admin-section-header">
                    <div>
                      <p className="admin-panel-kicker">Payments</p>
                      <h2 className="admin-panel-title">Payment Operations</h2>
                    </div>
                    <button type="button" className="admin-icon-button" onClick={() => loadPayments()}>
                      {paymentsLoading ? (
                        <RefreshCcw size={16} strokeWidth={2.2} className="admin-refresh-icon is-animating" />
                      ) : paymentsFresh ? (
                        <CheckCircle2 size={16} strokeWidth={2.2} className="admin-refresh-icon is-ok" />
                      ) : (
                        <RefreshCcw size={16} strokeWidth={2.2} className="admin-refresh-icon" />
                      )}
                      <span>{paymentsLoading ? "Refreshing..." : paymentsFresh ? "Up to date" : "Refresh"}</span>
                    </button>
                  </header>

                  <div className="admin-filters">
                    <label className="admin-filter">
                      <span>Status</span>
                      <select value={paymentsStatus} onChange={(e) => setPaymentsStatus(e.target.value)} disabled={paymentsLoading}>
                        <option value="pending">Pending</option>
                        <option value="success">Success</option>
                        <option value="failed">Failed</option>
                      </select>
                    </label>
                    <label className="admin-filter admin-filter-grow">
                      <span>Search</span>
                      <div className="admin-filter-search">
                        <Search size={15} strokeWidth={2.2} aria-hidden="true" />
                      <input
                        value={paymentsQuery}
                        onChange={(e) => setPaymentsQuery(e.target.value)}
                        placeholder="Search name, txn id..."
                        disabled={paymentsLoading}
                      />
                      </div>
                    </label>
                  </div>

                  {paymentsError ? <p className="admin-inline-error" role="alert">{paymentsError}</p> : null}

                  <div className="admin-list" aria-busy={paymentsLoading ? "true" : "false"}>
                    {payments.length === 0 && !paymentsLoading ? (
                      <p className="admin-empty">
                        {paymentsQuery
                          ? "No payments match your search."
                          : `No ${paymentsStatus} payments found.`}
                      </p>
                    ) : null}

                    {payments.map((payment) => (
                      <article key={payment.id} className="admin-item-card">
                        <header className="admin-item-head">
                          <div className="admin-item-meta">
                            <h3 className="admin-item-title">{payment.name || "Unknown"} - {payment.amount || ""} {payment.currency || "INR"}</h3>
                            <p className="admin-item-sub">
                              <span className={`admin-status-badge ${statusClassName(payment.status || "pending")}`}>{payment.status || "pending"}</span>
                              {payment.transactionId ? <span>Txn {payment.transactionId}</span> : null}
                              {payment.createdAt ? <span>{formatTimestamp(payment.createdAt)}</span> : null}
                            </p>
                          </div>
                          <div className="admin-item-actions admin-item-actions-wide">
                            {String(payment.status || "pending").toLowerCase() !== "success" ? (
                              <button
                                type="button"
                                className="admin-success-button"
                                onClick={async () => {
                                  const ok = window.confirm("Mark this payment as SUCCESS?")
                                  if (!ok) return
                                  const resp = await adminUpdatePaymentStatus({ paymentId: payment.id, status: "success" })
                                  if (!resp.ok) {
                                    setPaymentsError(resp.data?.error || "Update failed")
                                    return
                                  }
                                  void loadPayments({ silent: true })
                                  void loadLeaderboard({ silent: true })
                                }}
                              >
                                <CheckCircle2 size={16} strokeWidth={2.2} />
                                <span>Success</span>
                              </button>
                            ) : null}
                            {String(payment.status || "pending").toLowerCase() !== "failed" ? (
                              <button
                                type="button"
                                className="admin-warn-button"
                                onClick={async () => {
                                  const ok = window.confirm("Mark this payment as FAILED?")
                                  if (!ok) return
                                  const resp = await adminUpdatePaymentStatus({ paymentId: payment.id, status: "failed" })
                                  if (!resp.ok) {
                                    setPaymentsError(resp.data?.error || "Update failed")
                                    return
                                  }
                                  void loadPayments({ silent: true })
                                  void loadLeaderboard({ silent: true })
                                }}
                              >
                                <XCircle size={16} strokeWidth={2.2} />
                                <span>Fail</span>
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="admin-danger-button"
                              onClick={async () => {
                                const ok = window.confirm("Delete this payment entry?")
                                if (!ok) return
                                const resp = await adminDeletePayment({ paymentId: payment.id })
                                if (!resp.ok) {
                                  setPaymentsError(resp.data?.error || "Delete failed")
                                  return
                                }
                                void loadPayments({ silent: true })
                                void loadLeaderboard({ silent: true })
                              }}
                            >
                              <Trash2 size={16} strokeWidth={2.2} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </header>

                        {payment.message ? <p className="admin-item-body">{payment.message}</p> : null}

                        <div className="admin-payment-links">
                          {payment.paymentProofUrl ? (
                            <a className="admin-link-chip" href={payment.paymentProofUrl} target="_blank" rel="noreferrer">
                              <ExternalLink size={14} strokeWidth={2.2} />
                              <span>Proof</span>
                            </a>
                          ) : null}
                          {payment.profilePhotoUrl ? (
                            <a className="admin-link-chip" href={payment.profilePhotoUrl} target="_blank" rel="noreferrer">
                              <ExternalLink size={14} strokeWidth={2.2} />
                              <span>Profile</span>
                            </a>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              </div>
            </section>
          )}
        </section>

      </main>

      {showPasskeySetupModal ? (
        <div className="admin-modal-overlay" onClick={() => setShowPasskeySetupModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">Set up Passkey</h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setShowPasskeySetupModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="admin-modal-body">
              <label className="admin-field">
                <span>Device Name</span>
                <input
                  type="text"
                  value={passkeyDeviceName}
                  onChange={(e) => setPasskeyDeviceName(e.target.value)}
                  placeholder="e.g., MacBook Pro"
                  disabled={passkeySetupLoading}
                />
              </label>
              {passkeySetupError ? (
                <p className="admin-login-error">{passkeySetupError}</p>
              ) : null}
            </div>
            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-primary-button"
                onClick={handleSetupPasskey}
                disabled={passkeySetupLoading}
              >
                {passkeySetupLoading ? "Setting up..." : "Setup"}
              </button>
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => setShowPasskeySetupModal(false)}
                disabled={passkeySetupLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
