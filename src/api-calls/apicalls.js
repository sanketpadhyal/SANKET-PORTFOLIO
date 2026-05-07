const API_BASE = (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_BASE)
  ? process.env.REACT_APP_API_BASE
  : "http://localhost:8080"
const JWT_TOKEN_KEY = "sanket_jwt_token"

const assertApiBase = () => {
  if (API_BASE) return
  throw new Error("Missing REACT_APP_API_BASE. Set it in frontend/.env")
}

export const getJWTToken = () => {
  if (typeof window === "undefined") return null
  return localStorage.getItem(JWT_TOKEN_KEY)
}


export const setJWTToken = (token) => {
  if (typeof window === "undefined") return
  if (token) {
    localStorage.setItem(JWT_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(JWT_TOKEN_KEY)
  }
}


export const clearJWTToken = () => {
  if (typeof window === "undefined") return
  localStorage.removeItem(JWT_TOKEN_KEY)
}


export const callAI = async (message, signal = null) => {
  assertApiBase()
  const response = await fetch(`${API_BASE}/ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message }),
    signal: signal
  })
  const data = await response.json()
  return {
    ok: response.ok,
    status: response.status,
    data: data
  }
}


export const authGoogle = async (token) => {
  assertApiBase()
  const response = await fetch(`${API_BASE}/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ token })
  })
  
  const data = await response.json()
  
  if (response.ok && data.jwtToken) {
    setJWTToken(data.jwtToken)
  }
  
  return {
    ok: response.ok,
    status: response.status,
    data: data
  }
}

export const getProfile = async (jwtToken = null) => {
  assertApiBase()
  const token = jwtToken || getJWTToken()
  const response = await fetch(`${API_BASE}/auth/me`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  })
  const data = await response.json()
  return {
    ok: response.ok,
    status: response.status,
    data: data
  }
}

export const updateProfile = async (name, showProfilePhoto, showUsername, jwtToken = null) => {
  assertApiBase()
  const token = jwtToken || getJWTToken()
  const response = await fetch(`${API_BASE}/auth/update-profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      name,
      showProfilePhoto,
      showUsername
    })
  })
  const data = await response.json()
  return {
    ok: response.ok,
    status: response.status,
    data: data
  }
}


export const getTickets = async (jwtToken = null) => {
  assertApiBase()
  const token = jwtToken || getJWTToken()
  const response = await fetch(`${API_BASE}/tickets/list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  })
  const data = await response.json()
  return {
    ok: response.ok,
    status: response.status,
    data: data
  }
}

export const createTicket = async (title, details, showProfilePhoto, showUsername, jwtToken = null) => {
  assertApiBase()
  const token = jwtToken || getJWTToken()
  const response = await fetch(`${API_BASE}/tickets/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      title,
      details,
      showProfilePhoto,
      showUsername
    })
  })
  const data = await response.json()
  return {
    ok: response.ok,
    status: response.status,
    data: data
  }
}

export const createLeaderboardEntry = async ({
  name,
  amount,
  transactionId,
  message,
  paymentProofFile,
  profilePhotoFile
}) => {
  assertApiBase()
  const formData = new FormData()
  formData.append("name", name)
  formData.append("amount", amount)
  formData.append("transactionId", transactionId)
  formData.append("message", message)
  formData.append("paymentProof", paymentProofFile)
  formData.append("profilePhoto", profilePhotoFile)

  const response = await fetch(`${API_BASE}/leaderboard/entry`, {
    method: "POST",
    body: formData
  })

  const data = await response.json()

  return {
    ok: response.ok,
    status: response.status,
    data: data
  }
}

export const adminLogin = async (username, password) => {
  assertApiBase()
  const response = await fetch(`${API_BASE}/admin/auth-access`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  })
  const data = await response.json()
  return {
    ok: response.ok,
    status: response.status,
    data: data
  }
}

export const getAdminToken = () => {
  if (typeof window === "undefined") return null
  return localStorage.getItem("admin_token")
}

const withAdminAuth = () => {
  const token = getAdminToken()
  if (!token) {
    return { error: "Missing admin token" }
  }
  return { token }
}

export const adminListTickets = async ({ status = "all", limit = 120, query = "" } = {}) => {
  assertApiBase()
  const { token, error } = withAdminAuth()
  if (error) {
    return { ok: false, status: 401, data: { error } }
  }

  const response = await fetch(`${API_BASE}/admin/tickets/list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ status, limit, query })
  })

  const data = await response.json()
  return { ok: response.ok, status: response.status, data }
}

export const adminReplyTicket = async ({ ticketId, reply }) => {
  assertApiBase()
  const { token, error } = withAdminAuth()
  if (error) {
    return { ok: false, status: 401, data: { error } }
  }

  const response = await fetch(`${API_BASE}/admin/tickets/reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ ticketId, reply })
  })

  const data = await response.json()
  return { ok: response.ok, status: response.status, data }
}

export const adminUpdateTicketStatus = async ({ ticketId, status, seen = null }) => {
  assertApiBase()
  const { token, error } = withAdminAuth()
  if (error) {
    return { ok: false, status: 401, data: { error } }
  }

  const payload = { ticketId, status }
  if (typeof seen === "boolean") payload.seen = seen

  const response = await fetch(`${API_BASE}/admin/tickets/update-status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  })

  const data = await response.json()
  return { ok: response.ok, status: response.status, data }
}

export const adminDeleteTicket = async ({ ticketId }) => {
  assertApiBase()
  const { token, error } = withAdminAuth()
  if (error) {
    return { ok: false, status: 401, data: { error } }
  }

  const response = await fetch(`${API_BASE}/admin/tickets/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ ticketId })
  })

  const data = await response.json()
  return { ok: response.ok, status: response.status, data }
}

export const adminListPayments = async ({ status = "all", limit = 120, query = "" } = {}) => {
  assertApiBase()
  const { token, error } = withAdminAuth()
  if (error) {
    return { ok: false, status: 401, data: { error } }
  }

  const response = await fetch(`${API_BASE}/admin/payments/list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ status, limit, query })
  })

  const data = await response.json()
  return { ok: response.ok, status: response.status, data }
}

export const adminUpdatePaymentStatus = async ({ paymentId, status }) => {
  assertApiBase()
  const { token, error } = withAdminAuth()
  if (error) {
    return { ok: false, status: 401, data: { error } }
  }

  const response = await fetch(`${API_BASE}/admin/payments/update-status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ paymentId, status })
  })

  const data = await response.json()
  return { ok: response.ok, status: response.status, data }
}

export const adminDeletePayment = async ({ paymentId }) => {
  assertApiBase()
  const { token, error } = withAdminAuth()
  if (error) {
    return { ok: false, status: 401, data: { error } }
  }

  const response = await fetch(`${API_BASE}/admin/payments/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ paymentId })
  })

  const data = await response.json()
  return { ok: response.ok, status: response.status, data }
}

export const adminListLeaderboardSuccess = async ({ limit = 20, query = "" } = {}) => {
  assertApiBase()
  const { token, error } = withAdminAuth()
  if (error) {
    return { ok: false, status: 401, data: { error } }
  }

  const response = await fetch(`${API_BASE}/leaderboard/success/list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ limit, query })
  })

  const data = await response.json()
  return { ok: response.ok, status: response.status, data }
}

export const listPublicLeaderboardTop = async ({ limit = 100, query = "" } = {}) => {
  assertApiBase()
  const response = await fetch(`${API_BASE}/leaderboard/public/top`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ limit, query })
  })

  const data = await response.json()
  return { ok: response.ok, status: response.status, data }
}

export const adminGetRegistrationOptions = async () => {
  assertApiBase()
  const { token, error } = withAdminAuth()
  if (error) {
    return { ok: false, status: 401, data: { error } }
  }

  const response = await fetch(`${API_BASE}/admin/passkey/register-options`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  })

  const data = await response.json()
  return { ok: response.ok, status: response.status, data }
}

export const adminVerifyPasskeyRegistration = async ({ credential, deviceName }) => {
  assertApiBase()
  const { token, error } = withAdminAuth()
  if (error) {
    return { ok: false, status: 401, data: { error } }
  }

  const response = await fetch(`${API_BASE}/admin/passkey/register-verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ credential, deviceName })
  })

  const data = await response.json()
  return { ok: response.ok, status: response.status, data }
}

export const adminGetAuthenticationOptions = async () => {
  assertApiBase()
  const response = await fetch(`${API_BASE}/admin/passkey/auth-options`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  })

  const data = await response.json()
  return { ok: response.ok, status: response.status, data }
}

export const adminVerifyPasskeyAuthentication = async ({ credential, sessionId }) => {
  assertApiBase()
  const response = await fetch(`${API_BASE}/admin/passkey/auth-verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ credential, sessionId })
  })

  const data = await response.json()
  return { ok: response.ok, status: response.status, data }
}

export const adminListPasskeyDevices = async () => {
  assertApiBase()
  const { token, error } = withAdminAuth()
  if (error) {
    return { ok: false, status: 401, data: { error } }
  }

  const response = await fetch(`${API_BASE}/admin/passkey/devices`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  })

  const data = await response.json()
  return { ok: response.ok, status: response.status, data }
}

export const adminRemovePasskeyDevice = async ({ deviceId }) => {
  assertApiBase()
  const { token, error } = withAdminAuth()
  if (error) {
    return { ok: false, status: 401, data: { error } }
  }

  const response = await fetch(`${API_BASE}/admin/passkey/remove-device`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ deviceId })
  })

  const data = await response.json()
  return { ok: response.ok, status: response.status, data }
}
