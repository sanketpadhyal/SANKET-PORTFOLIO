import express from "express"
import jwt from "jsonwebtoken"
import admin from "../firebaseAdmin.js"

const router = express.Router()
const db = admin.firestore()

const JWT_SECRET = process.env.JWT_SECRET
const MAX_TICKETS = 10

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing")
}

const verifyJWT = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : req.body?.jwtToken

    if (!token) {
      return res.status(401).json({
        error: "Missing token"
      })
    }

    req.user = jwt.verify(token, JWT_SECRET)

    next()
  } catch {
    return res.status(401).json({
      error: "Invalid token"
    })
  }
}

const getCreatedAtMs = (value) => {
  if (!value) return 0

  if (typeof value.toDate === "function") {
    return value.toDate().getTime()
  }

  if (typeof value.seconds === "number") {
    return value.seconds * 1000
  }

  if (typeof value._seconds === "number") {
    return value._seconds * 1000
  }

  const parsed = new Date(value).getTime()

  return Number.isNaN(parsed) ? 0 : parsed
}

const normalizeTicketField = (value, fallback = "") => {
  if (value === null || value === undefined) {
    return fallback
  }

  const text = String(value)
    .replace(/\s+/g, " ")
    .trim()

  if (
    !text ||
    text.toLowerCase() === "null" ||
    text.toLowerCase() === "undefined"
  ) {
    return fallback
  }

  return text
}

const cleanTicketText = (message) =>
  message
    .replace(
      /^(ok|okay|yes|yeah|sure|bro|hey|hi|hie|hello)\s+[,.-]?\s*/i,
      ""
    )
    .replace(
      /^(please\s+)?(can u\s+|can you\s+|could u\s+|could you\s+|will you\s+)?/i,
      ""
    )
    .replace(
      /^(create|raise|open|make|submit|file|add)\s+(a\s+|new\s+)?ticket\s*(for|about|on|:|-)?\s*/i,
      ""
    )
    .replace(/\s+/g, " ")
    .trim()

const listUserTickets = async (uid) => {
  const snap = await db
    .collection("tickets")
    .where("uid", "==", uid)
    .get()

  const tickets = snap.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data()
    }))
    .sort(
      (a, b) =>
        getCreatedAtMs(b.createdAt) -
        getCreatedAtMs(a.createdAt)
    )

  return {
    tickets,
    remaining: Math.max(0, MAX_TICKETS - snap.size),
    total: MAX_TICKETS
  }
}

const isVagueTicketDraft = ({ title, details }) => {
  const combined = `${title} ${details}`
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  const meaningfulContent = combined
    .replace(
      /\b(ok|okay|yes|yeah|sure|bro|please|for me|help me|i want to|can u|can you|could u|could you|will you)\b/g,
      " "
    )
    .replace(
      /\b(lets|let s|let us)\s+create\s+(a\s+|new\s+)?ticket\b/g,
      " "
    )
    .replace(
      /\b(create|raise|open|make|submit|file|add)\s+(a\s+|new\s+)?ticket\b/g,
      " "
    )
    .replace(/\bticket\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  const vaguePatterns = [
    /^$/,
    /^(a |new )?ticket$/,
    /^for me$/,
    /^lets create (a |new )?ticket$/,
    /^create (a |new )?ticket$/,
    /^can u create (a |new )?ticket$/,
    /^can you create (a |new )?ticket$/,
    /^please create (a )?ticket$/,
    /^help me create (a )?ticket$/,
    /^i want to create (a )?ticket$/
  ]

  return (
    combined.length < 12 ||
    meaningfulContent.length < 4 ||
    vaguePatterns.some((pattern) => pattern.test(combined))
  )
}

const parseTicketDraft = (message) => {
  const titleMatch = message.match(
    /title\s*[:=]\s*([\s\S]*?)(?:\n|(?:\s+(?:and\s+)?)?(?:detail|details|description)\s*[:=]|$)/i
  )

  const detailsMatch = message.match(
    /(?:detail|details|description)\s*[:=]\s*([\s\S]+)/i
  )

  if (titleMatch || detailsMatch) {
    const cleaned = cleanTicketText(message)

    const inferredTitle = detailsMatch
      ? cleaned
          .slice(
            0,
            cleaned
              .toLowerCase()
              .indexOf(detailsMatch[0].toLowerCase())
          )
          .replace(/title\s*[:=]/i, "")
          .trim()
      : ""

    return {
      title: (titleMatch?.[1] || inferredTitle).trim(),
      details: (detailsMatch?.[1] || "").trim()
    }
  }

  const cleaned = cleanTicketText(message)

  const parts = cleaned
    .split(
      /\s+(?:because|details are|details:|description:)\s+/i
    )
    .map((part) => part.trim())
    .filter(Boolean)

  const details = parts.join(" ").trim() || cleaned

  const title = (parts[0] || cleaned)
    .replace(/[.!?]\s+[\s\S]*$/, "")
    .slice(0, 92)
    .trim()

  return {
    title,
    details
  }
}

const wantsTicketList = (message) => {
  const text = message.toLowerCase()

  return (
    (
      /\b(my|current|existing|open|old|all|latest|recent)\b/.test(text) &&
      /\btickets?\b/.test(text)
    ) ||
    /\b(read|show|list|summarize|status|check)\b.*\btickets?\b/.test(text) ||
    /\b(reply|replies|replied|response|responses)\b/.test(text)
  )
}

const wantsTicketDelete = (message) =>
  /\b(delete|remove|erase|clear|cancel)\b.*\btickets?\b/i.test(message) ||
  /\btickets?\b.*\b(delete|remove|erase|clear)\b/i.test(message)

const getTicketIndexRequest = (message) => {
  const text = message.toLowerCase()

  const ordinalMap = {
    first: 0,
    "1st": 0,
    second: 1,
    "2nd": 1,
    third: 2,
    "3rd": 2,
    fourth: 3,
    "4th": 3,
    fifth: 4,
    "5th": 4
  }

  for (const [word, index] of Object.entries(ordinalMap)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) {
      return index
    }
  }

  const numbered = text.match(/\b(?:ticket\s*)?#?\s*(\d+)\b/)

  if (numbered) {
    return Math.max(0, Number(numbered[1]) - 1)
  }

  return null
}

const summarizeTicketReply = (tickets, requestedIndex) => {
  const ticket = tickets[requestedIndex]

  if (!ticket) {
    return `**Ticket not found**

I could not find ticket #${requestedIndex + 1}.`
  }

  const title = normalizeTicketField(
    ticket.title,
    "Untitled ticket"
  )

  const status = normalizeTicketField(
    ticket.status,
    "Open"
  )

  const reply = normalizeTicketField(
    ticket.reply,
    "No admin reply yet"
  )

  return `**Ticket Reply**

**Ticket:** ${title}
**Status:** ${status}
**Admin reply:** ${reply}`
}

const summarizeTickets = (
  tickets,
  remaining,
  total
) => {
  if (!tickets.length) {
    return `**No tickets yet**

You can create up to **${total}** tickets.
**${remaining}** slots are available.`
  }

  const sent = tickets.filter(
    (ticket) => ticket.status === "Sent"
  ).length

  const replied = tickets.filter(
    (ticket) => ticket.status === "Replied"
  ).length

  const latest = tickets
    .slice(0, 5)
    .map((ticket, index) => {
      const title = normalizeTicketField(
        ticket.title,
        "Untitled ticket"
      )

      const details = normalizeTicketField(
        ticket.details
      )

      const reply = normalizeTicketField(
        ticket.reply,
        "No admin reply yet"
      )

      const status = normalizeTicketField(
        ticket.status,
        "Open"
      )

      const detailsLine = details
        ? `\nDetails: ${details}`
        : ""

      return `${index + 1}. ${title}
Status: ${status}${detailsLine}
Reply: ${reply}`
    })
    .join("\n\n")

  return `**Ticket Summary**

Total: ${tickets.length}
Sent: ${sent}
Replied: ${replied}
Available slots: ${remaining} of ${total}

${latest}`
}

router.post("/", verifyJWT, async (req, res) => {
  try {
    const { message, confirmedDraft } = req.body

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

    if (message.length > 1000) {
      return res.status(400).json({
        error: "Message too long"
      })
    }

    const uid = req.user.uid
    const email = req.user.email
    const name = req.user.name

    const hasConfirmedDraft =
      confirmedDraft &&
      typeof confirmedDraft === "object" &&
      !Array.isArray(confirmedDraft)

    if (!hasConfirmedDraft && wantsTicketDelete(message)) {
      const { tickets, remaining, total } =
        await listUserTickets(uid)

      return res.json({
        action: "delete_not_supported",
        reply:
          "Ticket deletion is not available.",
        tickets,
        remaining,
        total
      })
    }

    if (
      !hasConfirmedDraft &&
      !/\bticket\b/i.test(message)
    ) {
      const { tickets, remaining, total } =
        await listUserTickets(uid)

      return res.json({
        action: "help",
        reply:
          `I can create or read your tickets. You currently have ${remaining} of ${total} ticket slots available.`,
        tickets,
        remaining,
        total
      })
    }

    if (
      wantsTicketList(message) &&
      !hasConfirmedDraft
    ) {
      const { tickets, remaining, total } =
        await listUserTickets(uid)

      const requestedIndex =
        getTicketIndexRequest(message)

      if (
        requestedIndex !== null &&
        /\breply|response\b/i.test(message)
      ) {
        return res.json({
          action: "read_ticket_reply",
          reply: summarizeTicketReply(
            tickets,
            requestedIndex
          ),
          tickets,
          remaining,
          total
        })
      }

      return res.json({
        action: "list_tickets",
        reply: summarizeTickets(
          tickets,
          remaining,
          total
        ),
        tickets,
        remaining,
        total
      })
    }

    const draft = hasConfirmedDraft
      ? {
          title: normalizeTicketField(
            confirmedDraft.title
          ),
          details: normalizeTicketField(
            confirmedDraft.details
          )
        }
      : parseTicketDraft(message)

    const title = draft.title.trim()
    const details = draft.details.trim()

    if (
      !title ||
      title.length < 4 ||
      !details ||
      isVagueTicketDraft({ title, details })
    ) {
      return res.json({
        action: "needs_more_info",
        reply:
          "Please provide a proper ticket title and clear details."
      })
    }

    if (
      title.length > 100 ||
      details.length > 1000
    ) {
      return res.status(400).json({
        error:
          "Ticket title or details are too long"
      })
    }

    if (!hasConfirmedDraft) {
      return res.json({
        action: "preview_ticket",
        reply: `Ticket Preview

Title: ${title}

Details:
${details}

Reply with "send" or "confirm" to create this ticket.`,
        draft: {
          title,
          details
        },
        total: MAX_TICKETS
      })
    }

    const userRef =
      db.collection("users").doc(uid)

    const userSnap = await userRef.get()

    const userData = userSnap.data() || {}

    let ticketId = ""
    let remaining = 0

    await db.runTransaction(async (transaction) => {
      const ticketsSnap = await transaction.get(
        db
          .collection("tickets")
          .where("uid", "==", uid)
      )

      if (ticketsSnap.size >= MAX_TICKETS) {
        throw new Error("LIMIT_REACHED")
      }

      const ticketRef =
        db.collection("tickets").doc()

      ticketId = ticketRef.id

      remaining =
        MAX_TICKETS - (ticketsSnap.size + 1)

      transaction.set(ticketRef, {
        uid,
        name: userData.name || name,
        username:
          userData.showUsername === false
            ? ""
            : userData.username || "",
        email,
        title,
        details,
        status: "Sent",
        seen: false,
        reply: null,
        showProfilePhoto:
          userData.showProfilePhoto ?? true,
        showUsername:
          userData.showUsername ?? true,
        createdAt:
          admin.firestore.FieldValue.serverTimestamp(),
        createdBy: "ticket_agent"
      })
    })

    return res.status(201).json({
      action: "create_ticket",
      reply: `Ticket created successfully.

Title: ${title}
Status: Sent
Remaining slots: ${remaining}/${MAX_TICKETS}`,
      createdTicket: {
        id: ticketId,
        title,
        details,
        status: "Sent"
      },
      remaining,
      total: MAX_TICKETS
    })
  } catch (err) {
    if (err.message === "LIMIT_REACHED") {
      return res.status(403).json({
        error: "Ticket limit reached",
        reply:
          "Your ticket limit has been reached.",
        remaining: 0,
        total: MAX_TICKETS
      })
    }

    console.error("Ticket agent error:", err)

    return res.status(500).json({
      error: "Internal server error"
    })
  }
})

export default router
