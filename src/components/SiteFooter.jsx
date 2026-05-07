import { ArrowUpRight, Mail, UserCog, Info } from "lucide-react"
import "./SiteFooter.css"

const Github = ({ size = 24, strokeWidth = 2, ...props }) => (
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
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
)

const footerLinks = [
  { label: "Home", path: "/" },
  { label: "Projects", path: "/projects" },
  { label: "Skills", path: "/techskills" },
  { label: "Experience", path: "/experience" }
]

export default function SiteFooter() {
  const navigateToPath = (path) => {
    if (window.location.pathname === path) {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" })
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

  const openGithub = () => {
    window.open("https://github.com/sanketpadhyal", "_blank", "noopener,noreferrer")
  }

  const openSparse = () => {
    window.open("https://www.sparse.in/u/sanket", "_blank", "noopener,noreferrer")
  }

  const goAdmin = () => {
    const host = window.location.hostname

    if (host === "localhost" || host.includes("127.0.0.1")) {
      window.location.href = "/admin"
    } else {
      window.location.href = "https://admin.sanketpadhyal.world"
    }
  }

  return (
    <footer className="site-footer" aria-label="Site footer">
      <div className="site-footer-shell">
        <div className="site-footer-card">
          <div className="site-footer-brand">
            <h2 className="site-footer-title">
              <span className="site-footer-title-primary">Sanket</span>{" "}
              <span className="site-footer-title-accent">Padhyal</span>
            </h2>
            <p className="site-footer-copy">
              Full stack developer building clean, scalable, and production-ready web experiences with strong attention to performance and detail.
            </p>
          </div>

          <div className="site-footer-side">
            <div className="site-footer-nav">
              {footerLinks.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="site-footer-link"
                  onClick={() => navigateToPath(item.path)}
                >
                  <span>{item.label}</span>
                  <ArrowUpRight size={14} strokeWidth={2.1} />
                </button>
              ))}
            </div>

            <div className="site-footer-actions">
              <button type="button" className="site-footer-action" onClick={openGithub}>
                <Github size={15} strokeWidth={2.1} />
                <span>GitHub</span>
              </button>

              <button
                type="button"
                className="site-footer-action"
                onClick={() => navigateToPath("/contact")}
              >
                <Mail size={15} strokeWidth={2.1} />
                <span>Contact</span>
              </button>

              <button
                type="button"
                className="site-footer-action silver-button"
                onClick={goAdmin}
              >
                <UserCog size={15} strokeWidth={2.1} />
                <span>Admin</span>
              </button>

              <button
                type="button"
                className="site-footer-action silver-button"
                onClick={() => navigateToPath("/about")}
              >
                <Info size={15} strokeWidth={2.1} />
                <span>About this web</span>
              </button>

              <button
                type="button"
                className="site-footer-action sparse-button"
                onClick={openSparse}
              >
                <img
                  src="https://sparse.in/assets/logo.png"
                  alt="Sparse"
                  className="site-footer-brand-icon"
                />
                <span>Sparse</span>
              </button>

              <button
                type="button"
                className="site-footer-action coffee-button yellow-button"
                onClick={() => navigateToPath("/home/coffee")}
              >
                <img src="/assets/coffee-support.png" alt="Buy me a coffee" className="coffee-icon" style={{ width: "18px", height: "18px", objectFit: "contain" }} />
                <span className="coffee-text-wrapper">
                  <span className="coffee-text-default">Buy me a coffee</span>
                  <span className="coffee-text-hover">Thanks!</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
