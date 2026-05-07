import { useCallback, useEffect, useMemo, useState } from "react"
import { RefreshCcw, Trophy, Medal, ChevronLeft, CircleHelp } from "lucide-react"
import { listPublicLeaderboardTop } from "../api-calls/apicalls"
import "./LeaderboardPage.css"

const CACHE_KEY = "public_leaderboard_top_100_v1"
const CACHE_TTL_MS = 1000 * 60 * 3

const safeParseJson = (value) => {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const getCache = () => {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(CACHE_KEY)
  if (!raw) return null

  const parsed = safeParseJson(raw)
  const fetchedAt = Number(parsed?.fetchedAt)
  const entries = Array.isArray(parsed?.entries) ? parsed.entries : []

  if (!Number.isFinite(fetchedAt) || entries.length === 0) return null

  return {
    fetchedAt,
    entries,
    isFresh: Date.now() - fetchedAt < CACHE_TTL_MS
  }
}

const setCache = (entries) => {
  if (typeof window === "undefined") return
  localStorage.setItem(CACHE_KEY, JSON.stringify({
    fetchedAt: Date.now(),
    entries
  }))
}

const formatAmount = (amount, currency = "INR") => {
  const numericAmount = typeof amount === "number" ? amount : Number(amount)
  const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(safeAmount)
  } catch {
    return `${safeAmount} ${currency}`
  }
}

const getRankBadge = (rank) => {
  if (rank === 1) return "gold"
  if (rank === 2) return "silver"
  if (rank === 3) return "bronze"
  return "default"
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [lastSyncAt, setLastSyncAt] = useState(0)

  const loadLeaderboard = useCallback(async ({ force = false } = {}) => {
    if (!force) {
      const cache = getCache()
      if (cache?.isFresh) {
        setLeaderboard(cache.entries)
        setLastSyncAt(cache.fetchedAt)
        return
      }
      if (cache && cache.entries.length > 0) {
        setLeaderboard(cache.entries)
        setLastSyncAt(cache.fetchedAt)
      }
    }

    setLoading(true)
    setError("")
    try {
      const response = await listPublicLeaderboardTop({ limit: 100, query: "" })
      if (!response.ok) {
        throw new Error(response.data?.error || "Failed to load leaderboard")
      }
      const entries = Array.isArray(response.data?.leaderboard) ? response.data.leaderboard : []
      setLeaderboard(entries)
      setLastSyncAt(Date.now())
      setCache(entries)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load leaderboard")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLeaderboard()
  }, [loadLeaderboard])

  const topThree = useMemo(() => leaderboard.slice(0, 3), [leaderboard])
  const rest = useMemo(() => leaderboard.slice(3), [leaderboard])
  const handleBack = () => {
    if (typeof window === "undefined") return
    if (window.history.length > 1) {
      window.history.back()
      return
    }
    window.history.pushState({}, "", "/")
    try {
      window.dispatchEvent(new PopStateEvent("popstate"))
    } catch {
      window.dispatchEvent(new Event("popstate"))
    }
  }
  const handleWhatIsThis = () => {
    if (typeof window === "undefined") return

    window.dispatchEvent(new CustomEvent("sanket-ai-open", {
      detail: {
        requestId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        prompt: "Explain this leaderboard page in very easy English. Tell the user what this page shows and how to come on that leaderboard on this website."
      }
    }))
  }

  const handleSync = () => {
    void loadLeaderboard({ force: true })
  }

  return (
    <main className="leaderboard-page">
      <section className="leaderboard-shell">
        <div className="leaderboard-page-actions">
          <button
            type="button"
            className="leaderboard-back-button"
            onClick={handleBack}
            aria-label="Go back"
            title="Back"
          >
            <ChevronLeft size={20} strokeWidth={2.4} />
          </button>

          <button
            type="button"
            className="leaderboard-help-button"
            onClick={handleWhatIsThis}
          >
            <span className="leaderboard-help-icon-wrap" aria-hidden="true">
              <CircleHelp size={14} strokeWidth={2.2} />
            </span>
            <span>What is this?</span>
          </button>
        </div>

        <header className="leaderboard-head">
          <div className="leaderboard-head-copy">
            <p className="leaderboard-kicker">Community ranking</p>
            <h1 className="leaderboard-title">
              Top <span className="leaderboard-title-number">100</span> Leaderboard
            </h1>
            <p className="leaderboard-subtitle">
              Ranked by successful contribution amount. Updated regularly with verified records.
            </p>
          </div>

          <div className="leaderboard-head-actions">
            <button
              type="button"
              className="leaderboard-sync-button"
              onClick={handleSync}
              disabled={loading}
            >
              <RefreshCcw size={16} strokeWidth={2.2} className={`leaderboard-sync-icon ${loading ? "is-animating" : ""}`} />
              <span>{loading ? "Syncing..." : "Sync"}</span>
            </button>
          </div>
        </header>

        <div className="leaderboard-meta-row">
          <p className="leaderboard-count">Showing {leaderboard.length} participants</p>
          {lastSyncAt ? (
            <p className="leaderboard-updated">
              Last synced {new Date(lastSyncAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          ) : null}
        </div>

        {error ? <p className="leaderboard-error" role="alert">{error}</p> : null}

        {leaderboard.length === 0 && !loading ? (
          <p className="leaderboard-empty">No leaderboard entries available yet.</p>
        ) : null}

        {topThree.length > 0 ? (
          <section className="leaderboard-podium" aria-label="Top three participants">
            {topThree.map((entry) => (
              <article key={entry.id} className={`leaderboard-podium-card is-${getRankBadge(entry.rank)}`}>
                <div className="leaderboard-podium-rank">
                  <Medal size={16} strokeWidth={2.1} />
                  <span>#{entry.rank}</span>
                </div>
                <div className="leaderboard-podium-user">
                  {entry.profilePhotoUrl ? (
                    <img src={entry.profilePhotoUrl} alt={entry.name || "User"} className="leaderboard-avatar" loading="lazy" />
                  ) : (
                    <div className="leaderboard-avatar leaderboard-avatar-fallback" aria-hidden="true">
                      <Trophy size={15} strokeWidth={2.1} />
                    </div>
                  )}
                  <div>
                    <h2 className="leaderboard-name">{entry.name || "Unknown"}</h2>
                    <p className="leaderboard-amount">{formatAmount(entry.amount, entry.currency)}</p>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : null}

        {rest.length > 0 ? (
          <section className="leaderboard-list-section" aria-label="Leaderboard ranks 4 to 100">
            <div className="leaderboard-list">
              {rest.map((entry) => (
                <article key={entry.id} className="leaderboard-row">
                  <div className="leaderboard-row-left">
                    <span className="leaderboard-rank">#{entry.rank}</span>
                    {entry.profilePhotoUrl ? (
                      <img src={entry.profilePhotoUrl} alt={entry.name || "User"} className="leaderboard-avatar leaderboard-avatar-sm" loading="lazy" />
                    ) : (
                      <div className="leaderboard-avatar leaderboard-avatar-sm leaderboard-avatar-fallback" aria-hidden="true">
                        <Trophy size={14} strokeWidth={2.1} />
                      </div>
                    )}
                    <span className="leaderboard-row-name">{entry.name || "Unknown"}</span>
                  </div>
                  <span className="leaderboard-row-amount">{formatAmount(entry.amount, entry.currency)}</span>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  )
}
