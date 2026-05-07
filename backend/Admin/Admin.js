import express from "express"
import rateLimit, { ipKeyGenerator } from "express-rate-limit"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import admin from "../firebaseAdmin.js"

const router = express.Router()
const db = admin.firestore()

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  message: { error: "Too many login attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false
})

const getAdminConfig = () => ({
  username: process.env.ADMIN_USERNAME || "",
  password: process.env.ADMIN_PASSWORD || "",
  jwtSecret: process.env.JWT_SECRET || ""
})

const safeCompare = (left, right) => {
  const leftBuffer = Buffer.from(String(left))
  const rightBuffer = Buffer.from(String(right))

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

export const verifyAdmin = (req, res, next) => {
  try {
    const auth = req.headers.authorization
    const { jwtSecret } = getAdminConfig()

    if (!jwtSecret) {
      return res.status(503).json({ error: "Admin auth is not configured" })
    }

    if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "No token" })

    const token = auth.slice(7).trim()
    const decoded = jwt.verify(token, jwtSecret)

    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Not allowed" })
    }

    req.admin = decoded
    next()
  } catch {
    res.status(401).json({ error: "Invalid token" })
  }
}

router.post("/auth-access", loginLimiter, (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: "Missing credentials" })
    }

    const { username: ADMIN_USERNAME, password: ADMIN_PASSWORD, jwtSecret: JWT_SECRET } = getAdminConfig()

    if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !JWT_SECRET) {
      return res.status(503).json({ error: "Admin auth is not configured" })
    }

    if (safeCompare(username, ADMIN_USERNAME) && safeCompare(password, ADMIN_PASSWORD)) {
      const token = jwt.sign(
        { role: "admin", username },
        JWT_SECRET,
        { expiresIn: "30m" }
      )

      return res.json({ success: true, token })
    }

    return res.status(401).json({ error: "Invalid credentials" })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Login failed" })
  }
})

const getTimestampMs = (value) => {
  if (!value) return 0
  if (typeof value.toDate === "function") return value.toDate().getTime()
  if (typeof value.seconds === "number") return value.seconds * 1000
  if (typeof value._seconds === "number") return value._seconds * 1000
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

router.post("/tickets/list", verifyAdmin, async (req, res) => {
  try {
    const status = typeof req.body?.status === "string" ? req.body.status.trim() : ""
    const limit = Math.min(250, Math.max(1, Number(req.body?.limit) || 120))
    const queryText = typeof req.body?.query === "string" ? req.body.query.trim().toLowerCase() : ""

    const snap = await db
      .collection("tickets")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get()

    let tickets = await Promise.all(snap.docs.map(async (doc) => {
      const ticketData = doc.data()
      const ticketObj = {
        id: doc.id,
        ...ticketData
      }

      if (ticketData.uid) {
        try {
          const userSnap = await db.collection("users").doc(ticketData.uid).get()
          const userData = userSnap.data()
          
          // Check ticket flag first, then fall back to user preference (default true if not set)
          const canShowPhoto = ticketData.showProfilePhoto !== false && userData?.showProfilePhoto !== false
          
          if (canShowPhoto && userData?.photo) {
            ticketObj.profilePhoto = userData.photo
          }
        } catch {
          // Ignore errors fetching user photo
        }
      }

      return ticketObj
    }))

    if (status && status !== "all") {
      tickets = tickets.filter((ticket) => (ticket.status || "").toLowerCase() === status.toLowerCase())
    }

    if (queryText) {
      tickets = tickets.filter((ticket) => {
        const haystack = [
          ticket.title,
          ticket.details,
          ticket.email,
          ticket.name,
          ticket.username,
          ticket.uid,
          ticket.status
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return haystack.includes(queryText)
      })
    }

    tickets.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt))

    res.json({ success: true, tickets })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch tickets" })
  }
})

router.post("/tickets/reply", verifyAdmin, async (req, res) => {
  try {
    const ticketId = typeof req.body?.ticketId === "string" ? req.body.ticketId.trim() : ""
    const reply = typeof req.body?.reply === "string" ? req.body.reply.trim() : ""

    if (!ticketId) return res.status(400).json({ error: "Missing ticketId" })
    if (!reply) return res.status(400).json({ error: "Missing reply" })
    if (reply.length > 5000) return res.status(400).json({ error: "Reply is too long" })

    await db.collection("tickets").doc(ticketId).update({
      reply,
      status: "Replied",
      seen: true,
      repliedAt: admin.firestore.FieldValue.serverTimestamp()
    })

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Reply failed" })
  }
})

router.post("/tickets/update-status", verifyAdmin, async (req, res) => {
  try {
    const ticketId = typeof req.body?.ticketId === "string" ? req.body.ticketId.trim() : ""
    const status = typeof req.body?.status === "string" ? req.body.status.trim() : ""
    const seen = typeof req.body?.seen === "boolean" ? req.body.seen : null

    if (!ticketId) return res.status(400).json({ error: "Missing ticketId" })
    if (!status) return res.status(400).json({ error: "Missing status" })

    const update = { status }
    if (seen !== null) update.seen = seen

    await db.collection("tickets").doc(ticketId).update(update)
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Status update failed" })
  }
})

router.post("/tickets/delete", verifyAdmin, async (req, res) => {
  try {
    const ticketId = typeof req.body?.ticketId === "string" ? req.body.ticketId.trim() : ""
    if (!ticketId) return res.status(400).json({ error: "Missing ticketId" })

    await db.collection("tickets").doc(ticketId).delete()
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Delete failed" })
  }
})

router.post("/payments/list", verifyAdmin, async (req, res) => {
  try {
    const status = typeof req.body?.status === "string" ? req.body.status.trim() : ""
    const limit = Math.min(2500, Math.max(1, Number(req.body?.limit) || 120))
    const queryText = typeof req.body?.query === "string" ? req.body.query.trim().toLowerCase() : ""

    const snap = await db
      .collection("payments")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get()

    let payments = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }))

    if (status && status !== "all") {
      payments = payments.filter((payment) => (payment.status || "").toLowerCase() === status.toLowerCase())
    }

    if (queryText) {
      payments = payments.filter((payment) => {
        const haystack = [
          payment.name,
          payment.transactionId,
          payment.message,
          payment.amount,
          payment.status,
          payment.currency
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return haystack.includes(queryText)
      })
    }

    payments.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt))

    res.json({ success: true, payments })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch payments" })
  }
})

router.post("/payments/update-status", verifyAdmin, async (req, res) => {
  try {
    const paymentId = typeof req.body?.paymentId === "string" ? req.body.paymentId.trim() : ""
    const status = typeof req.body?.status === "string" ? req.body.status.trim().toLowerCase() : ""

    if (!paymentId) return res.status(400).json({ error: "Missing paymentId" })
    if (!status) return res.status(400).json({ error: "Missing status" })

    const allowed = new Set(["pending", "success", "failed"])
    if (!allowed.has(status)) {
      return res.status(400).json({ error: "Invalid status" })
    }

    await db.collection("payments").doc(paymentId).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Payment status update failed" })
  }
})

router.post("/payments/delete", verifyAdmin, async (req, res) => {
  try {
    const paymentId = typeof req.body?.paymentId === "string" ? req.body.paymentId.trim() : ""
    if (!paymentId) return res.status(400).json({ error: "Missing paymentId" })

    await db.collection("payments").doc(paymentId).delete()
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Payment delete failed" })
  }
})

export default router
