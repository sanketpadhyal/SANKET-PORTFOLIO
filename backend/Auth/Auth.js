import express from "express"
import jwt from "jsonwebtoken"
import admin from "../firebaseAdmin.js"

const db = admin.firestore()
const router = express.Router()

const JWT_EXPIRY = "29d"

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

router.post("/google", async (req, res) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ error: "Missing token" })
    }

    const decoded = await admin.auth().verifyIdToken(token)

    const uid = decoded.uid
    const email = decoded.email || ""
    const name = decoded.name || ""
    const photo = decoded.picture || ""

    const userRef = db.collection("users").doc(uid)
    const userSnap = await userRef.get()

    if (!userSnap.exists) {
      let base = (email.split("@")[0] || `user${uid.slice(0, 5)}`)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")

      let username = base
      let usernameRef = db.collection("usernames").doc(username)
      let usernameSnap = await usernameRef.get()

      while (usernameSnap.exists) {
        const rand = Math.floor(100 + Math.random() * 900)
        username = base + rand
        usernameRef = db.collection("usernames").doc(username)
        usernameSnap = await usernameRef.get()
      }

      await userRef.set({
        name,
        email,
        photo,
        username,
        showProfilePhoto: true,
        showUsername: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })

      await usernameRef.set({
        uid,
        name,
        email,
        username
      })

    }

    const jwtToken = jwt.sign(
      { uid, email, name },
      getJwtSecret(),
      { expiresIn: JWT_EXPIRY }
    )

    res.json({ 
      success: true,
      jwtToken,
      uid,
      email,
      name
    })

  } catch (err) {
    console.error("Auth error:", err)
    res.status(500).json({ error: "Auth failed" })
  }
})

router.post("/update-profile", verifyJWT, async (req, res) => {
  try {
    const { name, showProfilePhoto, showUsername } = req.body
    const uid = req.user.uid

    const userRef = db.collection("users").doc(uid)

    const updates = {}

    if (typeof name === "string") {
      updates.name = name.trim() || "Guest User"
    }

    if (typeof showProfilePhoto === "boolean") {
      updates.showProfilePhoto = showProfilePhoto
    }

    if (typeof showUsername === "boolean") {
      updates.showUsername = showUsername
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: "Nothing to update" })
    }

    await userRef.update(updates)

    res.json({ success: true })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Profile update failed" })
  }
})

router.post("/me", verifyJWT, async (req, res) => {
  try {
    const uid = req.user.uid

    const userSnap = await db.collection("users").doc(uid).get()

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" })
    }

    res.json({ user: userSnap.data() })

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" })
  }
})

export default router
