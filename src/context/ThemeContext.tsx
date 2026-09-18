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
    if (theme === "dark") {
      root.classList.add("dark")
      root.classList.remove("light")
      document.body.style.backgroundColor = ""
      document.body.style.background = ""
      document.body.style.color = ""
    } else {
      root.classList.add("light")
      root.classList.remove("dark")
      document.body.style.backgroundColor = "#F6F9F7"
      document.body.style.background = "#F6F9F7"
      document.body.style.color = "#0F172A"
    }

    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute("content", theme === "dark" ? "#071D13" : "#F6F9F7")
    }

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

