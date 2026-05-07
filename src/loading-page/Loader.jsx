import { useEffect, useState } from "react"
import { File, Scissors } from "lucide-react"
import "./Loader.css"
import { applyTheme, getPreferredTheme } from "../theme"

const FileScissorIcon = ({ size = 16 }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
    <File size={Math.max(12, size - 1)} />
    <Scissors size={Math.max(11, size - 2)} />
  </span>
)

const preloadImage = (src) =>
  new Promise((resolve) => {
    const image = new Image()

    const done = () => {
      image.onload = null
      image.onerror = null
      resolve()
    }

    image.onload = done
    image.onerror = done
    image.src = src

    if (image.complete) {
      done()
    }
  })

export default function Loader({ assets = [], onComplete }){
  const [theme, setTheme] = useState(() => getPreferredTheme())
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const currentTheme = getPreferredTheme()

    setTheme(currentTheme)
    applyTheme(currentTheme)
    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"

    let value = 0
    let assetsReady = false
    let completed = false
    let finishTimeout

    const completeLoader = () => {
      if (completed) {
        return
      }

      completed = true
      value = 100
      setProgress(100)
      finishTimeout = window.setTimeout(() => {
        onComplete?.()
      }, 220)
    }

    const maybeComplete = () => {
      if (assetsReady && value >= 100) {
        completeLoader()
      }
    }

    const interval = setInterval(() => {
      if (completed) {
        return
      }

      if (!assetsReady) {
        value = Math.min(value + Math.random() * 10, 94)
      } else {
        value = Math.min(value + 8, 100)
      }

      setProgress(value)
      maybeComplete()
    }, assetsReady ? 80 : 100)

    Promise.allSettled(assets.map(preloadImage)).then(() => {
      assetsReady = true

      if (value < 94) {
        value = 94
        setProgress(94)
      }

      maybeComplete()
    })

    return () => {
      clearInterval(interval)
      window.clearTimeout(finishTimeout)
      document.documentElement.style.overflow = ""
      document.body.style.overflow = ""
    }
  }, [assets, onComplete])

  return (
    <div className={`loader ${theme}`}>
      <img src="/assets/sanket.webp" alt="logo" />

      <div className="loader-name">
        <span>Sanket</span>
        <span className="last">Padhyal</span>
      </div>

      <div className="loader-sub">
        <FileScissorIcon size={14} />
        <span>Portfolio</span>
      </div>

      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <span className="percent">{Math.floor(progress)}%</span>
    </div>
  )
}
