import { BriefcaseBusiness, GraduationCap, ChevronRight, Home } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import "./EducationExperience.css"

const educationTimeline = [
  {
    phase: "10th - SSC",
    place: "RC Patel English Medium School",
    meta: "Score 90.80%",
    status: "Completed",
    points: [
      "Built strong school foundations with a natural interest in science and problem solving.",
      "Developed early curiosity for computers and new technology.",
      "Started experimenting with simple HTML and CSS projects for fun."
    ]
  },
  {
    phase: "12th - HSC",
    place: "Swami Vivekanand High School, Dahivad",
    meta: "Score 78.67% | PCMB",
    status: "Completed",
    points: [
      "Balanced academics while exploring coding outside the classroom.",
      "Built small personal web projects to strengthen fundamentals through practice.",
      "Used the period after 12th to move more seriously into web development."
    ]
  },
  {
    phase: "B.Tech - Computer Science",
    place: "SVKM College of Engineering, Shirpur-Dahivad",
    meta: "Currently in 1st Year",
    status: "In Progress",
    points: [
      "Continuing to strengthen full stack skills alongside academics.",
      "Actively building personal projects to improve execution and product thinking.",
      "Learning modern frameworks, tooling, and practical engineering workflows."
    ]
  }
]

const experienceTimeline = [
  {
    phase: "Web Development Journey",
    place: "Self-Learning & Online Platforms",
    meta: "Started after 12th exams",
    status: "Started",
    points: [
      "Built a focused self-learning path around modern web development.",
      "Developed strong foundations in HTML, CSS, JavaScript, React.js, and Node.js.",
      "Completed many small to mid-size projects to sharpen frontend and backend skills."
    ]
  },
  {
    phase: "Freelance & Team Work",
    place: "Upwork & Friends' Projects",
    meta: "Collaboration experience",
    status: "Growing",
    points: [
      "Helped friends on small team projects and gained collaborative development experience.",
      "Completed Upwork tasks including frontend fixes and implementation support.",
      "Built practical backend exposure through server setup and deployment-related work."
    ]
  },
  {
    phase: "Personal Projects",
    place: "GitHub Portfolio",
    meta: "Ongoing showcase",
    status: "Active",
    points: [
      "Maintains a portfolio of web-development work, experiments, and product ideas.",
      "Continuously adds new projects while improving quality, performance, and tooling.",
      "Builds with React, Node.js, and AI-assisted workflows while seeking internships."
    ]
  }
]

const timelineSections = [
  {
    key: "education",
    icon: GraduationCap,
    kicker: "Education",
    title: "Academic Timeline",
    intro: "A focused learning path from school fundamentals to active computer science study.",
    items: educationTimeline
  },
  {
    key: "experience",
    icon: BriefcaseBusiness,
    kicker: "Experience",
    title: "Practical Timeline",
    intro: "Real growth shaped by self-learning, projects, freelance work, and team collaboration.",
    items: experienceTimeline
  }
]

function TimelineSection({ icon: Icon, kicker, title, intro, items }) {
  return (
    <section className="edu-exp-block" aria-labelledby={`edu-exp-${kicker.toLowerCase()}`}>
      <div className="edu-exp-block-head">
        <span className="edu-exp-chip">
          <Icon size={14} strokeWidth={2.1} />
          <span>{kicker}</span>
        </span>
        <h3 className={`edu-exp-block-title ${kicker.toLowerCase()}`} id={`edu-exp-${kicker.toLowerCase()}`}>{title}</h3>
        <p className="edu-exp-block-copy">{intro}</p>
      </div>

      <div className="edu-exp-track" role="list" aria-label={title}>
        {items.map((item, index) => (
          <article
            key={`${kicker}-${item.phase}`}
            className="edu-exp-step"
            role="listitem"
            style={{ transitionDelay: `${index * 90}ms` }}
          >
            <div className="edu-exp-step-line" aria-hidden="true">
              <span className="edu-exp-step-dot" />
            </div>

            <div className="edu-exp-step-card">
              <div className="edu-exp-step-top">
                <span className="edu-exp-step-status">{item.status}</span>
                <span className="edu-exp-step-meta">{item.meta}</span>
              </div>

              <h4 className="edu-exp-step-title">{item.phase}</h4>
              <p className="edu-exp-step-place">{item.place}</p>

              <ul className="edu-exp-points">
                {item.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default function EducationExperience() {
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
        threshold: 0.08,
        rootMargin: "0px 0px -6% 0px"
      }
    )

    observer.observe(section)

    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className={`edu-exp-page${isVisible ? " visible" : ""}`}
      aria-labelledby="education-experience-title"
    >
      <div className="edu-exp-wrap">
        <header className="edu-exp-header">
          <nav className="page-breadcrumb" aria-label="Breadcrumb">
            <a href="/" className="page-breadcrumb-link" title="Home">
              <Home size={14} strokeWidth={2} />
              <span>Home</span>
            </a>
            <ChevronRight size={14} className="page-breadcrumb-separator" strokeWidth={2} />
            <span className="page-breadcrumb-current" aria-current="page">
              Experience
            </span>
          </nav>

          <h2 className="edu-exp-title" id="education-experience-title">
            Education and <span className="edu-exp-title-accent">Experience</span>
          </h2>

          <p className="edu-exp-copy">
            School milestones, self-learning, freelance work, and hands-on projects presented in a tighter roadmap built for both desktop and mobile.
          </p>
        </header>

        <div className="edu-exp-layout">
          {timelineSections.map((section) => (
            <TimelineSection key={section.key} {...section} />
          ))}
        </div>
      </div>
    </section>
  )
}
