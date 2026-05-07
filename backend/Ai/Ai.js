import express from "express"
import rateLimit, { ipKeyGenerator } from "express-rate-limit"

const router = express.Router()

const API_KEYS = String(process.env.GROQ_API_KEYS || "")
  .split(",")
  .map((key) => key.trim())
  .filter(Boolean)

let currentApiIndex = 0

const getNextApiKey = () => {
  if (!API_KEYS.length) {
    throw new Error("GROQ_API_KEYS is not configured")
  }

  const key = API_KEYS[currentApiIndex]
  currentApiIndex = (currentApiIndex + 1) % API_KEYS.length
  return key
}

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req.ip)
    const msg = req.body?.message?.slice(0, 10) || "anon"
    return `${ip}:${msg}`
  },
  message: {
    error: "Too many AI requests. Wait a bit."
  },
  standardHeaders: true,
  legacyHeaders: false
})

router.post("/", aiLimiter, async (req, res) => {
  try {
    const { message } = req.body

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Invalid message" })
    }

    if (message.length > 500) {
      return res.status(400).json({ error: "Message too long" })
    }

    await new Promise((r) => setTimeout(r, 400))

    const API_KEY = getNextApiKey()

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content: `You are a helpful AI assistant. Answer user questions clearly and concisely.

If a user asks where they can add data to train the AI or share data for review, tell them to use the Contact page on the site and send their details there. If needed, mention that this is the place to submit feedback or information for the project owner to review manually.`
            },
            {
              role: "user",
              content: message
            }
          ]
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error("Groq error:", data)
      return res.json({ reply: data.error?.message || "API error" })
    }

    const reply = data.choices?.[0]?.message?.content || "No response"

    res.json({ reply })

  } catch (err) {
    console.error("Server error:", err)
    res.json({ reply: "Server error" })
  }
})

export default router
