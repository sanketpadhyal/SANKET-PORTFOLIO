import { useEffect, useState, useRef } from "react"
import Lenis from "lenis"
import Navbar from "./navbar/Navbar"
import Loader from "./loading-page/Loader"
import Home from "./components/Home"
import WhyDifferent from "./components/WhyDifferent"
import TechnicalSkills from "./components/TechnicalSkills"
import HomeProjectsCTA from "./components/HomeProjectsCTA"
import EducationExperience from "./components/EducationExperience"
import SiteFooter from "./components/SiteFooter"
import AiCircle from "./AI/AiCircle"
import Projects from "./Projects/Projects"
import RepoPage from "./Projects/RepoPage"
import ContactPage from "./Contact/ContactPage"
import TicketsPage from "./Tickets/TicketsPage"
import AdminPage from "./Admin/AdminPage"
import CoffeePage from "./Coffee/Coffee"
import PayoutPage from "./Coffee/Payout"
import AttachmentPage from "./Coffee/Attachment"
import LeaderboardPage from "./Leaderboard/LeaderboardPage"

const APP_ASSETS = [
  "/assets/sanket.webp",
  "/assets/github-light.webp",
  "/assets/github-dark.webp"
]

const shouldUseLowPerformanceMode = () => {
  if (typeof window === "undefined") {
    return false
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches
  const smallScreen = window.innerWidth <= 900
  const lowMemory = typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 3
  const lowCpu = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4
  const saveData = navigator.connection?.saveData === true
  const mobileLikeDevice = coarsePointer || smallScreen

  if (reducedMotion) {
    return true
  }

  if (!mobileLikeDevice) {
    return false
  }

  return lowMemory || lowCpu || saveData
}

const getCurrentPath = () => {
  if (typeof window === "undefined") {
    return "/"
  }

  return window.location.pathname || "/"
}

export default function App() {
  const [loading, setLoading] = useState(true)
  const [pathname, setPathname] = useState(getCurrentPath)
  const lenisRef = useRef(null)

  useEffect(() => {
    const root = document.documentElement
    const syncPerformanceMode = () => {
      root.dataset.performance = shouldUseLowPerformanceMode() ? "low" : "default"
    }

    syncPerformanceMode()
    window.addEventListener("resize", syncPerformanceMode)

    return () => {
      window.removeEventListener("resize", syncPerformanceMode)
    }
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const touchQuery = window.matchMedia("(pointer: coarse)")
    const finePointerQuery = window.matchMedia("(pointer: fine)")

    if (mediaQuery.matches || touchQuery.matches || !finePointerQuery.matches) {
      return undefined
    }

    const lenis = new Lenis({
      duration: 0.82,
      lerp: 0.11,
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1,
      wheelMultiplier: 0.88,
      gestureOrientation: "vertical",
      autoResize: true
    })

    lenisRef.current = lenis

    let rafId = 0

    const onFrame = (time) => {
      lenis.raf(time)
      rafId = window.requestAnimationFrame(onFrame)
    }

    rafId = window.requestAnimationFrame(onFrame)

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId)
      }

      lenis.destroy()
    }
  }, [])

  useEffect(() => {
    const syncPathname = () => {
      setPathname(getCurrentPath())
    }

    window.addEventListener("popstate", syncPathname)

    return () => {
      window.removeEventListener("popstate", syncPathname)
    }
  }, [])

  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { duration: 0 })
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname])

  const isTechnicalSkillsPage = pathname === "/techskills"
  const isEducationExperiencePage = pathname === "/experience"
  const isProjectsPage = pathname === "/projects"
  const isRepoPage = pathname === "/repo"
  const isContactPage = pathname === "/contact"
  const isTicketsPage = pathname === "/contact/tickets"
  const isCoffeePage = pathname === "/coffee" || pathname === "/home/coffee"
  const isCoffeePayoutPage = pathname === "/coffee/payout" || pathname === "/home/coffee/payout"
  const isCoffeeAttachmentPage = pathname === "/coffee/attachment" || pathname === "/home/coffee/attachment"
  const isLeaderboardPage = pathname === "/leaderboard"

  const getSubdomain = () => {
    if (typeof window === "undefined") return ""
    const host = window.location.hostname
    const parts = host.split(".")
    return parts.length > 2 ? parts[0] : ""
  }

  const subdomain = getSubdomain()

  const isAdminPage =
    subdomain === "admin" ||
    window.location.pathname === "/admin"

  if (isAdminPage) {
    return <AdminPage />
  }

  return (
    <>
      {loading ? (
        <Loader assets={APP_ASSETS} onComplete={() => setLoading(false)} />
      ) : (
        <>
          {!isRepoPage ? <Navbar /> : null}
          {isTechnicalSkillsPage ? (
            <TechnicalSkills standalone />
          ) : isEducationExperiencePage ? (
            <EducationExperience />
          ) : isProjectsPage ? (
            <Projects />
          ) : isContactPage ? (
            <ContactPage />
          ) : isTicketsPage ? (
            <TicketsPage />
          ) : isRepoPage ? (
            <RepoPage />
          ) : isCoffeeAttachmentPage ? (
            <AttachmentPage />
          ) : isCoffeePayoutPage ? (
            <PayoutPage />
          ) : isCoffeePage ? (
            <CoffeePage />
          ) : isLeaderboardPage ? (
            <LeaderboardPage />
          ) : (
            <>
              <Home />
              <WhyDifferent />
              <TechnicalSkills />
              <HomeProjectsCTA />
            </>
          )}
          {!isRepoPage && !isTicketsPage && !isLeaderboardPage ? <SiteFooter /> : null}
          {!isRepoPage ? <AiCircle /> : null}
        </>
      )}
    </>
  )
}
