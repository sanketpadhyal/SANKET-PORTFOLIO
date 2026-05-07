import express from "express"
import jwt from "jsonwebtoken"
import rateLimit, { ipKeyGenerator } from "express-rate-limit"
import admin from "../firebaseAdmin.js"

const router = express.Router()
const db = admin.firestore()

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured")
  }

  return process.env.JWT_SECRET
}

const verifyJWT = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith("Bearer ") 
      ? authHeader.slice(7) 
      : req.body?.jwtToken

    if (!token) {
      return res.status(401).json({ error: "Missing token" })
    }

    const decoded = jwt.verify(token, getJwtSecret())
    req.user = decoded
    next()
  } catch (err) {
    res.status(401).json({ error: "Invalid token" })
  }
}

const createLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const token = req.headers.authorization?.split(" ")[1] || req.body?.jwtToken || ""
    try {
      const decoded = jwt.verify(token, getJwtSecret())
      return `${ipKeyGenerator(req.ip)}:${decoded.uid}`
    } catch {
      return `${ipKeyGenerator(req.ip)}:anonymous`
    }
  },
  message: { error: "Too many tickets. Chill." }
})

router.post("/create", createLimiter, verifyJWT, async (req, res) => {
  const MAX_TICKETS = 10

  try {
    const { title, details, showProfilePhoto, showUsername } = req.body
    const uid = req.user.uid
    const email = req.user.email
    const name = req.user.name

    if (!title || title.length > 100) {
      return res.status(400).json({ error: "Invalid title" })
    }

    if (!details || details.length > 1000) {
      return res.status(400).json({ error: "Invalid details" })
    }

    const userRef = db.collection("users").doc(uid)
    const userSnap = await userRef.get()
    const userData = userSnap.data() || {}

    const finalShowPhoto =
      typeof showProfilePhoto === "boolean" ? showProfilePhoto : true

    const finalShowUsername =
      typeof showUsername === "boolean" ? showUsername : true

    let ticketId = ""
    let remaining = 0

    await db.runTransaction(async (t) => {
      const ticketsSnap = await t.get(
        db.collection("tickets").where("uid", "==", uid)
      )

      const totalTickets = ticketsSnap.size

      if (totalTickets >= MAX_TICKETS) {
        throw new Error("LIMIT_REACHED")
      }

      const ticketRef = db.collection("tickets").doc()
      ticketId = ticketRef.id
      remaining = MAX_TICKETS - (totalTickets + 1)

      t.set(ticketRef, {
        uid,
        name: userData.name || name,
        username: finalShowUsername ? userData.username || "" : "",
        email,
        title,
        details,
        status: "Sent",
        seen: false,
        reply: null,
        showProfilePhoto: finalShowPhoto,
        showUsername: finalShowUsername,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })
    })

    res.json({
      success: true,
      id: ticketId,
      remaining,
      total: MAX_TICKETS
    })

  } catch (err) {
    if (err.message === "LIMIT_REACHED") {
      return res.status(403).json({
        error: "Ticket limit reached",
        remaining: 0,
        total: MAX_TICKETS
      })
    }

    console.error(err)
    res.status(500).json({ error: "Ticket creation failed" })
  }
})

router.post("/list", verifyJWT, async (req, res) => {
  try {
    const uid = req.user.uid

    const snap = await db
      .collection("tickets")
      .where("uid", "==", uid)
      .get()

    const getCreatedAtMs = (value) => {
      if (!value) return 0
      if (typeof value.toDate === "function") return value.toDate().getTime()
      if (typeof value.seconds === "number") return value.seconds * 1000
      if (typeof value._seconds === "number") return value._seconds * 1000
      const parsed = new Date(value).getTime()
      return Number.isNaN(parsed) ? 0 : parsed
    }

    const tickets = snap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort((a, b) => getCreatedAtMs(b.createdAt) - getCreatedAtMs(a.createdAt))

    const MAX_TICKETS = 10
    const totalTickets = snap.size
    const remaining = Math.max(0, MAX_TICKETS - totalTickets)

    res.json({
      tickets,
      remaining,
      total: MAX_TICKETS
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch tickets" })
  }
})

router.post("/reply", verifyJWT, async (req, res) => {
  try {
    const { ticketId, reply } = req.body

    if (!ticketId || !reply) {
      return res.status(400).json({ error: "Missing data" })
    }

    await db.collection("tickets").doc(ticketId).update({
      reply,
      status: "Replied",
      seen: true
    })

    res.json({ success: true })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Reply failed" })
  }
})

export default router
