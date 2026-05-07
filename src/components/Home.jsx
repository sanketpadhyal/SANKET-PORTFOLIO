import { useEffect, useRef } from "react"
import { ArrowUpRight, FolderOpen, Trophy } from "lucide-react"
import "./Home.css"

const GithubIcon = ({ size = 24, strokeWidth = 2, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
)

export default function Hero(){
  const showcaseFrameRef = useRef(null)
  const projectNavigationTimeoutRef = useRef(null)

  const navigateToPath = (path) => {
    if (window.location.pathname === path) {
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    window.history.pushState({}, "", path)
    try {
      window.dispatchEvent(new PopStateEvent("popstate"))
    } catch {
      window.dispatchEvent(new Event("popstate"))
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }

  const openGithubProfile = () => {
    window.open("https://github.com/sanketpadhyal", "_blank", "noopener,noreferrer")
  }

  const navigateToProjectsWithDelay = () => {
    if (window.innerWidth > 900) {
      navigateToPath("/projects")
      return
    }

    if (projectNavigationTimeoutRef.current) {
      window.clearTimeout(projectNavigationTimeoutRef.current)
    }

    projectNavigationTimeoutRef.current = window.setTimeout(() => {
      navigateToPath("/projects")
      projectNavigationTimeoutRef.current = null
    }, 240)
  }

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }, [])

  useEffect(() => {
    const frame = showcaseFrameRef.current

    if (!frame) {
      return undefined
    }

    let rafId = 0

    const updateDesktopShowcaseMotion = () => {
      rafId = 0
      const isLowPerformanceMode = document.documentElement.dataset.performance === "low"

      if (window.innerWidth <= 900 || isLowPerformanceMode) {
        frame.style.transform = ""
        frame.style.opacity = ""
        return
      }

      const frameTop = frame.getBoundingClientRect().top + window.scrollY
      const viewportTrigger = window.innerHeight * 0.92
      const rawProgress = (window.scrollY + viewportTrigger - frameTop) / 520
      const progress = Math.max(0, Math.min(rawProgress, 1))
      const translateY = 72 - progress * 72
      const scale = 0.968 + progress * 0.032
      const opacity = 0.78 + progress * 0.22

      frame.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`
      frame.style.opacity = `${opacity}`
    }

    const requestUpdate = () => {
      if (rafId) {
        return
      }

      rafId = window.requestAnimationFrame(updateDesktopShowcaseMotion)
    }

    requestUpdate()
    window.addEventListener("scroll", requestUpdate, { passive: true })
    window.addEventListener("resize", requestUpdate)

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId)
      }

      window.removeEventListener("scroll", requestUpdate)
      window.removeEventListener("resize", requestUpdate)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (projectNavigationTimeoutRef.current) {
        window.clearTimeout(projectNavigationTimeoutRef.current)
      }
    }
  }, [])

  return (
    <>
      <section className="hero">
        <div className="hero-glow hero-glow-left" aria-hidden="true" />
        <div className="hero-glow hero-glow-right" aria-hidden="true" />

        <div className="hero-shell">
          <div className="hero-badge">
            <span className="hero-badge-live">
              <span className="dot"></span>
              <span>Live now</span>
            </span>
            <span className="hero-badge-text">Available For Work</span>
          </div>

          <h1 className="hero-title">
            <span className="hero-name">
              <span className="hero-name-first">Sanket</span>
              <span className="hero-name-last">Padhyal</span>
            </span>
          </h1>

          <div className="hero-sub-panel">
            <span className="hero-sub-label">About</span>
            <p className="hero-sub">
              Full Stack Developer building scalable, real-time web applications with modern architectures. Focused on performance, security, and production-ready systems.
            </p>
          </div>

          <div className="hero-update-panel">
            <span className="hero-update-label">Site Update</span>
            <p className="hero-update-text">
              Last updated web on <span className="hero-update-date">07 May </span>
              <span className="hero-update-year">2026</span>
            </p>
          </div>

          <div className="hero-actions">
            <button className="primary-btn" type="button" onClick={navigateToProjectsWithDelay}>
              <span className="hero-btn-text hero-btn-top">
                <span className="hero-btn-content">
                  <FolderOpen size={14} strokeWidth={2.1} />
                  <span>View Projects</span>
                </span>
              </span>
              <span className="hero-btn-text hero-btn-bottom">
                <span className="hero-btn-content">
                  <FolderOpen size={14} strokeWidth={2.1} />
                  <span>View Projects</span>
                </span>
              </span>
            </button>

            <button className="secondary-btn" type="button" onClick={() => navigateToPath("/contact")}>
              <span className="secondary-btn-content secondary-btn-content-top" aria-hidden="true">
                <span className="secondary-btn-label">Contact Me</span>
                <span className="secondary-btn-icon"><ArrowUpRight size={14} strokeWidth={2.2} /></span>
              </span>
              <span className="secondary-btn-content secondary-btn-content-bottom" aria-hidden="true">
                <span className="secondary-btn-label">Contact Me</span>
                <span className="secondary-btn-icon"><ArrowUpRight size={14} strokeWidth={2.2} /></span>
              </span>
            </button>

            <button className="secondary-btn" type="button" onClick={() => navigateToPath("/leaderboard")}>
              <span className="secondary-btn-content secondary-btn-content-top" aria-hidden="true">
                <span className="secondary-btn-label">Leaderboard</span>
                <span className="secondary-btn-icon"><Trophy size={14} strokeWidth={2.2} /></span>
              </span>
              <span className="secondary-btn-content secondary-btn-content-bottom" aria-hidden="true">
                <span className="secondary-btn-label">Leaderboard</span>
                <span className="secondary-btn-icon"><Trophy size={14} strokeWidth={2.2} /></span>
              </span>
            </button>

            <button className="secondary-btn" type="button" onClick={() => navigateToPath("/experience")}>
              <span className="secondary-btn-content secondary-btn-content-top" aria-hidden="true">
                <span className="secondary-btn-label">View Education</span>
                <span className="secondary-btn-icon"><ArrowUpRight size={14} strokeWidth={2.2} /></span>
              </span>
              <span className="secondary-btn-content secondary-btn-content-bottom" aria-hidden="true">
                <span className="secondary-btn-label">View Education</span>
                <span className="secondary-btn-icon"><ArrowUpRight size={14} strokeWidth={2.2} /></span>
              </span>
            </button>

            <button className="secondary-btn" type="button" onClick={openGithubProfile}>
              <span className="secondary-btn-content secondary-btn-content-top" aria-hidden="true">
                <span className="secondary-btn-label">GitHub</span>
                <span className="secondary-btn-icon"><GithubIcon size={14} strokeWidth={2.2} /></span>
              </span>
              <span className="secondary-btn-content secondary-btn-content-bottom" aria-hidden="true">
                <span className="secondary-btn-label">GitHub</span>
                <span className="secondary-btn-icon"><GithubIcon size={14} strokeWidth={2.2} /></span>
              </span>
            </button>
          </div>
        </div>
      </section>

      <section className="github-showcase" aria-label="GitHub showcase">
        <div className="github-showcase-shell">
          <div className="github-showcase-frame" ref={showcaseFrameRef}>
            <img
              className="github-showcase-image github-showcase-image-light"
              src="/assets/github-light.webp"
              alt="GitHub profile preview in light mode"
            />
            <img
              className="github-showcase-image github-showcase-image-dark"
              src="/assets/github-dark.webp"
              alt="GitHub profile preview in dark mode"
            />
          </div>
        </div>
      </section>
    </>
  )
}
