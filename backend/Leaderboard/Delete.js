import express from "express"
import { v2 as cloudinary } from "cloudinary"
import admin from "../firebaseAdmin.js"
import { verifyAdmin } from "../Admin/Admin.js"

const router = express.Router()
const db = admin.firestore()

const trimText = (value) => (typeof value === "string" ? value.trim() : "")

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

const normalizeStatus = (value) => trimText(value).toLowerCase()

const getEntryStatus = (entryData) => {
  if (!entryData || typeof entryData !== "object") return ""
  return normalizeStatus(
    entryData.status ??
    entryData.paymentStatus ??
    entryData.payment_status ??
    entryData.payment?.status
  )
}

const destroyCloudinaryImages = async (publicIds) => {
  const ids = publicIds.map((id) => trimText(id)).filter(Boolean)
  if (!ids.length) return { attempted: 0 }

  try {
    const result = await cloudinary.api.delete_resources(ids, { resource_type: "image" })
    return { attempted: ids.length, result }
  } catch (error) {
    console.error("Cloudinary delete_resources error:", error)
    return { attempted: ids.length, error: error?.message || String(error) }
  }
}

router.delete("/entry/:id", verifyAdmin, async (req, res) => {
  try {
    const entryId = trimText(req.params.id)
    if (!entryId) return res.status(400).json({ error: "Missing entry id." })

    const ref = db.collection("payments").doc(entryId)
    const snapshot = await ref.get()

    if (!snapshot.exists) {
      return res.status(404).json({ error: "Entry not found." })
    }

    const data = snapshot.data() || {}
    const status = getEntryStatus(data)

    const FAILED_STATUSES = new Set(["failed", "failure", "cancelled", "canceled"])

    if (!FAILED_STATUSES.has(status)) {
      return res.status(409).json({ error: "Only failed payments can be deleted." })
    }

    await ref.delete()

    let cloudinaryDeleted = { attempted: 0 }
    if (configureCloudinary()) {
      cloudinaryDeleted = await destroyCloudinaryImages([
        data.paymentProofPublicId,
        data.profilePhotoPublicId
      ])
    }

    return res.json({
      success: true,
      deletedId: entryId,
      deletedStatus: status,
      cloudinary: cloudinaryDeleted
    })
  } catch (error) {
    console.error("Leaderboard delete error:", error)
    return res.status(500).json({ error: "Unable to delete entry." })
  }
})

export default router
