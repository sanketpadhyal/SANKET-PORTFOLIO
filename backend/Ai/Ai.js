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
      return res.status(400).json({
        error: "Invalid message"
      })
    }

    if (!message.trim()) {
      return res.status(400).json({
        error: "Message required"
      })
    }

    if (message.length > 500) {
      return res.status(400).json({
        error: "Message too long"
      })
    }

    await new Promise((resolve) => setTimeout(resolve, 400))

    const API_KEY = getNextApiKey()

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content: `
You are a helpful AI assistant.

Answer clearly, naturally, and concisely.

If a user asks:
- how to share data
- how to train the AI
- how to submit feedback
- how to send information for review

tell them to use the Contact page on the website and submit their details there for manual review.
              `
            },
            {
              role: "user",
              content: message.trim()
            }
          ]
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error("Groq API Error:", data)

      return res.status(response.status).json({
        error: data.error?.message || "AI request failed"
      })
    }

    const reply =
      data?.choices?.[0]?.message?.content || "No response generated"

    return res.status(200).json({
      reply
    })

  } catch (err) {
    console.error("Server Error:", err)

    return res.status(500).json({
      error: "Internal server error"
    })
  }
})

export default router
