export const THEME_STORAGE_KEY = "preferred-theme"
export const THEME_BACKGROUNDS = {
  light: "#f5f5f5",
  dark: "#0a0a0a"
}

export function getPreferredTheme() {
  if (typeof window === "undefined") {
    return "light"
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)

  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme
  }

  return "light"
}

export function applyTheme(theme) {
  if (typeof document === "undefined") {
    return
  }

  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  document.body.dataset.theme = theme
  document.body.style.colorScheme = theme

  const themeColorMeta = document.querySelector('meta[name="theme-color"]')

  if (themeColorMeta) {
    themeColorMeta.setAttribute("content", THEME_BACKGROUNDS[theme])
  }
}
