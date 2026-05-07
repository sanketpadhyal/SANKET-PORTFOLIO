import express from "express"
import cors from "cors"
import rateLimit, { ipKeyGenerator } from "express-rate-limit"
import dotenv from "dotenv"

import authRoutes from "./Auth/Auth.js"
import ticketRoutes from "./Tickets/Tickets.js"
import aiRoutes from "./Ai/Ai.js"
import adminRoutes from "./Admin/Admin.js"
import passkeyRoutes from "./Passkey/Passkey.js"
import leaderboardRoutes from "./Leaderboard/Entry.js"
import leaderboardDeleteRoutes from "./Leaderboard/Delete.js"
import leaderboardOrganizeRoutes from "./Leaderboard/Organize.js"
import { getAllowedPasskeyOrigins } from "./Passkey/passkeyConfig.js"

dotenv.config()

const app = express()

const keyByIpAndToken = (req) =>
  `${ipKeyGenerator(req.ip)}:${req.body?.token || ""}`

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: keyByIpAndToken,
  message: { error: "Too many requests. Try again later." },
  standardHeaders: true,
  legacyHeaders: false
})

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  keyGenerator: keyByIpAndToken
})

const ticketLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  keyGenerator: keyByIpAndToken
})

const allowedPasskeyOrigins = getAllowedPasskeyOrigins()

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedPasskeyOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    callback(new Error("Not allowed by CORS"))
  },
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}))
app.use(express.json())

// Do not throttle the logged-in admin panel.
// Admin routes already have their own targeted limiters (e.g. login).
app.use((req, res, next) => {
  const path = req.path || ""
  const authHeader = String(req.headers.authorization || "")
  const hasBearer = authHeader.startsWith("Bearer ")

  if (path.startsWith("/admin")) return next()
  if (hasBearer && path === "/leaderboard/success/list") return next()

  return limiter(req, res, next)
})

app.use("/auth", authLimiter, authRoutes)
app.use("/tickets", ticketLimiter, ticketRoutes)
app.use("/ai", aiRoutes)
app.use("/admin", adminRoutes)
app.use("/admin/passkey", passkeyRoutes)
app.use("/leaderboard", leaderboardRoutes)
app.use("/leaderboard", leaderboardDeleteRoutes)
app.use("/leaderboard", leaderboardOrganizeRoutes)

const PORT = process.env.PORT || 8080

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`)
})
