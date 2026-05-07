import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from "@simplewebauthn/server"
import { randomBytes } from "crypto"
import { getAllowedPasskeyOrigins, getAllowedPasskeyRpIDs } from "./passkeyConfig.js"

export const getRegistrationOptions = async (username, rpID = getAllowedPasskeyRpIDs()[0]) => {
  return await generateRegistrationOptions({
    rpID,
    rpName: "Sanket Admin",
    userName: username,
    userID: Buffer.from(username, "utf8"),
    timeout: 60000,
    attestationType: "none",
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "preferred",
      userVerification: "required"
    }
  })
}

export const verifyRegistration = async (
  credentialJSON,
  expectedChallenge,
  expectedOrigin = getAllowedPasskeyOrigins(),
  expectedRPID = getAllowedPasskeyRpIDs()
) => {
  const credential =
    typeof credentialJSON === "string"
      ? JSON.parse(credentialJSON)
      : credentialJSON

  const base64UrlToBuffer = (base64url) => {
    const pad = "=".repeat((4 - (base64url.length % 4)) % 4)
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/") + pad
    return Buffer.from(base64, 'base64')
  }

  const credentialId = credential.id || credential.rawId
  const credentialRawId = credential.rawId || credential.id

  if (!credentialId) {
    throw new Error(`Credential missing both 'id' and 'rawId'. Received credential: ${JSON.stringify(credential).slice(0, 200)}...`)
  }

  const parsedCredential = {
    id: typeof credentialId === "string" ? base64UrlToBuffer(credentialId) : credentialId,
    rawId: typeof credentialRawId === "string" ? base64UrlToBuffer(credentialRawId) : credentialRawId,
    response: {
      clientDataJSON: base64UrlToBuffer(credential.response.clientDataJSON),
      attestationObject: base64UrlToBuffer(credential.response.attestationObject)
    },
    type: credential.type
  }

  const verification = await verifyRegistrationResponse({
    response: credential,
    expectedChallenge,
    expectedOrigin,
    expectedRPID,
    requireUserVerification: true
  })

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Registration verification failed")
  }

  return {
    credentialId: verification.registrationInfo.credentialID,
    publicKey: Buffer.from(
      verification.registrationInfo.credentialPublicKey
    ).toString("base64"),
    counter: verification.registrationInfo.counter,
    backedUp: verification.registrationInfo.credentialBackedUp,
    backupEligible:
      verification.registrationInfo.credentialBackupEligible ?? false
  }
}

export const getAuthenticationOptions = async (rpID = getAllowedPasskeyRpIDs()[0]) => {
  return await generateAuthenticationOptions({
    rpID,
    timeout: 60000,
    userVerification: "required"
  })
}

export const verifyAuthentication = async (
  credentialJSON,
  expectedChallenge,
  storedCredential,
  expectedOrigin = getAllowedPasskeyOrigins(),
  expectedRPID = getAllowedPasskeyRpIDs()
) => {
  const credential =
    typeof credentialJSON === "string"
      ? JSON.parse(credentialJSON)
      : credentialJSON

  const base64UrlToBuffer = (base64url) => {
    const pad = "=".repeat((4 - (base64url.length % 4)) % 4)
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/") + pad
    return Buffer.from(base64, 'base64')
  }

  const credentialId = credential.id || credential.rawId
  const credentialRawId = credential.rawId || credential.id

  const parsedCredential = {
    id: credentialId,
    rawId: typeof credentialRawId === "string" ? base64UrlToBuffer(credentialRawId) : credentialRawId,
    response: {
      clientDataJSON: base64UrlToBuffer(credential.response.clientDataJSON),
      authenticatorData: base64UrlToBuffer(credential.response.authenticatorData),
      signature: base64UrlToBuffer(credential.response.signature)
    },
    type: credential.type
  }

  const verification = await verifyAuthenticationResponse({
    response: credential,
    expectedChallenge,
    expectedOrigin,
    expectedRPID,
    authenticator: {
      credentialID: storedCredential.credentialId,
      credentialPublicKey: Buffer.from(storedCredential.publicKey, "base64"),
      counter: storedCredential.counter,
      transports: storedCredential.transports || ["internal"]
    }
  })

  if (!verification.verified) {
    throw new Error("Authentication verification failed")
  }

  return {
    verified: true,
    newCounter: verification.authenticationInfo.newCounter ?? storedCredential.counter ?? 0
  }
}

export const generateBase64Challenge = () => {
  return randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}