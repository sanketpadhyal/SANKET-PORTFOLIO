import express from "express"
import multer from "multer"
import rateLimit, { ipKeyGenerator } from "express-rate-limit"
import { v2 as cloudinary } from "cloudinary"
import admin from "../firebaseAdmin.js"

const router = express.Router()
const db = admin.firestore()

const CLOUDINARY_FOLDER = "leaderboard-payments"
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const MAX_MESSAGE_WORDS = 60
const MAX_TRANSACTION_ID_LENGTH = 18

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: 2
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      cb(new Error("Only image files are allowed"))
      return
    }

    cb(null, true)
  }
})

const entryLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 1,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  message: { error: "Only one leaderboard entry can be submitted every 5 minutes." },
  skipFailedRequests: true,
  standardHeaders: true,
  legacyHeaders: false
})

const trimText = (value) => (typeof value === "string" ? value.trim() : "")

const countWords = (value) => trimText(value).split(/\s+/).filter(Boolean).length

const getCloudinaryConfig = () => ({
  cloud_name: trimText(process.env.CLOUDINARY_CLOUD_NAME),
  api_key: trimText(process.env.CLOUDINARY_API_KEY),
  api_secret: trimText(process.env.CLOUDINARY_API_SECRET)
})

const configureCloudinary = () => {
  const config = getCloudinaryConfig()

  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    return false
  }

  cloudinary.config(config)
  return true
}

const uploadImage = async (file, folderName) => {
  const encoded = file.buffer.toString("base64")
  const dataUri = `data:${file.mimetype};base64,${encoded}`

  return cloudinary.uploader.upload(dataUri, {
    folder: `${CLOUDINARY_FOLDER}/${folderName}`,
    resource_type: "image",
    fetch_format: "auto",
    quality: "auto"
  })
}

const handleUpload = upload.fields([
  { name: "paymentProof", maxCount: 1 },
  { name: "profilePhoto", maxCount: 1 }
])

const parseUpload = (req, res, next) => {
  handleUpload(req, res, (error) => {
    if (!error) {
      next()
      return
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "Each image must be 5MB or smaller." })
    }

    res.status(400).json({ error: error.message || "Invalid upload." })
  })
}

router.post(
  "/entry",
  entryLimiter,
  parseUpload,
  async (req, res) => {
    try {
      if (!configureCloudinary()) {
        return res.status(500).json({ error: "Cloudinary API secret is not configured." })
      }

      const name = trimText(req.body.name)
      const transactionId = trimText(req.body.transactionId)
      const message = trimText(req.body.message)
      const amount = Number(req.body.amount)
      const paymentProof = req.files?.paymentProof?.[0] || null
      const profilePhoto = req.files?.profilePhoto?.[0] || null

      if (name.length < 2 || name.length > 50) {
        return res.status(400).json({ error: "Name must be 2 to 50 characters." })
      }

      if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
        return res.status(400).json({ error: "Paid amount must be between 1 and 100000." })
      }

      if (transactionId && !new RegExp(`^\\d{4,${MAX_TRANSACTION_ID_LENGTH}}$`).test(transactionId)) {
        return res.status(400).json({ error: `Transaction ID must be 4 to ${MAX_TRANSACTION_ID_LENGTH} numbers only.` })
      }

      if (message.length > 500 || countWords(message) > MAX_MESSAGE_WORDS) {
        return res.status(400).json({ error: `Message must be ${MAX_MESSAGE_WORDS} words or less.` })
      }

      if (!paymentProof || !profilePhoto) {
        return res.status(400).json({ error: "Payment proof and profile photo are required." })
      }

      const [paymentProofUpload, profilePhotoUpload] = await Promise.all([
        uploadImage(paymentProof, "proofs"),
        uploadImage(profilePhoto, "profiles")
      ])

      const entryRef = db.collection("payments").doc()

      await entryRef.set({
        name,
        transactionId,
        message,
        amount,
        currency: "INR",
        paymentProofUrl: paymentProofUpload.secure_url,
        paymentProofPublicId: paymentProofUpload.public_id,
        profilePhotoUrl: profilePhotoUpload.secure_url,
        profilePhotoPublicId: profilePhotoUpload.public_id,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })

      res.json({
        success: true,
        id: entryRef.id,
        paymentProofUrl: paymentProofUpload.secure_url,
        profilePhotoUrl: profilePhotoUpload.secure_url
      })
    } catch (error) {
      console.error("Leaderboard entry error:", error)

      if (error.message === "Only image files are allowed") {
        return res.status(400).json({ error: error.message })
      }

      res.status(500).json({ error: "Leaderboard entry failed." })
    }
  }
)

export default router
