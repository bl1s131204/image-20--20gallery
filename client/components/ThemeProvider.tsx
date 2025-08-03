import React, { createContext, useContext, useEffect, useState } from "react";
import { Theme, applyTheme } from "@/lib/tagEngine";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: { value: Theme; label: string; icon: string }[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme");
    return (stored as Theme) || "light";
  });

  const themes = [
    { value: "light" as Theme, label: "Light", icon: "☀️" },
    { value: "dark" as Theme, label: "Dark", icon: "🌙" },
    { value: "gold" as Theme, label: "Gold", icon: "✨" },
    { value: "neon" as Theme, label: "Neon", icon: "💚" },
    { value: "cyberpunk" as Theme, label: "Cyberpunk", icon: "🌆" },
  ];

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}
