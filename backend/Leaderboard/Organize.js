import express from "express"
import rateLimit, { ipKeyGenerator } from "express-rate-limit"
import admin from "../firebaseAdmin.js"
import { verifyAdmin } from "../Admin/Admin.js"

const router = express.Router()
const db = admin.firestore()

const publicLeaderboardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  message: { error: "Too many leaderboard sync requests. Try again in a minute." },
  standardHeaders: true,
  legacyHeaders: false
})

const trimText = (value) => (typeof value === "string" ? value.trim() : "")

const getTimestampMs = (value) => {
  if (!value) return 0
  if (typeof value.toDate === "function") return value.toDate().getTime()
  if (typeof value.seconds === "number") return value.seconds * 1000
  if (typeof value._seconds === "number") return value._seconds * 1000
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

const toNumber = (value) => {
  const num = typeof value === "number" ? value : Number(value)
  return Number.isFinite(num) ? num : 0
}

const buildLeaderboard = async ({ limit, queryText }) => {
  // Avoid Firestore composite index requirements by ordering by createdAt
  // and doing status + amount sorting in memory.
  const snap = await db
    .collection("payments")
    .orderBy("createdAt", "desc")
    .limit(Math.max(limit * 4, 220))
    .get()

  let entries = snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((payment) => String(payment?.status || "").toLowerCase() === "success")

  if (queryText) {
    entries = entries.filter((payment) => {
      const haystack = [
        payment.name,
        payment.transactionId,
        payment.amount,
        payment.currency
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(queryText)
    })
  }

  entries.sort((a, b) => {
    const amountDelta = toNumber(b.amount) - toNumber(a.amount)
    if (amountDelta !== 0) return amountDelta
    return getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt)
  })

  return entries.slice(0, limit).map((payment, index) => ({
    rank: index + 1,
    id: payment.id,
    name: payment.name || "Unknown",
    amount: toNumber(payment.amount),
    currency: payment.currency || "INR",
    profilePhotoUrl: payment.profilePhotoUrl || "",
    createdAt: payment.createdAt || null
  }))
}

// Admin-only: returns successful payments as a leaderboard list.
router.post("/success/list", verifyAdmin, async (req, res) => {
  try {
    const limit = Math.min(250, Math.max(1, Number(req.body?.limit) || 50))
    const queryText = trimText(req.body?.query).toLowerCase()
    const leaderboard = await buildLeaderboard({ limit, queryText })
    res.json({ success: true, leaderboard })
  } catch (error) {
    console.error("Leaderboard organize error:", error)
    res.status(500).json({ error: "Failed to load leaderboard" })
  }
})

// Public endpoint: top successful payments leaderboard.
router.post("/public/top", publicLeaderboardLimiter, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.body?.limit) || 100))
    const queryText = trimText(req.body?.query).toLowerCase()
    const leaderboard = await buildLeaderboard({ limit, queryText })
    res.json({ success: true, leaderboard })
  } catch (error) {
    console.error("Leaderboard public error:", error)
    res.status(500).json({ error: "Failed to load leaderboard" })
  }
})

export default router
