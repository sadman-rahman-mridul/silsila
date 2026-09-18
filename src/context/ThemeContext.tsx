import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  isDark: boolean
  toggleTheme: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sealsela_theme") as Theme
      if (saved === "light" || saved === "dark") return saved
      return "dark" // Default to dark emerald mode
    }
    return "dark"
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    const root = document.documentElement
    const isDarkMode = theme === "dark"
    const bgColor = isDarkMode ? "#071D13" : "#F6F9F7"
    const colorScheme = isDarkMode ? "dark" : "light"

    if (isDarkMode) {
      root.classList.add("dark")
      root.classList.remove("light")
    } else {
      root.classList.add("light")
      root.classList.remove("dark")
    }

    root.style.colorScheme = colorScheme
    root.style.backgroundColor = bgColor
    document.body.style.backgroundColor = bgColor
    document.body.style.colorScheme = colorScheme

    // Update all theme-color meta tags for mobile browsers (Safari / Chrome)
    const metas = document.querySelectorAll('meta[name="theme-color"]')
    metas.forEach((m) => {
      m.setAttribute("content", bgColor)
    })

    localStorage.setItem("sealsela_theme", theme)
  }, [theme])

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"))
  }

  const setTheme = (t: Theme) => {
    setThemeState(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === "dark", toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

