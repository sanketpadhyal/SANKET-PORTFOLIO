import { useEffect, useRef, useState } from "react"
import { Check, ChevronRight, ExternalLink, GitBranch, Home, Share2 } from "lucide-react"
import "./Projects.css"

const projects = [
  {
    slug: "sparse",
    title: "Sparse",
    desc: "A minimal social media platform focused on distraction-free interaction with posts, stories, chat, and a simple chronological feed. No reels, no addictive algorithms.",
    stars: 2,
    githubUrl: "https://github.com/sanketpadhyal/Sparse"
  },
  {
    slug: "facultyone",
    title: "FacultyOne",
    desc: "A secure cloud workspace built for educators to manage and access teaching resources across devices and classrooms using one-time session tokens.",
    githubUrl: "https://github.com/sanketpadhyal/FacultyOne"
  },
  {
    slug: "odoy",
    title: "Odoy",
    desc: "A modern real-time social platform with seamless chat, friend system, and AI-powered interactions — built for speed, scale, and a clean user experience.",
    lang: "CSS",
    color: "purple",
    githubUrl: "https://github.com/sanketpadhyal/Odoy"
  },
  {
    slug: "fresshmart",
    title: "FresshMart",
    desc: "A sleek, responsive, and startup-ready e-commerce web application built with React and CSS for lightning-fast delivery and seamless shopping.",
    githubUrl: "https://github.com/sanketpadhyal/FresshMart"
  },
  {
    slug: "locateaid-v3",
    title: "LocateAID-v3",
    desc: "A modern emergency web platform providing secure access, AI assistance, and real-time blood requests for fast, reliable help.",
    githubUrl: "https://github.com/sanketpadhyal/LocateAID-v3"
  },
  {
    slug: "kiwi",
    title: "KIWI",
    desc: "A next-gen smart eCommerce platform that understands user behavior and delivers personalized product ads with dynamic pricing.",
    githubUrl: "https://github.com/sanketpadhyal/KIWI"
  }
]

function RepoIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="project-icon">
      <path
        d="M2.5 1.75A1.75 1.75 0 0 1 4.25 0h7.5A1.75 1.75 0 0 1 13.5 1.75v10.5A1.75 1.75 0 0 1 11.75 14H8.5v1.25a.75.75 0 0 1-1.28.53l-1.5-1.5A.75.75 0 0 1 5.5 13.75V14H4.25A1.75 1.75 0 0 1 2.5 12.25Zm1.75-.25a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25H5.5v-1a.75.75 0 0 1 .75-.75h5.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25Zm2.75 10.75v1.19l.56.56h.19v-1.75Z"
        fill="currentColor"
      />
    </svg>
  )
}

function PinnedIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="projects-title-icon">
      <path
        d="M2.25 12.5h11.5l-.82-6.48a.75.75 0 0 0-1.22-.47L9.5 7.38 8.53 4.8a.75.75 0 0 0-1.06-.4.75.75 0 0 0-.34.4L6.5 7.38 4.29 5.55a.75.75 0 0 0-1.22.47ZM3 14a.75.75 0 0 1 0-1.5h10a.75.75 0 0 1 0 1.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function KebabIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="project-kebab-icon">
      <path
        d="M8 2.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Zm0 4a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Zm-1.25 5.25a1.25 1.25 0 1 0 2.5 0 1.25 1.25 0 0 0-2.5 0Z"
        fill="currentColor"
      />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="project-meta-icon">
      <path
        d="M7.2 1.16a.75.75 0 0 1 1.6 0l1.43 3.56 3.83.27a.75.75 0 0 1 .43 1.33l-2.94 2.48.95 3.72a.75.75 0 0 1-1.11.82L8 11.42l-3.4 1.92a.75.75 0 0 1-1.11-.82l.95-3.72L1.5 6.32a.75.75 0 0 1 .43-1.33l3.83-.27Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Projects() {
  const [openMenuIndex, setOpenMenuIndex] = useState(null)
  const [copiedProjectIndex, setCopiedProjectIndex] = useState(null)
  const sectionRef = useRef(null)
  const copyNoticeTimeoutRef = useRef(null)

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!sectionRef.current?.contains(event.target)) {
        setOpenMenuIndex(null)
        return
      }

      if (!event.target.closest(".project-menu") && !event.target.closest(".project-action")) {
        setOpenMenuIndex(null)
      }
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpenMenuIndex(null)
      }
    }

    const handleScroll = () => {
      setOpenMenuIndex(null)
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("touchstart", handlePointerDown)
    document.addEventListener("keydown", handleEscape)
    window.addEventListener("scroll", handleScroll, true)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("touchstart", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
      window.removeEventListener("scroll", handleScroll, true)

      if (copyNoticeTimeoutRef.current) {
        window.clearTimeout(copyNoticeTimeoutRef.current)
      }
    }
  }, [])

  const showCopiedState = (index) => {
    setCopiedProjectIndex(index)

    if (copyNoticeTimeoutRef.current) {
      window.clearTimeout(copyNoticeTimeoutRef.current)
    }

    copyNoticeTimeoutRef.current = window.setTimeout(() => {
      setCopiedProjectIndex(null)
      copyNoticeTimeoutRef.current = null
    }, 2200)
  }

  const openGithub = (url) => {
    window.open(url, "_blank", "noopener,noreferrer")
    setOpenMenuIndex(null)
  }

  const toggleMenu = (index) => {
    setOpenMenuIndex((currentIndex) => (currentIndex === index ? null : index))
  }

  const shareProject = async (project, index) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${project.title} repository`,
          text: `Check out ${project.title} on GitHub`,
          url: project.githubUrl
        })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(project.githubUrl)
        showCopiedState(index)
      } else {
        const textArea = document.createElement("textarea")
        textArea.value = project.githubUrl
        textArea.setAttribute("readonly", "")
        textArea.style.position = "absolute"
        textArea.style.left = "-9999px"
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)
        showCopiedState(index)
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(project.githubUrl)
        } else {
          const textArea = document.createElement("textarea")
          textArea.value = project.githubUrl
          textArea.setAttribute("readonly", "")
          textArea.style.position = "absolute"
          textArea.style.left = "-9999px"
          document.body.appendChild(textArea)
          textArea.select()
          document.execCommand("copy")
          document.body.removeChild(textArea)
        }

        showCopiedState(index)
      }
    } finally {
      if (navigator.share) {
        setOpenMenuIndex(null)
      }
    }
  }

  return (
    <section className="projects-section" ref={sectionRef}>
      <div className="projects-shell">
        <div className="projects-header">
          <nav className="page-breadcrumb" aria-label="Breadcrumb">
            <a href="/" className="page-breadcrumb-link" title="Home">
              <Home size={14} strokeWidth={2} />
              <span>Home</span>
            </a>
            <ChevronRight size={14} className="page-breadcrumb-separator" strokeWidth={2} />
            <span className="page-breadcrumb-current" aria-current="page">
              Projects
            </span>
          </nav>
          <div className="projects-heading">
            <div className="projects-title-row">
              <PinnedIcon />
              <h2 className="projects-title">Pinned Projects</h2>
            </div>
            <p className="projects-subtitle">These are my top 5 projects imported from GitHub.</p>
          </div>
        </div>

        <div className="projects-grid">
          {projects.map((p, i) => (
            <div
              className={[
                "project-card",
                i < 1 ? "project-card-menu-down-safe" : "",
                i >= projects.length - 2 ? "project-card-menu-up" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              key={i}
            >
              <div className="project-top">
                <div className="project-headline">
                  <RepoIcon />
                  <button
                    type="button"
                    className="project-name project-name-button"
                    onClick={() => openGithub(p.githubUrl)}
                  >
                    {p.title}
                  </button>
                  <span className="project-badge">Public</span>
                </div>

                <button
                  className="project-action"
                  type="button"
                  aria-label={`Open options for ${p.title}`}
                  aria-expanded={openMenuIndex === i}
                  onClick={() => toggleMenu(i)}
                >
                  <KebabIcon />
                </button>
              </div>

              {openMenuIndex === i && (
                <div className="project-menu" role="menu" aria-label={`${p.title} actions`}>
                  <button className="project-menu-item" type="button" onClick={() => openGithub(p.githubUrl)}>
                    <GitBranch size={14} strokeWidth={2} />
                    <span>Open in GitHub</span>
                    <ExternalLink size={13} strokeWidth={2} className="project-menu-trailing" />
                  </button>
                  <button className="project-menu-item" type="button" onClick={() => shareProject(p, i)}>
                    {copiedProjectIndex === i ? (
                      <Check size={14} strokeWidth={2.4} className="project-menu-success-icon" />
                    ) : (
                      <Share2 size={14} strokeWidth={2} />
                    )}
                    <span>{copiedProjectIndex === i ? "Copied" : "Share"}</span>
                  </button>
                </div>
              )}

              <p className="project-desc">{p.desc}</p>

              <div className="project-footer">
                {p.stars && (
                  <span className="project-star">
                    <StarIcon />
                    {p.stars}
                  </span>
                )}
                {p.lang && (
                  <span className="project-lang">
                    <span className="dot" style={{ background: p.color || "#888" }} />
                    {p.lang}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
