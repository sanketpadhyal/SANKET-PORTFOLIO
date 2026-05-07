import { useEffect, useRef, useState } from "react"
import { BrainCircuit, Home, ChevronRight } from "lucide-react"
import "./TechnicalSkills.css"

const skillGroups = [
  {
    title: (
      <>
        Front<span className="skills-group-title-accent">end</span>
      </>
    ),
    key: "frontend",
    items: [
      { label: "HTML", logo: "https://cdn.simpleicons.org/html5/E34F26" },
      { label: "CSS", logo: "https://cdn.simpleicons.org/css/1572B6" },
      { label: "JavaScript", logo: "https://cdn.simpleicons.org/javascript/F7DF1E" },
      { label: "TypeScript", logo: "https://cdn.simpleicons.org/typescript/3178C6" },
      { label: "Tailwind CSS", logo: "https://cdn.simpleicons.org/tailwindcss/06B6D4" },
      { label: "React", logo: "https://cdn.simpleicons.org/react/61DAFB" },
    ]
  },
  {
    title: (
      <>
        Back<span className="skills-group-title-accent">end</span>
      </>
    ),
    key: "backend",
    items: [
      { label: "Node.js", logo: "https://cdn.simpleicons.org/nodedotjs/5FA04E" },
      { label: "Express.js", logo: "https://cdn.simpleicons.org/express/111111" },
      { label: "MongoDB", logo: "https://cdn.simpleicons.org/mongodb/47A248" },
      { label: "Python", logo: "/assets/python-icon.png" },
      { label: "Firebase", logo: "https://cdn.iconscout.com/icon/free/png-256/free-firebase-icon-svg-download-png-14550507.png" },
      { label: "Google Cloud", logo: "/assets/google-cloud-icon.png" },
    ]
  },
  {
    title: (
      <>
        Tools & <span className="skills-group-title-accent">Platforms</span>
      </>
    ),
    key: "tools-platforms",
    items: [
      { label: "GitHub", logo: "https://cdn.simpleicons.org/github/181717" },
      { label: "Render", logo: "https://cdn.simpleicons.org/render/000000" },
      { label: "Replit", logo: "https://cdn.simpleicons.org/replit/F26207" },
      { label: "Netlify", logo: "https://cdn.simpleicons.org/netlify/00C7B7" },
      { label: "Vercel", logo: "https://cdn.simpleicons.org/vercel/000000" },
      { label: "VS Code", logo: "/assets/vscode-icon.png" },
      { label: "Canva", logo: "https://brandlogovector.com/wp-content/uploads/2022/02/Canva-Icon-Logo.png" },
      { label: "Postman", logo: "https://cdn.simpleicons.org/postman/FF6C37" }
    ]
  },
  {
    title: "AI",
    key: "ai",
    items: [
      { label: "LLM", icon: BrainCircuit },
      { label: "Codex", logo: "/assets/codex-icon.webp" },
      { label: "Cursor", logo: "/assets/logo2.png" },
      { label: "Ollama", logo: "https://raw.githubusercontent.com/ollama/ollama/main/docs/ollama-logo.svg" },
      { label: "Gemini", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Google%20Gemini%20icon%202025.svg" },
      { label: "OpenAI", logo: "https://cdn.worldvectorlogo.com/logos/openai-2.svg" },
      { label: "Copilot", logo: "https://cdn.simpleicons.org/githubcopilot/000000" },
      { label: "Claude", logo: "https://cdn.worldvectorlogo.com/logos/claude-logo.svg" },
      { label: "Hugging Face", logo: "https://cdn.worldvectorlogo.com/logos/huggingface-2.svg" }
    ]
  }
]

function SkillLogo({ item }) {
  if (item.customLogo) {
    const CustomLogo = item.customLogo

    return <CustomLogo />
  }

  if (item.logo) {
    return (
      <img
        className="skills-item-logo"
        src={item.logo}
        alt={`${item.label} logo`}
        loading="lazy"
        decoding="async"
      />
    )
  }

  const Icon = item.icon

  return <Icon className="skills-item-icon" size={18} strokeWidth={2.1} />
}

function getSkillSlug(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export default function TechnicalSkills({ standalone = false }) {
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
        threshold: 0.22,
        rootMargin: "0px 0px -10% 0px"
      }
    )

    observer.observe(section)

    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className={`skills-section${standalone ? " skills-section-standalone" : ""}${isVisible ? " skills-section-visible" : ""}`}
      aria-labelledby="skills-title"
    >
      <div className="skills-shell">
        {standalone && (
          <nav className="page-breadcrumb" aria-label="Breadcrumb">
            <a href="/" className="page-breadcrumb-link" title="Home">
              <Home size={14} strokeWidth={2} />
              <span>Home</span>
            </a>
            <ChevronRight size={14} className="page-breadcrumb-separator" strokeWidth={2} />
            <span className="page-breadcrumb-current" aria-current="page">
              Skills
            </span>
          </nav>
        )}

        <div className="skills-heading">
          <span className="skills-kicker">Stack</span>
          <h2 className="skills-title" id="skills-title">
            Technical <span className="skills-title-accent">Skills</span>
          </h2>
        </div>

        <div className="skills-groups">
          {skillGroups.map((group, index) => (
            <article
              className="skills-group"
              key={group.key ?? String(group.title)}
              style={{ transitionDelay: `${index * 110}ms` }}
            >
              <div className="skills-group-head">
                <h3 className="skills-group-title">{group.title}</h3>
              </div>

              <div className="skills-items">
                {group.items.map((item) => (
                  <div
                    className={`skills-item skills-item-${getSkillSlug(item.label)}`}
                    key={item.label}
                  >
                    <span className={`skills-item-mark skills-item-mark-${getSkillSlug(item.label)}`}>
                      <SkillLogo item={item} />
                    </span>
                    <span className="skills-item-label">{item.label}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
