import { useEffect, useMemo, useState } from "react"
import { Home, ChevronRight, CircleHelp } from "lucide-react"
import "./Coffee.css"

export default function CoffeePage() {
  const payoutStorageKey = "coffee-support-draft"
  const minAmount = 20
  const maxAmount = 2500
  const fixedAmount = 20
  const [isLoaded, setIsLoaded] = useState(false)
  const [selectedType, setSelectedType] = useState("fixed")
  const [selectedAmount, setSelectedAmount] = useState(fixedAmount)
  const [customAmount, setCustomAmount] = useState(String(fixedAmount))
  const coffeeIconSrc = "/assets/coffee.png"

  const inrFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
    } catch {
      return null
    }
  }, [])

  const formatINR = (value) => {
    if (inrFormatter) return inrFormatter.format(value)
    return `₹${value}`
  }

  const parsedCustomAmount = parseInt(customAmount, 10)
  const hasCustomAmount = customAmount.trim() !== ""
  const isCustomBelowMinimum = hasCustomAmount && Number.isFinite(parsedCustomAmount) && parsedCustomAmount < minAmount
  const isCustomAboveMaximum = hasCustomAmount && Number.isFinite(parsedCustomAmount) && parsedCustomAmount > maxAmount
  const isCustomInvalid = isCustomBelowMinimum || isCustomAboveMaximum
  const customAmountMessage = isCustomBelowMinimum
    ? `Minimum amount is ${formatINR(minAmount)}.`
    : isCustomAboveMaximum
      ? `Maximum amount is ${formatINR(maxAmount)}.`
      : `Minimum ${formatINR(minAmount)} and maximum ${formatINR(maxAmount)}.`

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setIsLoaded(true))
    return () => window.cancelAnimationFrame(raf)
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

  const handleSupport = () => {
    const currentPath = window.location.pathname || "/coffee"
    const payoutPath = currentPath.includes("/home/coffee") ? "/home/coffee/payout" : "/coffee/payout"
    const supportDraft = {
      amount: selectedAmount,
      customAmount,
      minAmount,
      maxAmount,
      fixedAmount,
      savedAt: Date.now()
    }

    try {
      window.localStorage.setItem(payoutStorageKey, JSON.stringify(supportDraft))
    } catch {
      // Ignore storage failures and continue to the payout step.
    }

    navigateToPath(payoutPath)
  }

  const handleHowToSupport = () => {
    if (typeof window === "undefined") return

    window.dispatchEvent(new CustomEvent("sanket-ai-open", {
      detail: {
        requestId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        prompt: "Explain how to buy coffee for Sanket in very easy English. Tell the user the simple steps to support Sanket, continue to payment, add the payment details, and what happens after submission."
      }
    }))
  }

  return (
    <main className="coffee-page" aria-label="Buy me a coffee page">
      <div className={`coffee-shell ${isLoaded ? "is-loaded" : ""}`}>
        <nav className="page-breadcrumb" aria-label="Breadcrumb">
          <a href="/" className="page-breadcrumb-link" title="Home" onClick={(e) => { e.preventDefault(); navigateToPath("/"); }}>
            <Home size={14} strokeWidth={2} />
            <span>Home</span>
          </a>
          <ChevronRight size={14} className="page-breadcrumb-separator" strokeWidth={2} />
          <span className="page-breadcrumb-current coffee-breadcrumb-current" aria-current="page">
            <img src={coffeeIconSrc} alt="" className="coffee-breadcrumb-icon" aria-hidden="true" />
            <span>Coffee</span>
          </span>
        </nav>

        <header className="coffee-header">
          <div className="coffee-profile-container">
            <img src="/assets/sanket.webp" alt="Sanket Padhyal" className="coffee-profile-photo" />
          </div>
          <h1 className="coffee-title">
            Buy <span className="coffee-title-accent">Sanket Padhyal</span> a{" "}
            <span className="coffee-title-highlight">Coffee</span>
          </h1>
          <p className="coffee-subtitle">
            If you find my work useful, consider supporting it. Your contribution helps me keep shipping clean, production-ready builds.
          </p>
        </header>

        <div className="coffee-card">
          <div className="coffee-amount-selector">
            <h2 className="coffee-amount-title">Choose support type</h2>
            <div className="coffee-amount-buttons coffee-amount-buttons-single">
              <button
                type="button"
                className={`coffee-amount-btn coffee-amount-btn-fixed ${selectedType === "fixed" ? "selected" : ""}`}
                aria-pressed={selectedType === "fixed"}
                onClick={() => {
                  setSelectedType("fixed")
                  setSelectedAmount(fixedAmount)
                  setCustomAmount(String(fixedAmount))
                }}
              >
                <div className="coffee-amount-card-top">
                  <span className="coffee-amount-icon-wrap" aria-hidden="true">
                    <img src={coffeeIconSrc} alt="" className="coffee-amount-icon" />
                  </span>
                </div>

                <div className="coffee-amount-card-body">
                  <span className="coffee-amount-caption">A small thank-you for the work</span>
                </div>

                <div className="coffee-amount-card-bottom">
                  <strong>{formatINR(fixedAmount)}</strong>
                  <span className="coffee-amount-unit">single cup</span>
                </div>
              </button>
            </div>

            <div className="coffee-custom-amount">
              <label className="coffee-custom-label" htmlFor="coffee-custom-input">
                Custom coffee
              </label>
              <div className={`coffee-custom-field ${isCustomInvalid ? "is-invalid" : ""}`}>
                <span className="coffee-custom-prefix" aria-hidden="true">₹</span>
                <input
                  id="coffee-custom-input"
                  type="number"
                  min={minAmount}
                  max={maxAmount}
                  inputMode="numeric"
                  className="coffee-custom-input"
                  placeholder="Enter amount"
                  value={customAmount}
                  aria-invalid={isCustomInvalid}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    setSelectedType("custom")
                    setCustomAmount(e.target.value)
                    if (Number.isFinite(val) && val >= minAmount && val <= maxAmount) {
                      setSelectedAmount(val)
                    }
                  }}
                  onBlur={() => {
                    const val = parseInt(customAmount, 10)
                    if (!Number.isFinite(val)) return
                    if (val < minAmount) {
                      setCustomAmount(String(minAmount))
                      setSelectedAmount(minAmount)
                    }
                    if (val > maxAmount) {
                      setCustomAmount(String(maxAmount))
                      setSelectedAmount(maxAmount)
                    }
                  }}
                />
              </div>
              <p className={`coffee-custom-hint ${isCustomInvalid ? "is-invalid" : ""}`}>{customAmountMessage}</p>
            </div>
          </div>

          <div className="coffee-checkout">
            <div className="coffee-summary">
              <div className="coffee-total">
                <span>Total</span>
                <span className="coffee-total-value" aria-live="polite">{formatINR(selectedAmount)}</span>
              </div>
              <p className="coffee-note">You will be redirected to the payment page.</p>
            </div>

              <div className="coffee-support-actions">
                <button
                  type="button"
                  className="coffee-help-btn"
                  onClick={handleHowToSupport}
                >
                  <CircleHelp size={15} strokeWidth={2.2} />
                  <span>How to support?</span>
                </button>

                <button className="coffee-support-btn" onClick={handleSupport} disabled={isCustomInvalid}>
                  Continue with {formatINR(selectedAmount)}
                </button>
              </div>
          </div>
        </div>
      </div>
    </main>
  )
}
