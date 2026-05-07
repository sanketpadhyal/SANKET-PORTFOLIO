import express from "express"
import admin from "../firebaseAdmin.js"
import jwt from "jsonwebtoken"
import {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  generateBase64Challenge
} from "./WebAuthnUtils.js"
import {
  getAllowedPasskeyOrigins,
  getAllowedPasskeyRpIDs,
  getPasskeyOriginFromRequest,
  getPasskeyRpIDForOrigin
} from "./passkeyConfig.js"
import { verifyAdmin } from "../Admin/Admin.js"

const router = express.Router()
const db = admin.firestore()

const getAdminConfig = () => ({
  jwtSecret: process.env.JWT_SECRET || ""
})

const passkeyCache = new Map()
const authChallengeCache = new Map()

router.post("/register-options", verifyAdmin, async (req, res) => {
  try {
    const { username } = req.admin
    const requestOrigin = getPasskeyOriginFromRequest(req.headers.origin)
    const rpID = getPasskeyRpIDForOrigin(requestOrigin)

    const options = await getRegistrationOptions(username, rpID)

    passkeyCache.set(username, {
      challenge: options.challenge,
      timestamp: Date.now()
    })

    res.json({
      success: true,
      options
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to generate registration options" })
  }
})

router.post("/register-verify", verifyAdmin, async (req, res) => {
  try {
    const { username } = req.admin
    const { credential, deviceName } = req.body

    if (!credential) {
      return res.status(400).json({ error: "Missing credential" })
    }

    const cacheEntry = passkeyCache.get(username)
    if (!cacheEntry) {
      return res.status(400).json({ error: "No active registration session" })
    }

    if (Date.now() - cacheEntry.timestamp > 10 * 60 * 1000) {
      passkeyCache.delete(username)
      return res.status(400).json({ error: "Registration session expired" })
    }

    const requestOrigin = getPasskeyOriginFromRequest(req.headers.origin)
    const rpID = getPasskeyRpIDForOrigin(requestOrigin)

    const verification = await verifyRegistration(
      credential,
      cacheEntry.challenge,
      requestOrigin,
      rpID
    )

    const passkeyDoc = {
      username,
      credentialId: verification.credentialId,
      publicKey: verification.publicKey,
      counter: verification.counter,
      backedUp: verification.backedUp,
      backupEligible: verification.backupEligible,
      deviceName: deviceName || "Passkey Device",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUsedAt: null
    }

    await db.collection("passkeys").add(passkeyDoc)
    passkeyCache.delete(username)

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || "Registration verification failed" })
  }
})

router.post("/auth-options", async (req, res) => {
  try {
    const requestOrigin = getPasskeyOriginFromRequest(req.headers.origin)
    const rpID = getPasskeyRpIDForOrigin(requestOrigin)
    const options = await getAuthenticationOptions(rpID)
    const challenge = generateBase64Challenge()

    const sessionId = Math.random().toString(36).substring(7)
    authChallengeCache.set(sessionId, {
      challenge,
      timestamp: Date.now()
    })

    res.json({
      success: true,
      sessionId,
      options: {
        ...options,
        challenge
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to generate authentication options" })
  }
})

router.post("/auth-verify", async (req, res) => {
  try {
    const { credential, sessionId } = req.body

    if (!credential || !sessionId) {
      return res.status(400).json({ error: "Missing credential or sessionId" })
    }

    const cacheEntry = authChallengeCache.get(sessionId)
    if (!cacheEntry) {
      return res.status(400).json({ error: "Invalid session" })
    }

    if (Date.now() - cacheEntry.timestamp > 10 * 60 * 1000) {
      authChallengeCache.delete(sessionId)
      return res.status(400).json({ error: "Session expired" })
    }

    const requestOrigin = getPasskeyOriginFromRequest(req.headers.origin)
    const rpID = getPasskeyRpIDForOrigin(requestOrigin)

    const credentialId = credential.id

    const passkeySnap = await db
      .collection("passkeys")
      .where("credentialId", "==", credentialId)
      .limit(1)
      .get()

    if (passkeySnap.empty) {
      return res.status(401).json({ error: "Passkey not found" })
    }

    const passkeyDoc = passkeySnap.docs[0]
    const passkey = passkeyDoc.data()

    const verification = await verifyAuthentication(
      credential,
      cacheEntry.challenge,
      passkey,
      requestOrigin,
      rpID
    )

    await passkeyDoc.ref.update({
      counter: verification.newCounter,
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp()
    })

    const { jwtSecret } = getAdminConfig()
    const token = jwt.sign(
      { role: "admin", username: passkey.username },
      jwtSecret,
      { expiresIn: "30m" }
    )

    authChallengeCache.delete(sessionId)

    res.json({ success: true, token })
  } catch (err) {
    console.error(err)
    res.status(401).json({ error: err.message || "Authentication verification failed" })
  }
})

router.get("/devices", verifyAdmin, async (req, res) => {
  try {
    const { username } = req.admin

    const snap = await db
      .collection("passkeys")
      .where("username", "==", username)
      .get()

    const devices = snap.docs.map((doc) => ({
      id: doc.id,
      deviceName: doc.data().deviceName,
      backedUp: doc.data().backedUp,
      backupEligible: doc.data().backupEligible,
      createdAt: doc.data().createdAt,
      lastUsedAt: doc.data().lastUsedAt
    }))

    res.json({ success: true, devices })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch devices" })
  }
})

router.post("/remove-device", verifyAdmin, async (req, res) => {
  try {
    const { username } = req.admin
    const { deviceId } = req.body

    if (!deviceId) {
      return res.status(400).json({ error: "Missing deviceId" })
    }

    const doc = await db.collection("passkeys").doc(deviceId).get()

    if (!doc.exists) {
      return res.status(404).json({ error: "Device not found" })
    }

    if (doc.data().username !== username) {
      return res.status(403).json({ error: "Not authorized" })
    }

    await doc.ref.delete()

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to remove device" })
  }
})

export default router
