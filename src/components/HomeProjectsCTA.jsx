import { useEffect, useRef, useState } from "react"
import { ArrowUpRight, FolderGit2 } from "lucide-react"
import "./HomeProjectsCTA.css"

export default function HomeProjectsCTA() {
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const section = sectionRef.current

    if (!section) {
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return
        }

        setIsVisible(true)
        observer.disconnect()
      },
      {
        threshold: 0.24,
        rootMargin: "0px 0px -8% 0px"
      }
    )

    observer.observe(section)

    return () => observer.disconnect()
  }, [])

  const openProjectsPage = () => {
    if (window.location.pathname === "/projects") {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" })
      return
    }

    window.history.pushState({}, "", "/projects")
    try {
      window.dispatchEvent(new PopStateEvent("popstate"))
    } catch {
      window.dispatchEvent(new Event("popstate"))
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }

  return (
    <section
      ref={sectionRef}
      className={`home-projects-cta${isVisible ? " home-projects-cta-visible" : ""}`}
      aria-labelledby="home-projects-cta-title"
    >
      <div className="home-projects-cta-shell">
        <div className="home-projects-cta-card">
          <div className="home-projects-cta-copy">
            <span className="home-projects-cta-kicker">Projects</span>
            <h2 className="home-projects-cta-title" id="home-projects-cta-title">
              <span className="home-projects-cta-title-primary">Sanket</span>{" "}
              <span className="home-projects-cta-title-accent">has 5 pinned projects worth checking out.</span>
            </h2>
            <p className="home-projects-cta-text">
              Explore selected builds across real-time apps, product design, AI-powered features, and production-ready web systems in one focused showcase.
            </p>
          </div>

          <button className="home-projects-cta-button" type="button" onClick={openProjectsPage}>
            <span className="home-projects-cta-button-main">
              <FolderGit2 size={16} strokeWidth={2.1} />
              <span>Go To Projects</span>
            </span>
            <span className="home-projects-cta-button-meta">
              <span>Open portfolio</span>
              <ArrowUpRight size={15} strokeWidth={2.1} />
            </span>
          </button>
        </div>
      </div>
    </section>
  )
}
