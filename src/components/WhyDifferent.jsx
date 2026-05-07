import { useEffect, useRef, useState } from "react"
import "./WhyDifferent.css"

export default function WhyDifferent() {
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const section = sectionRef.current

    if (!section) {
      return undefined
    }

    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return
        }

        setIsVisible(true)
        observer.disconnect()
      },
      {
        threshold: 0.24,
        rootMargin: "0px 0px -12% 0px"
      }
    )

    observer.observe(section)

    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className={`difference-section ${isVisible ? "is-visible" : ""}`}
      aria-labelledby="difference-title"
    >
      <div className="difference-shell">
        <div className="difference-heading">
          <span className="difference-kicker">Why Sanket</span>
          <h2 className="difference-title" id="difference-title">
            What Makes Sanket <span className="difference-title-accent">Different</span>
          </h2>
          <p className="difference-copy">
            A builder mindset, sharp execution, and consistent delivery across product, frontend, backend, and real-world shipping speed.
          </p>
        </div>

        <div className="difference-grid">

          <article className="difference-card">
            <div className="difference-visual difference-visual-metric" aria-hidden="true">
              <div className="difference-metric-wrap">
                <span className="difference-metric-value">40+</span>
                <span className="difference-metric-label">Full Stack Projects</span>
              </div>
            </div>
            <h3 className="difference-card-title">Built Projects</h3>
            <p className="difference-card-copy">
              Hands-on work across full stack products, combining frontend polish, backend logic, integrations, and shipping focus.
            </p>
          </article>

          <article className="difference-card">
            <div className="difference-visual difference-visual-role" aria-hidden="true">
              <div className="difference-role-stack">
                <span className="difference-role-pill difference-role-pill-current">Full Stack Developer</span>
                <span className="difference-role-arrow">-></span>
                <span className="difference-role-pill difference-role-pill-future">Specialized Backend Engineer</span>
              </div>
            </div>
            <h3 className="difference-card-title">Backend Engineering</h3>
            <p className="difference-card-copy">
              Full stack foundation with deep focus on backend systems, scalability, and clean architecture.
            </p>
          </article>

          <article className="difference-card">
            <div className="difference-visual difference-visual-track" aria-hidden="true">
              <div className="difference-track-axis">
                <span>2024</span>
                <span>2025</span>
                <span>2026</span>
              </div>
              <div className="difference-track-line">
                <span className="difference-track-fill" />
                <span className="difference-track-dot difference-track-dot-start" />
                <span className="difference-track-dot difference-track-dot-active" />
              </div>
            </div>
            <h3 className="difference-card-title">Progress You Can Track</h3>
            <p className="difference-card-copy">
              A steady growth curve across projects, systems, and product thinking instead of random one-off experiments.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}
