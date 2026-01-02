import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem("ea-theme") as Theme | null;
  if (saved === "light" || saved === "dark") return saved;
  // Default to light mode
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Use lazy initialization to avoid SSR issues
    if (typeof window === "undefined") return "light";
    const saved = window.localStorage.getItem("ea-theme") as Theme | null;
    if (saved === "light" || saved === "dark") {
      // Apply theme immediately on initialization
      const root = document.documentElement;
      if (saved === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
      return saved;
    }
    // Default to light mode
    const initialTheme = "light";
    // Apply theme immediately on initialization
    const root = document.documentElement;
    root.classList.remove("dark");
    return initialTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    // Tailwind uses only the 'dark' class - add it for dark mode, remove for light mode
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    // Save to localStorage
    try {
      window.localStorage.setItem("ea-theme", theme);
    } catch (e) {
      // Ignore localStorage errors (e.g., private browsing mode)
      console.warn("Failed to save theme preference:", e);
    }
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  const toggle = () => {
    console.log("Theme toggle clicked, current theme:", theme);
    setThemeState((prev) => {
      const newTheme = prev === "dark" ? "light" : "dark";
      console.log("Toggling theme from", prev, "to", newTheme);
      return newTheme;
    });
  };

  const value = useMemo(() => ({ theme, toggle, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

