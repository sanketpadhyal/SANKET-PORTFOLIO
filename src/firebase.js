import { initializeApp } from "firebase/app"
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  setPersistence,
  signInWithPopup,
  signOut
} from "firebase/auth"
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
}

const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean)

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null
const auth = app ? getAuth(app) : null
const db = app ? getFirestore(app) : null

const googleProvider = new GoogleAuthProvider()

googleProvider.setCustomParameters({
  prompt: "select_account"
})

const requireFirebase = () => {
  if (!auth || !db) {
    throw new Error("Firebase is not configured")
  }
}

const ensureAuthPersistence = () => {
  requireFirebase()
  return setPersistence(auth, browserLocalPersistence)
}

const signInWithGoogle = async () => {
  await ensureAuthPersistence()
  return signInWithPopup(auth, googleProvider)
}

const signOutUser = async () => {
  requireFirebase()
  await signOut(auth)
}

const ensureUserProfile = async (user) => {
  requireFirebase()

  if (!user?.uid) {
    throw new Error("Missing authenticated user")
  }

  const userRef = doc(db, "users", user.uid)
  const userSnap = await getDoc(userRef)

  if (userSnap.exists()) {
    return userSnap.data()
  }

  const base = (user.email?.split("@")[0] || `user-${user.uid.slice(0, 6)}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `user-${user.uid.slice(0, 6)}`

  let username = base
  let usernameRef = doc(db, "usernames", username)
  let usernameSnap = await getDoc(usernameRef)

  while (usernameSnap.exists()) {
    const rand = Math.floor(100 + Math.random() * 900)
    username = `${base}${rand}`
    usernameRef = doc(db, "usernames", username)
    usernameSnap = await getDoc(usernameRef)
  }

  const userPayload = {
    name: user.displayName || "",
    email: user.email || "",
    photo: user.photoURL || "",
    username,
    createdAt: new Date()
  }

  await setDoc(userRef, userPayload)
  await setDoc(usernameRef, {
    uid: user.uid,
    name: user.displayName || "",
    email: user.email || "",
    username
  })

  return userPayload
}

export { app, auth, db, ensureUserProfile, signInWithGoogle, signOutUser }
