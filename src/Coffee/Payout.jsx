import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Home, ChevronRight, CircleCheckBig, X } from "lucide-react"
import QRCode from "qrcode"
import "./Payout.css"

const PAYOUT_STORAGE_KEY = "coffee-support-draft"
const PAYOUT_UI_STORAGE_KEY = "coffee-support-payout-ui"
const ATTACHMENT_ENTRY_KEY = "coffee-attachment-entry"
const ATTACHMENT_ENTRY_FALLBACK_KEY = "coffee-attachment-entry-fallback"
const DEFAULT_AMOUNT = 20
const UPI_ID = process.env.REACT_APP_UPI_ID || ""
const UPI_NAME = process.env.REACT_APP_UPI_NAME || "Sanket Padhyal"
const REDIRECT_ILLUS_SRC = "/assets/illus.webp"
const COFFEE_ICON_SRC = "/assets/coffee.png"
const PHONEPE_ICON_SRC = "/assets/phonepe.webp"
const GPAY_ICON_SRC = "/assets/gpay.webp"
const PAYTM_ICON_SRC = "/assets/paytm.webp"
const FAMPAY_ICON_SRC = "/assets/fampay.webp"

const PhonePeMark = () => (
  <img src={PHONEPE_ICON_SRC} alt="PhonePe" className="payout-brand-img payout-brand-mark-phonepe" aria-hidden="true" />
)

const GooglePayMark = () => (
  <img src={GPAY_ICON_SRC} alt="Google Pay" className="payout-brand-img payout-brand-mark-gpay" aria-hidden="true" />
)

const PaytmMark = () => (
  <img src={PAYTM_ICON_SRC} alt="Paytm" className="payout-brand-img payout-brand-mark-paytm" aria-hidden="true" />
)

const FamPayMark = () => (
  <img src={FAMPAY_ICON_SRC} alt="FamPay" className="payout-brand-img payout-brand-mark-fampay" aria-hidden="true" />
)

const PAYMENT_APPS = [
  { id: "phonepe", label: "PhonePe", icon: <PhonePeMark />, androidPackage: "com.phonepe.app", iosScheme: "phonepe://pay" },
  { id: "gpay", label: "Google Pay", icon: <GooglePayMark />, androidPackage: "com.google.android.apps.nbu.paisa.user", iosScheme: "tez://upi/pay" },
  { id: "paytm", label: "Paytm", icon: <PaytmMark />, androidPackage: "net.one97.paytm", iosScheme: "paytmmp://pay" },
  { id: "fampay", label: "FamPay", icon: <FamPayMark />, androidPackage: "", iosScheme: "" }
]

export default function PayoutPage() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [amount] = useState(() => {
    try {
      const rawDraft = window.localStorage.getItem(PAYOUT_STORAGE_KEY)
      if (rawDraft) {
        const parsedDraft = JSON.parse(rawDraft)
        const draftAmount = Number(parsedDraft?.amount)
        if (Number.isFinite(draftAmount) && draftAmount > 0) {
          return draftAmount
        }
      }
    } catch {
      // Ignore malformed cached payout state and fall back to the default UI state.
    }

    return DEFAULT_AMOUNT
  })
  const [isQrVisible, setIsQrVisible] = useState(() => {
    try {
      const rawDraft = window.localStorage.getItem(PAYOUT_STORAGE_KEY)
      const rawUiState = window.localStorage.getItem(PAYOUT_UI_STORAGE_KEY)
      if (!rawDraft || !rawUiState) return false

      const parsedDraft = JSON.parse(rawDraft)
      const parsedUiState = JSON.parse(rawUiState)
      const draftAmount = Number(parsedDraft?.amount)
      const visibleAmount = Number(parsedUiState?.amount)

      if (!Number.isFinite(draftAmount) || draftAmount <= 0) return false
      if (parsedUiState?.isQrVisible !== true) return false
      if (!Number.isFinite(visibleAmount)) return false

      return visibleAmount === draftAmount
    } catch {
      return false
    }
  })
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [isQrGenerating, setIsQrGenerating] = useState(false)
  const qrTransactionRef = useRef("")
  const [selectedApp, setSelectedApp] = useState("")
  const [isPaymentMarkedDone, setIsPaymentMarkedDone] = useState(false)
  const [isDesktopDevice, setIsDesktopDevice] = useState(false)
  const previousAmount = useRef(amount)
  const [isRedirectModalOpen, setIsRedirectModalOpen] = useState(false)
  const [pendingAppId, setPendingAppId] = useState("")
  const pendingApp = useMemo(() => PAYMENT_APPS.find((app) => app.id === pendingAppId) || null, [pendingAppId])

  const inrFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
    } catch {
      return null
    }
  }, [])

  const formatINR = (value) => {
    if (inrFormatter) return inrFormatter.format(value)
    return `Rs ${value}`
  }

  const buildUpiParams = useCallback((paymentAmount, { note, transactionRef } = {}) => {
    if (!UPI_ID) return ""

    const params = []
    params.push(`pa=${encodeURIComponent(UPI_ID)}`)
    params.push(`pn=${encodeURIComponent(UPI_NAME)}`)
    params.push(`am=${encodeURIComponent(paymentAmount)}`)
    params.push("cu=INR")
    params.push("mode=02")

    const trimmedNote = typeof note === "string" ? note.trim() : ""
    if (trimmedNote) params.push(`tn=${encodeURIComponent(trimmedNote)}`)

    const trimmedRef = typeof transactionRef === "string" ? transactionRef.trim() : ""
    if (trimmedRef) params.push(`tr=${encodeURIComponent(trimmedRef)}`)

    return params.join("&")
  }, [])

  const buildUpiUrl = useCallback((paymentAmount, options) => {
    const upiParams = buildUpiParams(paymentAmount, options)
    return upiParams ? `upi://pay?${upiParams}` : ""
  }, [buildUpiParams])

  const buildAndroidIntentUrl = useCallback((packageName, upiParams) => {
    if (!packageName || !upiParams) return ""
    return `intent://pay?${upiParams}#Intent;scheme=upi;package=${packageName};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`
  }, [])

  const buildIosAppUrl = useCallback((schemeBase, upiParams) => {
    if (!schemeBase || !upiParams) return ""
    const separator = schemeBase.includes("?") ? "&" : "?"
    return `${schemeBase}${separator}${upiParams}`
  }, [])

  const detectMobilePlatform = () => {
    const ua = (navigator.userAgent || "").toLowerCase()
    return {
      isAndroid: ua.includes("android"),
      isIOS: ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")
    }
  }

  const generateQrForAmount = useCallback(async (paymentAmount) => {
    setIsQrGenerating(true)
    try {
      const transactionRef = `coffee-${Date.now().toString(36)}`
      qrTransactionRef.current = transactionRef
      const qrPayload = buildUpiUrl(paymentAmount, { note: "Coffee support", transactionRef })
      if (!qrPayload) {
        setQrDataUrl("")
        return
      }

      const dataUrl = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 720
      })
      setQrDataUrl(dataUrl)
    } catch {
      setQrDataUrl("")
    } finally {
      setIsQrGenerating(false)
    }
  }, [buildUpiUrl])

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setIsLoaded(true))

    return () => window.cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        PAYOUT_UI_STORAGE_KEY,
        JSON.stringify({
          isQrVisible,
          amount
        })
      )
    } catch {
      // Ignore storage write failures for non-critical UI state.
    }
  }, [amount, isQrVisible])

  useEffect(() => {
    if (previousAmount.current !== amount) {
      setIsQrVisible(false)
      setQrDataUrl("")
      qrTransactionRef.current = ""
      previousAmount.current = amount
    }
  }, [amount])

  useEffect(() => {
    if (!isRedirectModalOpen) return

    const body = document.body
    const previousOverflow = body.style.overflow
    body.classList.add("is-modal-open")
    body.style.overflow = "hidden"

    return () => {
      body.style.overflow = previousOverflow
      body.classList.remove("is-modal-open")
    }
  }, [isRedirectModalOpen])

  useEffect(() => {
    if (!isQrVisible) return
    if (qrDataUrl) return
    void generateQrForAmount(amount)
  }, [amount, generateQrForAmount, isQrVisible, qrDataUrl])

  useEffect(() => {
    const syncDeviceMode = () => {
      const coarsePointer = window.matchMedia("(pointer: coarse)").matches
      const narrowScreen = window.innerWidth < 900
      setIsDesktopDevice(!coarsePointer && !narrowScreen)
    }

    syncDeviceMode()
    window.addEventListener("resize", syncDeviceMode)

    return () => {
      window.removeEventListener("resize", syncDeviceMode)
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

  const currentPath = window.location.pathname || "/coffee/payout"
  const coffeePath = currentPath.includes("/home/coffee") ? "/home/coffee" : "/coffee"
  const attachmentPath = currentPath.includes("/home/coffee") ? "/home/coffee/attachment" : "/coffee/attachment"

  const redirectToAttachment = () => {
    try {
      window.sessionStorage.setItem(ATTACHMENT_ENTRY_KEY, "1")
    } catch {
      // Ignore storage write failures.
    }

    try {
      window.localStorage.setItem(ATTACHMENT_ENTRY_FALLBACK_KEY, `${Date.now()}`)
    } catch {
      // Ignore storage write failures.
    }

    // Prefer a hard navigation so the user always lands on the attachment page,
    // even if SPA popstate handling is blocked/unreliable in the current browser.
    window.location.assign(`${attachmentPath}?entry=1`)
  }

  const openPaymentApp = (appId) => {
    if (isDesktopDevice) {
      return
    }

    setSelectedApp(appId)
    setIsPaymentMarkedDone(false)

    if (!UPI_ID) {
      setSelectedApp("")
      return
    }

    const paymentApp = PAYMENT_APPS.find((app) => app.id === appId)
    const upiParams = buildUpiParams(amount, { note: "Coffee support" })
    const { isAndroid, isIOS } = detectMobilePlatform()

    if (isAndroid && paymentApp?.androidPackage) {
      const intentUrl = buildAndroidIntentUrl(paymentApp.androidPackage, upiParams)
      if (intentUrl) {
        window.location.href = intentUrl
        return
      }
    }

    if (isIOS && paymentApp?.iosScheme) {
      const iosUrl = buildIosAppUrl(paymentApp.iosScheme, upiParams)
      if (iosUrl) {
        // iOS Safari may fail silently if the app isn't installed.
        // Important: don't fire the fallback if the app opened (page becomes hidden),
        // otherwise iOS can route the fallback `upi://` to WhatsApp/default handler.
        window.location.href = iosUrl

        const fallbackToGenericUpi = () => {
          if (document.visibilityState === "visible") {
            window.location.href = `upi://pay?${upiParams}`
          }
        }

        const timer = window.setTimeout(fallbackToGenericUpi, 1500)

        const clear = () => window.clearTimeout(timer)
        window.addEventListener("pagehide", clear, { once: true })
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState !== "visible") clear()
        }, { once: true })
        return
      }
    }

    // Fallback (iOS or unknown package): may open the user's default UPI handler.
    window.location.href = `upi://pay?${upiParams}`
  }

  const handleAppPaymentClick = (appId) => {
    if (isDesktopDevice) return
    setPendingAppId(appId)
    setIsRedirectModalOpen(true)
  }

  return (
    <main className="payout-page" aria-label="Payment page">
      <div className={`payout-shell ${isLoaded ? "is-loaded" : ""}`}>
        <nav className="page-breadcrumb" aria-label="Breadcrumb">
          <a href="/" className="page-breadcrumb-link" title="Home" onClick={(event) => { event.preventDefault(); navigateToPath("/"); }}>
            <Home size={14} strokeWidth={2} />
            <span>Home</span>
          </a>
          <ChevronRight size={14} className="page-breadcrumb-separator" strokeWidth={2} />
          <a href={coffeePath} className="page-breadcrumb-link" onClick={(event) => { event.preventDefault(); navigateToPath(coffeePath); }}>
            <img src={COFFEE_ICON_SRC} alt="" className="payout-breadcrumb-icon" aria-hidden="true" />
            <span>Coffee</span>
          </a>
          <ChevronRight size={14} className="page-breadcrumb-separator" strokeWidth={2} />
          <span className="page-breadcrumb-current" aria-current="page">
            Payout
          </span>
        </nav>

        <section className="payout-hero" aria-labelledby="payout-title">
          <div>
            <p className="payout-eyebrow">Payment step</p>
            <h1 id="payout-title" className="payout-title">Complete your coffee support</h1>
            <p className="payout-subtitle">Choose how you want to pay, reveal the QR only when needed, and confirm once you are done.</p>
          </div>
          <div className="payout-amount-card">
            <span className="payout-amount-label">Amount</span>
            <strong className="payout-amount-value">{formatINR(amount)}</strong>
          </div>
        </section>

        <section className="payout-grid" aria-label="Payment options">
          <div className="payout-panel">
            <div className="payout-panel-header">
              <div>
                <h2 className="payout-panel-title">Pay with QR</h2>
                <p className="payout-panel-copy">Scan this QR code from your payment app.</p>
                <p className="payout-panel-copy payout-panel-note">Note: The amount isn’t auto-filled for QR payments—please enter it manually.</p>
              </div>
            </div>

            {isQrVisible ? (
              <div className="payout-qr-card">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt={`UPI payment QR code for ${formatINR(amount)}`} className="payout-qr-image" />
                ) : (
                  <p className="payout-panel-copy payout-qr-status">Payment QR is not configured.</p>
                )}
                {isQrGenerating ? (
                  <p className="payout-panel-copy payout-qr-status">Generating QR…</p>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                className="payout-qr-placeholder payout-qr-generate-btn"
                onClick={() => {
                  setQrDataUrl("")
                  qrTransactionRef.current = ""
                  setIsQrVisible(true)
                }}
              >
                <span className="payout-qr-generate-title">Generate QR</span>
                <span className="payout-qr-generate-copy">Reveal the QR code for {formatINR(amount)}.</span>
              </button>
            )}
          </div>

          <div className="payout-panel">
            <div className="payout-panel-header">
              <div>
                <h2 className="payout-panel-title">Continue with</h2>
                <p className="payout-panel-copy">Open your preferred payment app with the selected amount already prepared.</p>
              </div>
            </div>

            <div className="payout-app-grid">
              {PAYMENT_APPS.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  className={`payout-app-btn ${selectedApp === app.id ? "is-active" : ""} ${isDesktopDevice ? "is-disabled" : ""}`}
                  onClick={() => handleAppPaymentClick(app.id)}
                  title={app.label}
                  aria-label={app.label}
                  disabled={isDesktopDevice}
                >
                  {app.icon}
                </button>
              ))}
            </div>

            {isDesktopDevice ? (
              <p className="payout-device-alert">
                These apps do not open properly on PC. Please continue on mobile.
              </p>
            ) : null}
          </div>

          <div className="payout-panel payout-info-panel">
            <div className="payout-panel-header">
              <div>
                <h2 className="payout-panel-title">Payment info</h2>
              </div>
            </div>

            <div className="payout-info-row">
              <span className="payout-info-label">Amount</span>
              <strong className="payout-inline-amount">{formatINR(amount)}</strong>
            </div>

            <button
              type="button"
              className={`payout-complete-btn ${isPaymentMarkedDone ? "is-confirmed" : ""}`}
              onClick={() => {
                setIsPaymentMarkedDone(true)
                redirectToAttachment()
              }}
            >
              <CircleCheckBig size={17} strokeWidth={2} />
              <span>I've completed payment</span>
            </button>
          </div>
        </section>
      </div>

      {isRedirectModalOpen ? (
        <div
          className="payout-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Redirect to payment app"
          onClick={() => setIsRedirectModalOpen(false)}
        >
          <div className="payout-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="payout-modal-close"
              onClick={() => {
                setIsRedirectModalOpen(false)
                setPendingAppId("")
              }}
              aria-label="Close"
              title="Close"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
            <img src={REDIRECT_ILLUS_SRC} alt="" className="payout-modal-illus" aria-hidden="true" />
            <h3 className="payout-modal-title">Continue to payment app</h3>
            {pendingApp ? (
              <p className="payout-modal-app" aria-live="polite">
                Selected app: <strong>{pendingApp.label}</strong>
              </p>
            ) : null}
            <p className="payout-modal-copy">You will be redirected to your payment app. Tap below to continue.</p>
            <div className="payout-modal-actions">
              <button
                type="button"
                className="payout-modal-primary"
                onClick={() => {
                  const appId = pendingAppId
                  setIsRedirectModalOpen(false)
                  setPendingAppId("")
                  if (appId) openPaymentApp(appId)
                }}
              >
                Click here to redirect
              </button>
              <button
                type="button"
                className="payout-modal-secondary"
                onClick={() => {
                  setIsPaymentMarkedDone(true)
                  setIsRedirectModalOpen(false)
                  setPendingAppId("")
                  redirectToAttachment()
                }}
              >
                I've completed payment
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
