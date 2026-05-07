import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Cog,
  Eye,
  FileText,
  FolderGit2,
  GitBranch,
  Home,
  Link as LinkIcon,
  List,
  Pencil,
  Pin,
  Search,
  Star,
  Tag,
  Upload,
  Users,
  Waypoints
} from "lucide-react"
import "./RepoPage.css"

const projectRepos = {
  sparse: {
    slug: "sparse",
    name: "Sparse",
    visibility: "Public",
    owner: "sanketpadhyal",
    branch: "main",
    branches: 1,
    tagsCount: 0,
    commitHash: "c3dabc7",
    latestCommitLabel: "Update README.md",
    latestCommitTime: "2 weeks ago",
    commitCount: 17,
    watchers: 0,
    forks: 0,
    stars: 2,
    title: "SPARSE",
    domainLabel: "sparse.in",
    website: "https://sparse.in",
    description:
      "A minimal social media platform focused on distraction-free interaction with basic posts, stories, chat, and a simple chronological feed. No reels, no addictive algorithms.",
    tags: [
      "website",
      "social-media",
      "social-network",
      "users",
      "friends",
      "web-application",
      "coding",
      "chat-application",
      "chatting-app"
    ],
    highlights: [
      "Mobile-first design",
      "Performance-focused architecture",
      "Real-time interactions"
    ],
    files: [
      { name: "README.md", description: "Update README.md", updatedAt: "2 weeks ago" },
      { name: "logo.png", description: "Add files via upload", updatedAt: "last month" }
    ],
    sections: [
      {
        type: "hero",
        intro: [
          "Status: Stable Production Version",
          "Sparse is now running smoothly with optimized performance and core systems fully stable.",
          "Continuous improvements and new features are actively in development."
        ],
        paragraphs: [
          "Sparse is a modern real-time social platform built for fast communication, social discovery, and a seamless mobile experience.",
          "It combines messaging, stories, posts, discovery systems, and AI into a lightweight and highly optimized web application."
        ],
        bullets: [
          "Mobile-first design",
          "Performance-focused architecture",
          "Real-time interactions"
        ]
      },
      {
        heading: "Live Website",
        paragraphs: ["Visit the platform: https://www.sparse.in", "Connect with me: @sanket"]
      },
      {
        heading: "Activity & Engagement System",
        paragraphs: [
          "Sparse includes a real-time activity tracking system that keeps users updated with everything happening around them."
        ],
        subheading: "Features",
        bullets: [
          "Login activity tracking",
          "Followers updates",
          "Following activity",
          "Post updates feed",
          "Likes and comments tracking"
        ],
        secondaryHeading: "Highlights",
        secondaryBullets: ["Real-time sync", "Instant updates", "Optimized loading"]
      },
      {
        heading: "Notifications System",
        paragraphs: ["A smart real-time notification system for chats, stories, posts, and profile updates."],
        bullets: [
          "Chats: messages, replies, reactions",
          "Stories: interactions and replies",
          "Posts: likes and comments",
          "Profile updates"
        ],
        secondaryHeading: "Security Layer",
        secondaryParagraphs: [
          "Notifications work only on the last logged-in device, ensuring safer account monitoring, reduced suspicious activity, and a controlled notification flow."
        ]
      },
      {
        heading: "Account System",
        paragraphs: ["Complete authentication and user control system."],
        bullets: [
          "Secure login and signup",
          "Username-based identity",
          "Profile editing",
          "Password management",
          "Account deletion"
        ],
        secondaryHeading: "Deletion Includes",
        secondaryBullets: ["Profile data", "Posts", "Stories", "Likes and comments", "Followers"]
      },
      {
        heading: "User Profiles",
        paragraphs: ["Each profile includes a complete identity layer and relationship metadata."],
        bullets: [
          "Profile photo",
          "Username and name",
          "Bio and status",
          "Gender and birthday",
          "Followers and following"
        ],
        secondaryHeading: "Roles",
        secondaryBullets: ["Owner", "Friend", "Pookie", "Verified"]
      },
      {
        heading: "Role Security System",
        badge: "NEW",
        paragraphs: ["Sparse now includes a highly secure role management system."],
        bullets: [
          "Users cannot assign roles themselves",
          "No API or console injection possible",
          "No one can become owner via frontend",
          "Owners are fully protected and immutable"
        ],
        secondaryHeading: "Owner Permissions",
        secondaryBullets: [
          "Can assign roles: friend, pookie, verified",
          "Can remove roles",
          "Cannot create new owners",
          "Cannot modify existing owners"
        ],
        note: "Protected at database level using Firestore rules."
      },
      {
        heading: "Posts System",
        bullets: [
          "Create posts",
          "Like posts",
          "Comment",
          "View interactions",
          "Open detailed post view"
        ],
        paragraphs: ["Fully real-time and optimized."]
      },
      {
        heading: "Real-Time Chat",
        bullets: [
          "Instant messaging",
          "Reply system",
          "Reactions",
          "Typing indicators",
          "Seen and delivered status",
          "Chat deletion"
        ]
      },
      {
        heading: "Chat Media",
        bullets: ["Image sharing", "Lazy loading", "Skeleton loaders", "Optimized rendering"]
      },
      {
        heading: "Social System",
        bullets: ["Follow and unfollow", "Mutual detection", "Profile discovery", "Public profiles"]
      },
      {
        heading: "Story System",
        bullets: [
          "24-hour stories",
          "Story viewer",
          "Image stories",
          "Firebase storage",
          "Story ring UI"
        ],
        secondaryHeading: "New Updates",
        secondaryBullets: [
          "Short video support up to 30 seconds",
          "Story templates fixed",
          "Faster loading and smooth playback"
        ]
      },
      {
        heading: "Owner Panel",
        badge: "NEW",
        paragraphs: ["A dedicated Owner Control Panel adds secure platform control."],
        bullets: [
          "Search any user",
          "Assign and remove roles",
          "View users by roles",
          "Protected actions with no owner creation"
        ]
      },
      {
        heading: "Discovery",
        bullets: ["Fast username search", "Mutual suggestions", "Relationship-based discovery"]
      },
      {
        heading: "AI Assistant",
        paragraphs: ["Odoy AI is integrated inside chat for natural conversation and fast responses."],
        bullets: ["Natural conversation", "Fast responses", "Google Cloud backend"]
      },
      {
        heading: "Meme Feed",
        bullets: [
          "Infinite scroll",
          "Safe filtering",
          "Duplicate prevention",
          "Interaction tracking",
          "Double-tap like"
        ]
      },
      {
        heading: "Daily Usage Limit",
        bullets: [
          "Meme usage capped at 1 hour per day",
          "Auto reset system",
          "Performance protection"
        ]
      },
      {
        heading: "Theme System",
        badge: "NEW",
        bullets: [
          "Full dark and light mode support",
          "Auto-sync with device theme",
          "Smooth UI transitions"
        ]
      },
      {
        heading: "Performance Optimization",
        groups: [
          {
            title: "Database",
            items: ["Pagination", "Query limits", "Reduced redundancy"]
          },
          {
            title: "UI",
            items: ["Lazy loading", "Skeleton states", "Smooth scrolling"]
          },
          {
            title: "Caching",
            items: ["Session storage", "Local storage", "Memory cache"]
          }
        ]
      },
      {
        heading: "Tech Stack",
        groups: [
          {
            title: "Frontend",
            items: ["React", "React Router", "Custom CSS", "React Icons"]
          },
          {
            title: "Backend",
            items: ["Supabase (Realtime)", "Firebase"]
          },
          {
            title: "Database",
            items: ["PostgreSQL", "Firestore"]
          },
          {
            title: "AI",
            items: ["Odoy AI (Google Cloud)"]
          }
        ]
      },
      {
        heading: "Architecture",
        paragraphs: ["Hybrid system."],
        groups: [
          {
            title: "Supabase",
            items: ["Chat system", "Realtime updates"]
          },
          {
            title: "Firebase",
            items: ["Users", "Posts", "Stories", "Authentication"]
          }
        ]
      },
      {
        heading: "Open Source",
        paragraphs: ["Sparse will be open sourced in the future."]
      },
      {
        heading: "Developers",
        people: [
          {
            name: "Sanket Padhyal",
            details: ["GitHub: @sanketpadhyal", "Sparse: @sanket"]
          },
          {
            name: "Bhavesh Patil",
            details: ["GitHub: @bhaveshpatil4251-wq", "Sparse: @kaii"]
          }
        ]
      },
      {
        heading: "Release Updates",
        paragraphs: [
          "Sparse started as a simple idea and quickly evolved into a fully working real-time social platform."
        ],
        timeline: [
          {
            date: "6 March 2026",
            items: ["Sparse repository created"]
          },
          {
            date: "13 March 2026",
            items: ["First prototype launched"]
          },
          {
            date: "14 March 2026",
            items: ["Initial public release", "Gained first 40+ users"]
          },
          {
            date: "16 March 2026",
            items: ["Major bug fixes and feature improvements", "Core system stabilized"]
          },
          {
            date: "18 March 2026",
            items: ["Sparse Stable Version released"]
          },
          {
            date: "24 March 2026",
            items: [
              "Notifications bug fixed",
              "Stories support short videos up to 30 seconds",
              "Story templates fixed",
              "Full light and dark theme system added",
              "Owner Panel system introduced",
              "Role security system implemented"
            ]
          },
          {
            date: "25 March 2026",
            items: [
              "Added Odoy AI caption generator in post creation",
              "Integrated AI bio generator in Edit Profile",
              "Introduced Stories Archive for expired stories",
              "Performance improvements and minor bug fixes"
            ]
          },
          {
            date: "26 March 2026",
            items: [
              "Fixed chatroom bugs and improved message stability",
              "Chats page became dynamic with live typing indicators and unread counts",
              "Profile page skeleton loading bug fixed",
              "Edit profile optimized for faster saving",
              "Follow system improved from around 8 seconds to around 1 second"
            ]
          }
        ]
      },
      {
        heading: "Current State",
        bullets: ["Almost bug-free", "Actively used by real users", "Production-ready", "Secured at database level"]
      },
      {
        heading: "What’s Next",
        bullets: [
          "Deeper performance optimizations",
          "Smarter AI interactions",
          "Analytics dashboard",
          "Advanced moderation tools"
        ],
        paragraphs: [
          "We are building Sparse step-by-step, from a small idea to a powerful real-time social ecosystem.",
          "More updates coming soon."
        ]
      },
      {
        heading: "Project Info",
        paragraphs: ["Created: 2026"]
      }
    ]
  }
}

function RepoMark() {
  return (
    <div className="repo-mark" aria-hidden="true">
      <div className="repo-mark-ring" />
      <div className="repo-mark-cut" />
    </div>
  )
}

function RepoFileRow({ file }) {
  return (
    <div className="repo-file-row">
      <div className="repo-file-main">
        <FileText size={15} strokeWidth={2} />
        <span>{file.name}</span>
      </div>
      <div className="repo-file-message">{file.description}</div>
      <div className="repo-file-time">{file.updatedAt}</div>
    </div>
  )
}

function ReadmeSection({ section }) {
  if (section.type === "hero") {
    return (
      <section className="repo-readme-section repo-readme-hero">
        <h1>{sectionTitleCase(section.title || "SPARSE")}</h1>
        <div className="repo-readme-logo-wrap">
          <RepoMark />
        </div>
        <div className="repo-divider" />

        <div className="repo-status-note">
          {section.intro.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        <div className="repo-divider" />

        {section.paragraphs?.map((paragraph) => (
          <p key={paragraph} className="repo-lead-paragraph">
            {paragraph}
          </p>
        ))}

        {!!section.bullets?.length && (
          <ul className="repo-emoji-list">
            {section.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </section>
    )
  }

  return (
    <section className="repo-readme-section">
      <div className="repo-heading-row">
        <h2>{section.heading}</h2>
        {section.badge ? <span className="repo-inline-badge">{section.badge}</span> : null}
      </div>

      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}

      {section.subheading ? <h3>{section.subheading}</h3> : null}

      {!!section.bullets?.length && (
        <ul>
          {section.bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}

      {section.secondaryHeading ? <h3>{section.secondaryHeading}</h3> : null}

      {section.secondaryParagraphs?.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}

      {!!section.secondaryBullets?.length && (
        <ul>
          {section.secondaryBullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}

      {!!section.groups?.length && (
        <div className="repo-groups">
          {section.groups.map((group) => (
            <div className="repo-group" key={group.title}>
              <h3>{group.title}</h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {!!section.people?.length && (
        <div className="repo-people">
          {section.people.map((person) => (
            <div key={person.name} className="repo-person-card">
              <h3>{person.name}</h3>
              {person.details.map((detail) => (
                <p key={detail}>{detail}</p>
              ))}
            </div>
          ))}
        </div>
      )}

      {!!section.timeline?.length && (
        <div className="repo-timeline">
          {section.timeline.map((entry) => (
            <div className="repo-timeline-item" key={entry.date}>
              <div className="repo-timeline-date">{entry.date}</div>
              <ol>
                {entry.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}

      {section.note ? <blockquote>{section.note}</blockquote> : null}
    </section>
  )
}

function sectionTitleCase(value) {
  return value
}

export default function RepoPage() {
  const params = new URLSearchParams(window.location.search)
  const slug = params.get("project") || "sparse"
  const project = projectRepos[slug] || projectRepos.sparse

  return (
    <main className="repo-page">
      <div className="repo-shell">
        <nav className="page-breadcrumb" aria-label="Breadcrumb" style={{ marginBottom: "20px" }}>
          <a href="/" className="page-breadcrumb-link" title="Home">
            <Home size={14} strokeWidth={2} />
            <span>Home</span>
          </a>
          <ChevronRight size={14} className="page-breadcrumb-separator" strokeWidth={2} />
          <a href="/projects" className="page-breadcrumb-link">
            Projects
          </a>
          <ChevronRight size={14} className="page-breadcrumb-separator" strokeWidth={2} />
          <span className="page-breadcrumb-current" aria-current="page">
            {project.name}
          </span>
        </nav>
        <header className="repo-topbar">
          <div className="repo-title-wrap">
            <div className="repo-title-main">
              <RepoMark />
              <div className="repo-title-text">
                <span>{project.name}</span>
                <span className="repo-public-badge">{project.visibility}</span>
              </div>
            </div>
          </div>

          <div className="repo-actions">
            <button type="button" className="repo-ghost-button">
              <Pin size={14} strokeWidth={2} />
              <span>Unpin</span>
            </button>
            <button type="button" className="repo-ghost-button">
              <Eye size={14} strokeWidth={2} />
              <span>Watch</span>
              <strong>{project.watchers}</strong>
              <ChevronDown size={13} strokeWidth={2} />
            </button>
            <button type="button" className="repo-ghost-button">
              <Waypoints size={14} strokeWidth={2} />
              <span>Fork</span>
              <strong>{project.forks}</strong>
              <ChevronDown size={13} strokeWidth={2} />
            </button>
            <button type="button" className="repo-ghost-button repo-star-button">
              <Star size={14} strokeWidth={2} />
              <span>Starred</span>
              <strong>{project.stars}</strong>
              <ChevronDown size={13} strokeWidth={2} />
            </button>
          </div>
        </header>

        <div className="repo-content">
          <section className="repo-main-column">
            <div className="repo-toolbar">
              <div className="repo-toolbar-left">
                <button type="button" className="repo-toolbar-select">
                  <GitBranch size={14} strokeWidth={2} />
                  <span>{project.branch}</span>
                  <ChevronDown size={13} strokeWidth={2} />
                </button>

                <div className="repo-counts">
                  <span>
                    <GitBranch size={13} strokeWidth={2} />
                    {project.branches} Branch
                  </span>
                  <span>
                    <Tag size={13} strokeWidth={2} />
                    {project.tagsCount} Tags
                  </span>
                </div>
              </div>

              <div className="repo-toolbar-right">
                <label className="repo-search">
                  <Search size={14} strokeWidth={2} />
                  <input type="text" value="Go to file" readOnly aria-label="Go to file" />
                  <kbd>t</kbd>
                </label>

                <button type="button" className="repo-toolbar-button">
                  <span>Add file</span>
                  <ChevronDown size={13} strokeWidth={2} />
                </button>

                <button type="button" className="repo-toolbar-icon" aria-label="Upload files">
                  <Upload size={15} strokeWidth={2} />
                </button>

                <button type="button" className="repo-code-button">
                  <FolderGit2 size={15} strokeWidth={2} />
                  <span>Code</span>
                  <ChevronDown size={13} strokeWidth={2} />
                </button>
              </div>
            </div>

            <section className="repo-files-card">
              <header className="repo-files-header">
                <div className="repo-files-owner">
                  <RepoMark />
                  <strong>{project.owner}</strong>
                  <span>{project.latestCommitLabel}</span>
                </div>

                <div className="repo-files-meta">
                  <span>{project.commitHash}</span>
                  <span>{project.latestCommitTime}</span>
                  <span>{project.commitCount} Commits</span>
                </div>
              </header>

              <div className="repo-files-list">
                {project.files.map((file) => (
                  <RepoFileRow key={file.name} file={file} />
                ))}
              </div>
            </section>

            <section className="repo-readme-card">
              <header className="repo-card-header">
                <div className="repo-card-title">
                  <BookOpen size={15} strokeWidth={2} />
                  <span>README</span>
                </div>

                <div className="repo-card-actions">
                  <button type="button" aria-label="Edit README">
                    <Pencil size={14} strokeWidth={2} />
                  </button>
                  <button type="button" aria-label="View README as list">
                    <List size={15} strokeWidth={2} />
                  </button>
                </div>
              </header>

              <div className="repo-readme-body">
                {project.sections.map((section) => (
                  <ReadmeSection
                    key={section.heading || section.type}
                    section={section.type === "hero" ? { ...section, title: project.title } : section}
                  />
                ))}
              </div>
            </section>
          </section>

          <aside className="repo-sidebar">
            <section className="repo-sidebar-card">
              <header className="repo-sidebar-title-row">
                <h2>About</h2>
                <button type="button" className="repo-sidebar-settings" aria-label="Repository settings">
                  <Cog size={15} strokeWidth={2} />
                </button>
              </header>

              <p className="repo-description">{project.description}</p>

              <a
                href={project.website}
                target="_blank"
                rel="noreferrer"
                className="repo-sidebar-link"
              >
                <LinkIcon size={15} strokeWidth={2} />
                <span>{project.domainLabel}</span>
              </a>

              <div className="repo-topic-list">
                {project.tags.map((tag) => (
                  <span key={tag} className="repo-topic-pill">
                    {tag}
                  </span>
                ))}
              </div>

              <dl className="repo-sidebar-facts">
                <div>
                  <dt>
                    <BookOpen size={15} strokeWidth={2} />
                  </dt>
                  <dd>Readme</dd>
                </div>
                <div>
                  <dt>
                    <Waypoints size={15} strokeWidth={2} />
                  </dt>
                  <dd>Activity</dd>
                </div>
                <div>
                  <dt>
                    <Star size={15} strokeWidth={2} />
                  </dt>
                  <dd>{project.stars} stars</dd>
                </div>
                <div>
                  <dt>
                    <Eye size={15} strokeWidth={2} />
                  </dt>
                  <dd>{project.watchers} watching</dd>
                </div>
                <div>
                  <dt>
                    <Users size={15} strokeWidth={2} />
                  </dt>
                  <dd>{project.forks} forks</dd>
                </div>
              </dl>
            </section>

            <section className="repo-sidebar-card">
              <h2>Releases</h2>
              <p>No releases published</p>
              <a href={project.website} target="_blank" rel="noreferrer">
                Create a new release
              </a>
            </section>

            <section className="repo-sidebar-card">
              <h2>Packages</h2>
              <p>No packages published</p>
              <a href={project.website} target="_blank" rel="noreferrer">
                Publish your first package
              </a>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}
