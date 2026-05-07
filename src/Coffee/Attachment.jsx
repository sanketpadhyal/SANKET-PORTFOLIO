import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Home, ChevronRight, UploadCloud, User, Hash, MessageCircle, Image as ImageIcon, Camera, IndianRupee, Trophy, Crop as CropIcon } from "lucide-react"
import Cropper from "react-easy-crop"
import { createLeaderboardEntry } from "../api-calls/apicalls"
import "./Attachment.css"

const PAYOUT_STORAGE_KEY = "coffee-support-draft"
const ATTACHMENT_ENTRY_KEY = "coffee-attachment-entry"
const ATTACHMENT_ENTRY_FALLBACK_KEY = "coffee-attachment-entry-fallback"
const ATTACHMENT_FORM_CACHE_KEY = "coffee-attachment-form-cache"
const ATTACHMENT_IMAGE_DB_NAME = "coffee-attachment-image-cache"
const ATTACHMENT_IMAGE_STORE_NAME = "images"

const NAME_WORD_LIMIT = 4
const MESSAGE_WORD_LIMIT = 30
const NAME_CHAR_LIMIT = 40
const MESSAGE_CHAR_LIMIT = 160
const TRANSACTION_ID_MAX_LENGTH = 18
const IMAGE_CACHE_MAX_BYTES = 5 * 1024 * 1024

const COFFEE_ICON_SRC = "/assets/coffee.png"

const CONFETTI_COLORS = ["#0b5fff", "#22c55e", "#f59e0b", "#ec4899", "#a855f7", "#38bdf8"]

const scrollPageToTop = ({ behavior = "auto" } = {}) => {
  try {
    window.scrollTo({ top: 0, left: 0, behavior })
  } catch {
    try {
      window.scrollTo(0, 0)
    } catch {
      // Ignore scroll failures.
    }
  }

  try {
    if (document?.documentElement) document.documentElement.scrollTop = 0
    if (document?.body) document.body.scrollTop = 0
  } catch {
    // Ignore document scroll failures.
  }

  try {
    requestAnimationFrame(() => {
      try {
        window.scrollTo({ top: 0, left: 0, behavior })
      } catch {
        // Ignore scroll failures.
      }
    })
  } catch {
    // Ignore RAF failures.
  }
}

const loadHtmlImage = (url) => new Promise((resolve, reject) => {
  const image = new Image()
  image.addEventListener("load", () => resolve(image))
  image.addEventListener("error", () => reject(new Error("Unable to load image.")))
  image.setAttribute("crossorigin", "anonymous")
  image.src = url
})

const cropImageToSquareFile = async ({
  sourceUrl,
  cropPixels,
  fileName = "profile-photo.jpg",
  outputSize = 720,
  mimeType = "image/jpeg",
  quality = 0.92
}) => {
  const image = await loadHtmlImage(sourceUrl)
  const canvas = document.createElement("canvas")
  canvas.width = outputSize
  canvas.height = outputSize

  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas not supported.")

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = "high"

  context.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    outputSize,
    outputSize
  )

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error("Unable to crop image."))
        return
      }
      resolve(result)
    }, mimeType, quality)
  })

  return new File([blob], fileName, { type: mimeType })
}

const buildConfetti = (count) => {
  const pieces = []
  for (let i = 0; i < count; i += 1) {
    pieces.push({
      id: `${Date.now()}-${i}`,
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      duration: 1.1 + Math.random() * 0.7,
      rotation: (Math.random() * 360) - 180,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]
    })
  }
  return pieces
}

const getCachedForm = () => {
  try {
    const cached = window.localStorage.getItem(ATTACHMENT_FORM_CACHE_KEY)
    return cached ? JSON.parse(cached) : {}
  } catch {
    return {}
  }
}

const getCachedDraftAmount = () => {
  const cached = getCachedForm()
  const raw = cached?.payoutAmountSnapshot
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const openImageCacheDb = () => new Promise((resolve, reject) => {
  if (!("indexedDB" in window)) {
    reject(new Error("IndexedDB unavailable"))
    return
  }

  const request = window.indexedDB.open(ATTACHMENT_IMAGE_DB_NAME, 1)

  request.onupgradeneeded = () => {
    const db = request.result
    if (!db.objectStoreNames.contains(ATTACHMENT_IMAGE_STORE_NAME)) {
      db.createObjectStore(ATTACHMENT_IMAGE_STORE_NAME)
    }
  }

  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

const withImageStore = async (mode, callback) => {
  const db = await openImageCacheDb()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ATTACHMENT_IMAGE_STORE_NAME, mode)
    const store = transaction.objectStore(ATTACHMENT_IMAGE_STORE_NAME)
    const request = callback(store)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => db.close()
    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

const getCachedImageFile = async (key) => {
  const cached = await withImageStore("readonly", (store) => store.get(key))
  return cached?.file || null
}

const setCachedImageFile = async (key, file) => {
  if (!file || file.size > IMAGE_CACHE_MAX_BYTES) return
  await withImageStore("readwrite", (store) => store.put({ file, cachedAt: Date.now() }, key))
}

const deleteCachedImageFile = async (key) => {
  await withImageStore("readwrite", (store) => store.delete(key))
}

const clearCachedImageFiles = async () => {
  await withImageStore("readwrite", (store) => store.clear())
}

export default function AttachmentPage() {
  const hasValidatedEntry = useRef(false)
  const hasAutoFilledAmount = useRef(false)
  const hasRestoredImageCache = useRef(false)
  const paymentProofInputRef = useRef(null)
  const profilePhotoInputRef = useRef(null)
  const cropConfirmButtonRef = useRef(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [confettiPieces, setConfettiPieces] = useState([])
  const [name, setName] = useState(() => {
    try {
      return getCachedForm()?.name || ""
    } catch {
      return ""
    }
  })
  const [transactionId, setTransactionId] = useState(() => {
    try {
      return getCachedForm()?.transactionId || ""
    } catch {
      return ""
    }
  })
  const [paidAmount, setPaidAmount] = useState(() => {
    try {
      return getCachedForm()?.paidAmount || ""
    } catch {
      return ""
    }
  })
  const [message, setMessage] = useState(() => {
    try {
      return getCachedForm()?.message || ""
    } catch {
      return ""
    }
  })
  const [paymentProofFile, setPaymentProofFile] = useState(null)
  const [profilePhotoFile, setProfilePhotoFile] = useState(null)
  const [isProfileCropOpen, setIsProfileCropOpen] = useState(false)
  const [profileCropSourceUrl, setProfileCropSourceUrl] = useState("")
  const [profileCropSourceName, setProfileCropSourceName] = useState("")
  const [profileCrop, setProfileCrop] = useState({ x: 0, y: 0 })
  const [profileZoom, setProfileZoom] = useState(1)
  const [profileCroppedPixels, setProfileCroppedPixels] = useState(null)
  const [isApplyingProfileCrop, setIsApplyingProfileCrop] = useState(false)
  const [isPaymentDropActive, setIsPaymentDropActive] = useState(false)
  const [isProfileDropActive, setIsProfileDropActive] = useState(false)
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const amount = useMemo(() => {
    try {
      const rawDraft = window.localStorage.getItem(PAYOUT_STORAGE_KEY)
      if (!rawDraft) return null
      const parsedDraft = JSON.parse(rawDraft)
      const draftAmount = Number(parsedDraft?.amount)
      return Number.isFinite(draftAmount) && draftAmount > 0 ? draftAmount : null
    } catch {
      return null
    }
  }, [])

  const clearDraftState = ({ resetAutoFillAmount = false } = {}) => {
    if (resetAutoFillAmount) {
      hasAutoFilledAmount.current = false
    } else {
      hasAutoFilledAmount.current = true
    }

    setName("")
    setTransactionId("")
    setPaidAmount("")
    setMessage("")
    setPaymentProofFile(null)
    setProfilePhotoFile(null)
    setIsPaymentDropActive(false)
    setIsProfileDropActive(false)
    setSubmitError("")

    if (paymentProofInputRef.current) paymentProofInputRef.current.value = ""
    if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = ""

    try {
      window.localStorage.removeItem(ATTACHMENT_FORM_CACHE_KEY)
    } catch {
      // Ignore cache clear failures.
    }

    void clearCachedImageFiles()
  }

  const closeProfileCropper = useCallback(() => {
    setIsProfileCropOpen(false)
    setProfileCrop({ x: 0, y: 0 })
    setProfileZoom(1)
    setProfileCroppedPixels(null)
    if (profileCropSourceUrl) {
      try {
        URL.revokeObjectURL(profileCropSourceUrl)
      } catch {
        // Ignore revocation failures.
      }
    }
    setProfileCropSourceUrl("")
    setProfileCropSourceName("")
    setIsApplyingProfileCrop(false)
  }, [profileCropSourceUrl])

  const openProfileCropper = (file) => {
    if (!file) return
    if (!file.type?.startsWith("image/")) {
      setSubmitError("Please choose an image file for the profile photo.")
      return
    }

    try {
      const nextUrl = URL.createObjectURL(file)
      setProfileCropSourceUrl(nextUrl)
      setProfileCropSourceName(file.name || "profile-photo")
      setProfileCrop({ x: 0, y: 0 })
      setProfileZoom(1)
      setProfileCroppedPixels(null)
      setIsProfileCropOpen(true)
      setSubmitError("")
    } catch {
      setSubmitError("Unable to preview this image. Please try a different photo.")
    }
  }

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setIsLoaded(true))
    return () => window.cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const cachedAmount = getCachedDraftAmount()
    if (!amount || !cachedAmount) return
    if (cachedAmount !== amount) {
      clearDraftState({ resetAutoFillAmount: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount])

  useEffect(() => {
    if (!amount || paidAmount || hasAutoFilledAmount.current) return
    setPaidAmount(String(amount))
    hasAutoFilledAmount.current = true
  }, [amount, paidAmount])

  useEffect(() => {
    // Guard: only allow this page after the user clicks "I've completed payment".
    if (hasValidatedEntry.current) {
      return
    }

    try {
      const url = new URL(window.location.href)
      const hasQueryEntry = url.searchParams.get("entry") === "1"
      const hasSessionEntry = window.sessionStorage.getItem(ATTACHMENT_ENTRY_KEY) === "1"

      let hasFallbackEntry = false
      try {
        const rawFallback = window.localStorage.getItem(ATTACHMENT_ENTRY_FALLBACK_KEY)
        const fallbackTs = rawFallback ? Number(rawFallback) : NaN
        hasFallbackEntry = Number.isFinite(fallbackTs) && Date.now() - fallbackTs < 10 * 60 * 1000
      } catch {
        hasFallbackEntry = false
      }

      const allowed = hasQueryEntry || hasSessionEntry || hasFallbackEntry

      if (!allowed) {
        navigateToPath(coffeePath)
        return
      }

      hasValidatedEntry.current = true
    } catch {
      navigateToPath(coffeePath)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setConfettiPieces(buildConfetti(44))
  }, [])

  useEffect(() => {
    if (!submitted) return
    setConfettiPieces(buildConfetti(80))
  }, [submitted])

  useEffect(() => {
    let isCancelled = false

    const restoreImages = async () => {
      try {
        const [cachedPaymentProof, cachedProfilePhoto] = await Promise.all([
          getCachedImageFile("paymentProof"),
          getCachedImageFile("profilePhoto")
        ])

        if (isCancelled) return

        if (cachedPaymentProof) setPaymentProofFile(cachedPaymentProof)
        if (cachedProfilePhoto) setProfilePhotoFile(cachedProfilePhoto)
      } catch {
        // Ignore unavailable image cache.
      } finally {
        hasRestoredImageCache.current = true
      }
    }

    void restoreImages()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        ATTACHMENT_FORM_CACHE_KEY,
        JSON.stringify({
          name,
          transactionId,
          paidAmount,
          message,
          payoutAmountSnapshot: amount || null
        })
      )
    } catch {
      // Ignore cache write failures.
    }
  }, [name, transactionId, paidAmount, message, amount])

  useEffect(() => {
    if (!hasRestoredImageCache.current) return

    const persistImages = async () => {
      try {
        if (paymentProofFile) {
          await setCachedImageFile("paymentProof", paymentProofFile)
        } else {
          await deleteCachedImageFile("paymentProof")
        }

        if (profilePhotoFile) {
          await setCachedImageFile("profilePhoto", profilePhotoFile)
        } else {
          await deleteCachedImageFile("profilePhoto")
        }
      } catch {
        // Ignore image cache write failures.
      }
    }

    void persistImages()
  }, [paymentProofFile, profilePhotoFile])

  const paymentPreviewUrl = useMemo(() => {
    if (!paymentProofFile) return ""
    return URL.createObjectURL(paymentProofFile)
  }, [paymentProofFile])

  const profilePreviewUrl = useMemo(() => {
    if (!profilePhotoFile) return ""
    return URL.createObjectURL(profilePhotoFile)
  }, [profilePhotoFile])

  useEffect(() => {
    return () => {
      if (paymentPreviewUrl) URL.revokeObjectURL(paymentPreviewUrl)
      if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl)
    }
  }, [paymentPreviewUrl, profilePreviewUrl])

  const navigateToPath = (path) => {
    if (window.location.pathname === path) {
      scrollPageToTop({ behavior: "smooth" })
      return
    }

    try {
      window.history.pushState({}, "", path)
      try {
        window.dispatchEvent(new PopStateEvent("popstate"))
      } catch {
        window.dispatchEvent(new Event("popstate"))
      }
      scrollPageToTop({ behavior: "auto" })
    } catch {
      window.location.assign(path)
    }
  }

  const currentPath = window.location.pathname || "/coffee/attachment"
  const coffeePath = currentPath.includes("/home/coffee") ? "/home/coffee" : "/coffee"

  const canSubmit = name.trim().length >= 2
    && Boolean(paymentProofFile)
    && Boolean(profilePhotoFile)
    && Number(paidAmount) >= 20
    && Number(paidAmount) <= 2500
    && (!transactionId || transactionId.length >= 4)

  const enforceWordLimit = (value, limit) => {
    const words = value.trim().split(/\s+/).filter(Boolean)
    if (words.length <= limit) return value
    return words.slice(0, limit).join(" ")
  }

  const getImageFileFromDrop = (event) => {
    const droppedFile = event.dataTransfer?.files?.[0]
    if (!droppedFile) return null
    if (!droppedFile.type?.startsWith("image/")) return null
    return droppedFile
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit) return

    const finalName = name.trim()
    const finalMessage = message.trim()
    const finalAmount = Number(paidAmount)

    if (finalName.length > NAME_CHAR_LIMIT) {
      setSubmitError(`Name must be ${NAME_CHAR_LIMIT} characters or less.`)
      return
    }

    if (transactionId && !/^\d{4,18}$/.test(transactionId)) {
      setSubmitError("Transaction ID must be 4 to 18 numbers only.")
      return
    }

    if (finalMessage.length > MESSAGE_CHAR_LIMIT) {
      setSubmitError(`Message must be ${MESSAGE_CHAR_LIMIT} characters or less.`)
      return
    }

    if (!Number.isFinite(finalAmount) || finalAmount <= 0 || finalAmount > 100000) {
      setSubmitError("Paid amount must be between 1 and 100000.")
      return
    }

    setIsSubmitting(true)
    setSubmitError("")

    try {
      const response = await createLeaderboardEntry({
        name: finalName,
        amount: paidAmount,
        transactionId,
        message: finalMessage,
        paymentProofFile,
        profilePhotoFile
      })

      if (!response.ok) {
        throw new Error(response.data?.error || "Unable to submit entry.")
      }

      setSubmitted(true)
      clearDraftState({ resetAutoFillAmount: false })
      scrollPageToTop({ behavior: "smooth" })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to submit entry.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClearAll = () => clearDraftState({ resetAutoFillAmount: false })

  const handleClearAllConfirm = () => {
    handleClearAll()
    setIsClearConfirmOpen(false)
  }

  useEffect(() => {
    if (!submitted) return
    scrollPageToTop({ behavior: "auto" })
  }, [submitted])

  useEffect(() => {
    if (!isProfileCropOpen) return
    scrollPageToTop({ behavior: "auto" })
    const button = cropConfirmButtonRef.current
    if (!button) return
    try {
      button.focus()
    } catch {
      // Ignore focus failures.
    }
  }, [isProfileCropOpen])

  useEffect(() => {
    if (!isProfileCropOpen) return

    const previousOverflow = document?.body?.style?.overflow
    try {
      document.body.style.overflow = "hidden"
    } catch {
      // Ignore style failures.
    }

    return () => {
      try {
        document.body.style.overflow = previousOverflow || ""
      } catch {
        // Ignore style failures.
      }
    }
  }, [isProfileCropOpen])

  useEffect(() => {
    if (!isProfileCropOpen && !isClearConfirmOpen) return

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return
      if (isClearConfirmOpen) {
        setIsClearConfirmOpen(false)
        return
      }
      if (isProfileCropOpen) {
        event.preventDefault()
        if (!isApplyingProfileCrop) closeProfileCropper()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [closeProfileCropper, isApplyingProfileCrop, isClearConfirmOpen, isProfileCropOpen])

  const handleApplyProfileCrop = async () => {
    if (!profileCropSourceUrl || !profileCroppedPixels || isApplyingProfileCrop) return

    setIsApplyingProfileCrop(true)
    setSubmitError("")

    try {
      const safeBaseName = (profileCropSourceName || "profile-photo").replace(/\.[a-z0-9]+$/i, "")
      const croppedFile = await cropImageToSquareFile({
        sourceUrl: profileCropSourceUrl,
        cropPixels: profileCroppedPixels,
        fileName: `${safeBaseName}-cropped.jpg`
      })
      setProfilePhotoFile(croppedFile)
      closeProfileCropper()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to crop photo.")
      setIsApplyingProfileCrop(false)
    }
  }

  return (
    <main className="attachment-page" aria-label="Payment proof upload page">
      <div className={`attachment-shell ${isLoaded ? "is-loaded" : ""}`}>
        <nav className="page-breadcrumb" aria-label="Breadcrumb">
          <a href="/" className="page-breadcrumb-link" title="Home" onClick={(event) => { event.preventDefault(); navigateToPath("/"); }}>
            <Home size={14} strokeWidth={2} />
            <span>Home</span>
          </a>
          <ChevronRight size={14} className="page-breadcrumb-separator" strokeWidth={2} />
          <a href={coffeePath} className="page-breadcrumb-link" onClick={(event) => { event.preventDefault(); navigateToPath(coffeePath); }}>
            <img src={COFFEE_ICON_SRC} alt="" className="attachment-breadcrumb-icon" aria-hidden="true" />
            <span>Coffee</span>
          </a>
          <ChevronRight size={14} className="page-breadcrumb-separator" strokeWidth={2} />
          <span className="page-breadcrumb-current" aria-current="page">
            Proof
          </span>
        </nav>

        <section className="attachment-hero" aria-label="Thanks message">
          <div className="attachment-confetti" aria-hidden="true">
            {confettiPieces.map((piece) => (
              <span
                key={piece.id}
                className="attachment-confetti-piece"
                style={{
                  left: `${piece.left}%`,
                  background: piece.color,
                  animationDelay: `${piece.delay}s`,
                  animationDuration: `${piece.duration}s`,
                  transform: `translate3d(0, 0, 0) rotate(${piece.rotation}deg)`
                }}
              />
            ))}
          </div>

          <div className="attachment-hero-card">
            <div className="attachment-hero-badge">
              <Trophy size={14} strokeWidth={2.2} aria-hidden="true" />
              <span>Entry For Leaderboard</span>
            </div>
            <h1 className="attachment-title">
              {submitted ? (
                "Thanks for uploading proofs"
              ) : (
                <>Thanks for supporting <span className="attachment-title-accent">Sanket</span></>
              )}
            </h1>
            <p className="attachment-subtitle">
              {submitted
                ? "Sanket will check your proofs soon — you’re registered for the leaderboard."
                : (amount
                  ? `Upload your proof for ${amount} INR — Sanket will check it and then you’ll be registered for the leaderboard.`
                  : "Upload your payment proof — Sanket will check it and then you’ll be registered for the leaderboard.")}
            </p>
          </div>
        </section>

        <section className="attachment-form-section" aria-label="Upload payment proof">
          {submitted ? (
            <div className="attachment-success" role="status">
              <h2>Received</h2>
              <p>You have been registered for the leaderboard.</p>
              <div className="attachment-success-actions">
                <button type="button" className="attachment-back-btn" onClick={() => navigateToPath(coffeePath)}>
                  <img src={COFFEE_ICON_SRC} alt="" className="attachment-back-btn-icon" aria-hidden="true" />
                  Back to Coffee
                </button>
                <button type="button" className="attachment-back-btn attachment-back-home-btn" onClick={() => navigateToPath("/")}>
                  <Home size={16} strokeWidth={2.2} aria-hidden="true" />
                  Back to Home
                </button>
              </div>
            </div>
          ) : (
            <form className="attachment-form" onSubmit={handleSubmit}>
              <div className="attachment-form-toolbar">
                <button type="button" className="attachment-clear-btn" onClick={() => setIsClearConfirmOpen(true)}>
                  Clear all
                </button>
              </div>
              <div className="attachment-grid">
                <label className="attachment-field">
                  <span className="attachment-label">
                    <User size={14} strokeWidth={2.2} aria-hidden="true" />
                    Name
                  </span>
                  <input
                    className="attachment-input"
                    value={name}
                    onChange={(e) => {
                      const next = enforceWordLimit(e.target.value, NAME_WORD_LIMIT)
                      setName(next.slice(0, NAME_CHAR_LIMIT))
                      setSubmitError("")
                    }}
                    placeholder="Your name"
                    autoComplete="name"
                    maxLength={NAME_CHAR_LIMIT}
                    required
                  />
                </label>

                <label className="attachment-field">
                  <span className="attachment-label">
                    <IndianRupee size={14} strokeWidth={2.2} aria-hidden="true" />
                    Paid amount
                  </span>
                  <input
                    className="attachment-input"
                    value={paidAmount}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "")
                      if (!digitsOnly) {
                        setPaidAmount("")
                        setSubmitError("")
                        return
                      }

                      const numericValue = Number(digitsOnly)
                      if (!Number.isFinite(numericValue)) {
                        return
                      }

                      const clamped = Math.min(Math.max(numericValue, 0), 2500)
                      setPaidAmount(String(clamped))
                      setSubmitError("")
                    }}
                    placeholder="Enter amount you paid"
                    inputMode="numeric"
                    min={20}
                    max={2500}
                    maxLength={6}
                    required
                  />
                  <span className="attachment-helper">Not automated yet, so enter the amount manually.</span>
                </label>

                <label className="attachment-field">
                  <span className="attachment-label">
                    <Hash size={14} strokeWidth={2.2} aria-hidden="true" />
                    Transaction ID <span className="attachment-optional">(optional)</span>
                  </span>
                  <input
                    className="attachment-input"
                    value={transactionId}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "")
                      setTransactionId(digitsOnly.slice(0, TRANSACTION_ID_MAX_LENGTH))
                      setSubmitError("")
                    }}
                    placeholder="UPI Ref / Txn ID"
                    autoComplete="off"
                    inputMode="numeric"
                    maxLength={TRANSACTION_ID_MAX_LENGTH}
                  />
                </label>

                <label className="attachment-field">
                  <span className="attachment-label">
                    <MessageCircle size={14} strokeWidth={2.2} aria-hidden="true" />
                    Message <span className="attachment-optional">(optional)</span>
                  </span>
                  <textarea
                    className="attachment-textarea"
                    value={message}
                    onChange={(e) => {
                      const next = enforceWordLimit(e.target.value, MESSAGE_WORD_LIMIT)
                      setMessage(next.slice(0, MESSAGE_CHAR_LIMIT))
                      setSubmitError("")
                    }}
                    placeholder="Write a short message…"
                    rows={3}
                    maxLength={MESSAGE_CHAR_LIMIT}
                  />
                </label>

                <label className="attachment-upload">
                  <span className="attachment-label">
                    <ImageIcon size={14} strokeWidth={2.2} aria-hidden="true" />
                    Payment screenshot <span className="attachment-required">(required)</span>
                  </span>
                  <input
                    ref={paymentProofInputRef}
                    type="file"
                    accept="image/*"
                    className="attachment-file"
                    onChange={(e) => {
                      setPaymentProofFile(e.target.files?.[0] || null)
                      setSubmitError("")
                    }}
                    aria-required="true"
                  />
                  <div
                    className={`attachment-upload-card ${paymentProofFile ? "is-selected" : ""} ${isPaymentDropActive ? "is-drag-active" : ""}`}
                    onDragEnter={(event) => {
                      event.preventDefault()
                      setIsPaymentDropActive(true)
                    }}
                    onDragOver={(event) => {
                      event.preventDefault()
                      if (!isPaymentDropActive) setIsPaymentDropActive(true)
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault()
                      setIsPaymentDropActive(false)
                    }}
                    onDrop={(event) => {
                      event.preventDefault()
                      setIsPaymentDropActive(false)
                      const droppedImage = getImageFileFromDrop(event)
                      if (droppedImage) {
                        setPaymentProofFile(droppedImage)
                        setSubmitError("")
                      }
                    }}
                  >
                    <UploadCloud size={18} strokeWidth={2} />
                    <span className="attachment-file-name" title={paymentProofFile?.name || ""}>
                      {paymentProofFile ? paymentProofFile.name : "Upload payment proof"}
                    </span>
                  </div>
                  {paymentPreviewUrl ? (
                    <img src={paymentPreviewUrl} alt="Payment proof preview" className="attachment-preview" />
                  ) : null}
                </label>

                <label className="attachment-upload">
                  <span className="attachment-label">
                    <Camera size={14} strokeWidth={2.2} aria-hidden="true" />
                    Your profile photo <span className="attachment-required">(required)</span>
                  </span>
                  <input
                    ref={profilePhotoInputRef}
                    type="file"
                    accept="image/*"
                    className="attachment-file"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      if (file) {
                        openProfileCropper(file)
                      }
                      if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = ""
                    }}
                    aria-required="true"
                  />
                  <div
                    className={`attachment-upload-card ${profilePhotoFile ? "is-selected" : ""} ${isProfileDropActive ? "is-drag-active" : ""}`}
                    onDragEnter={(event) => {
                      event.preventDefault()
                      setIsProfileDropActive(true)
                    }}
                    onDragOver={(event) => {
                      event.preventDefault()
                      if (!isProfileDropActive) setIsProfileDropActive(true)
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault()
                      setIsProfileDropActive(false)
                    }}
                    onDrop={(event) => {
                      event.preventDefault()
                      setIsProfileDropActive(false)
                      const droppedImage = getImageFileFromDrop(event)
                      if (droppedImage) {
                        openProfileCropper(droppedImage)
                      }
                    }}
                  >
                    <UploadCloud size={18} strokeWidth={2} />
                    <span className="attachment-file-name" title={profilePhotoFile?.name || ""}>
                      {profilePhotoFile ? profilePhotoFile.name : "Upload your photo"}
                    </span>
                  </div>
                  {profilePreviewUrl ? (
                    <div className="attachment-avatar-preview">
                      <img src={profilePreviewUrl} alt="Profile preview" className="attachment-preview attachment-preview-avatar" />
                      <button
                        type="button"
                        className="attachment-avatar-crop-btn"
                        onClick={() => openProfileCropper(profilePhotoFile)}
                        aria-label="Crop photo"
                        title="Crop"
                      >
                        <CropIcon size={16} strokeWidth={2.4} aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}
                </label>
              </div>

              {submitError ? (
                <p className="attachment-submit-error" role="alert">{submitError}</p>
              ) : null}
              <button
                type="submit"
                className="attachment-submit"
                disabled={!canSubmit || isSubmitting}
                data-submitting={isSubmitting ? "true" : "false"}
              >
                {isSubmitting ? (
                  <span className="attachment-submit-loading" aria-live="polite">
                    <span className="attachment-submit-loader" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                    <span>Uploading</span>
                  </span>
                ) : (
                  "Submit for leaderboard"
                )}
              </button>
              <p className="attachment-footnote">Your entry is stored securely after the images upload.</p>
            </form>
          )}
        </section>
      </div>

      {isClearConfirmOpen ? (
        <div
          className="attachment-confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Clear all confirmation"
          onClick={() => setIsClearConfirmOpen(false)}
        >
          <div className="attachment-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <h3 className="attachment-confirm-title">Are you sure?</h3>
            <p className="attachment-confirm-copy">This clears all entered details and selected files.</p>
            <div className="attachment-confirm-actions">
              <button type="button" className="attachment-confirm-btn attachment-confirm-no" onClick={() => setIsClearConfirmOpen(false)}>
                No
              </button>
              <button type="button" className="attachment-confirm-btn attachment-confirm-yes" onClick={handleClearAllConfirm}>
                Yes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isProfileCropOpen ? (
        <div
          className="attachment-crop-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Crop profile photo"
        >
          <div className="attachment-crop-modal" onClick={(event) => event.stopPropagation()}>
            <div className="attachment-crop-header">
              <h3 className="attachment-crop-title">Crop profile photo</h3>
              <p className="attachment-crop-subtitle">Square crop looks best on the leaderboard.</p>
            </div>

            <div className="attachment-crop-stage" aria-label="Crop stage">
              <Cropper
                image={profileCropSourceUrl}
                crop={profileCrop}
                zoom={profileZoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setProfileCrop}
                onZoomChange={setProfileZoom}
                onCropComplete={(_, croppedPixels) => setProfileCroppedPixels(croppedPixels)}
              />
            </div>

            <div className="attachment-crop-controls">
              <label className="attachment-crop-zoom" aria-label="Zoom">
                <span>Zoom</span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={profileZoom}
                  onChange={(event) => setProfileZoom(Number(event.target.value))}
                />
              </label>

              <div className="attachment-crop-actions">
                <button
                  type="button"
                  className="attachment-crop-btn attachment-crop-cancel"
                  disabled={isApplyingProfileCrop}
                  onClick={closeProfileCropper}
                >
                  Cancel
                </button>
                <button
                  ref={cropConfirmButtonRef}
                  type="button"
                  className="attachment-crop-btn attachment-crop-apply"
                  disabled={isApplyingProfileCrop || !profileCroppedPixels}
                  onClick={handleApplyProfileCrop}
                >
                  {isApplyingProfileCrop ? "Cropping…" : "Use photo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
