const parseCsvList = (value) =>
  String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)

const unique = (values) => [...new Set(values)]

export const getAllowedPasskeyOrigins = () => {
  return unique([
    ...parseCsvList(process.env.PASSKEY_ALLOWED_ORIGINS),
    ...(process.env.PASSKEY_ORIGIN ? [process.env.PASSKEY_ORIGIN] : []),
    "http://localhost:3000"
  ])
}

export const getAllowedPasskeyRpIDs = () => {
  return unique([
    ...parseCsvList(process.env.PASSKEY_ALLOWED_RP_IDS),
    ...(process.env.PASSKEY_RP_ID ? [process.env.PASSKEY_RP_ID] : []),
    "localhost"
  ])
}

export const normalizeOrigin = (value) => {
  if (!value) return ""

  try {
    return new URL(value).origin
  } catch {
    return String(value).trim()
  }
}

export const getPasskeyOriginFromRequest = (originHeader) => {
  const normalizedOrigin = normalizeOrigin(originHeader)
  return normalizedOrigin || getAllowedPasskeyOrigins()[0]
}

export const getPasskeyRpIDForOrigin = (origin) => {
  try {
    const hostname = new URL(normalizeOrigin(origin)).hostname.toLowerCase()

    if (hostname === "localhost") {
      return hostname
    }

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
      return hostname
    }

    if (hostname.startsWith("admin.")) {
      return hostname.slice(6)
    }

    return hostname
  } catch {
    return getAllowedPasskeyRpIDs()[0]
  }
}