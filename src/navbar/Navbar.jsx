import "./Navbar.css"
import { BadgeCheck, BriefcaseBusiness, House, Mail, Moon, Scissors, SunMedium } from "lucide-react"
import { useEffect, useState } from "react"
import { applyTheme, getPreferredTheme, THEME_STORAGE_KEY } from "../theme"

const navItems = [
  { label: "Home", icon: House, path: "/home" },
  { label: "Projects", icon: Scissors, path: "/projects" },
  { label: "Skills", icon: BadgeCheck, path: "/techskills" },
  { label: "Experience", icon: BriefcaseBusiness, path: "/experience" }
]

export default function Navbar() {
  const [theme, setTheme] = useState(() => getPreferredTheme())
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    applyTheme(theme)
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  const handleThemeToggle = () => {
    const nextTheme = theme === "light" ? "dark" : "light"
    setTheme(nextTheme)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const navigateToPath = (path) => {
    closeMobileMenu()

    if (!path) {
      return
    }

    if (path === "/home") {
      window.location.href = "https://sanketpadhyal.world/home"
      return
    }

    if (window.location.pathname === path) {
      if (path === "/") {
        window.scrollTo({ top: 0, behavior: "smooth" })
      }

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

  const handleLogoClick = () => {
    navigateToPath("/")
  }

  return (
    <>
      <div
        className={`mobile-menu-backdrop ${isMobileMenuOpen ? "active" : ""}`}
        aria-hidden="true"
        onClick={closeMobileMenu}
      />

      <div className={`nav-wrapper ${isMobileMenuOpen ? "mobile-open" : ""}`}>
        <nav className="navbar">

          <button type="button" className="logo" onClick={handleLogoClick} aria-label="Go to home">
            <img src="/assets/sanket.webp" alt="logo" />
            <span className="logo-text">
              <span className="logo-name">
                <span className="logo-first">Sanket</span>
                <span className="logo-last">Padhyal</span>
              </span>
              <span className="logo-email">Full Stack Developer</span>
            </span>
          </button>

          <ul className="nav-links">
            {navItems.map(({ label, icon: Icon, path }) => (
              <li key={label}>
                <button
                  type="button"
                  className="nav-link-btn"
                  onClick={() => navigateToPath(path)}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              </li>
            ))}
            <li className="theme-toggle-item">
              <button
                type="button"
                className="theme-toggle"
                aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
                onClick={handleThemeToggle}
              >
                <span className={`theme-icon sun ${theme === "light" ? "active" : ""}`}>
                  <SunMedium size={15} />
                </span>
                <span className={`theme-icon moon ${theme === "dark" ? "active" : ""}`}>
                  <Moon size={15} />
                </span>
              </button>
            </li>
          </ul>

          <div className="nav-actions">
            <button
              type="button"
              className="theme-toggle mobile-theme-toggle"
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              onClick={handleThemeToggle}
            >
              <span className={`theme-icon sun ${theme === "light" ? "active" : ""}`}>
                <SunMedium size={15} />
              </span>
              <span className={`theme-icon moon ${theme === "dark" ? "active" : ""}`}>
                <Moon size={15} />
              </span>
            </button>

            <button
              type="button"
              className={`mobile-menu-toggle ${isMobileMenuOpen ? "active" : ""}`}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((open) => !open)}
            >
              <span className="mobile-menu-lines">
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>

          <button type="button" className="cta" onClick={() => navigateToPath("/contact")}>
            <span className="text top">
              <span className="text-content">
                <span>Contact</span>
                <Mail size={14} strokeWidth={2.1} />
              </span>
            </span>
            <span className="text bottom">
              <span className="text-content">
                <span>Contact</span>
                <Mail size={14} strokeWidth={2.1} />
              </span>
            </span>
          </button>

        </nav>

        <div className={`mobile-menu ${isMobileMenuOpen ? "open" : ""}`}>
          <ul className="mobile-nav-links">
            {navItems.map(({ label, icon: Icon, path }) => (
              <li key={label}>
                <button
                  type="button"
                  className="mobile-link"
                  onClick={() => navigateToPath(path)}
                >
                  <span className="mobile-link-icon">
                    <Icon size={17} />
                  </span>
                  <span>{label}</span>
                </button>
              </li>
            ))}
          </ul>

          <button
            className="mobile-cta"
            type="button"
            onClick={() => navigateToPath("/contact")}
          >
            <span className="text top">
              <span className="text-content">
                <span>Contact</span>
                <Mail size={14} strokeWidth={2.1} />
              </span>
            </span>
            <span className="text bottom">
              <span className="text-content">
                <span>Contact</span>
                <Mail size={14} strokeWidth={2.1} />
              </span>
            </span>
          </button>
        </div>
      </div>
    </>
  )
}
