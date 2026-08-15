"use client";

import * as React from "react";

export type Theme = "light" | "dark" | "system";

export interface UseThemeProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
  systemTheme: "light" | "dark";
  themes: Theme[];
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  attribute?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

const ThemeContext = React.createContext<UseThemeProps | undefined>(undefined);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function disableTransitions() {
  const css = document.createElement("style");
  css.appendChild(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}"
    )
  );
  document.head.appendChild(css);
  return () => {
    void window.getComputedStyle(document.body);
    setTimeout(() => {
      document.head.removeChild(css);
    }, 1);
  };
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "theme",
  attribute = "class",
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
      }
    } catch {
      // Ignore localStorage access error
    }
    return defaultTheme;
  });

  const [systemTheme, setSystemTheme] = React.useState<"light" | "dark">(getSystemTheme);

  const resolvedTheme: "light" | "dark" =
    theme === "system" && enableSystem ? systemTheme : theme === "light" ? "light" : "dark";

  // Apply theme to DOM element
  const applyTheme = React.useCallback(
    (targetTheme: "light" | "dark") => {
      if (typeof window === "undefined") return;
      const root = document.documentElement;

      const enableTransitions = disableTransitionOnChange ? disableTransitions() : null;

      if (attribute === "class") {
        root.classList.remove("light", "dark");
        root.classList.add(targetTheme);
      } else {
        root.setAttribute(attribute, targetTheme);
      }

      root.style.colorScheme = targetTheme;
      enableTransitions?.();
    },
    [attribute, disableTransitionOnChange]
  );

  // Synchronize when resolved theme changes
  React.useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme, applyTheme]);

  // Listen to system preference changes
  React.useEffect(() => {
    if (!enableSystem) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      setSystemTheme(mediaQuery.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [enableSystem]);

  // Listen to cross-tab storage changes
  React.useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== storageKey) return;
      const newTheme = e.newValue as Theme | null;
      if (newTheme === "light" || newTheme === "dark" || newTheme === "system") {
        setThemeState(newTheme);
      } else {
        setThemeState(defaultTheme);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [storageKey, defaultTheme]);

  const setTheme = React.useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      try {
        localStorage.setItem(storageKey, newTheme);
      } catch {
        // Ignore localStorage error
      }
    },
    [storageKey]
  );

  const value = React.useMemo<UseThemeProps>(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      systemTheme,
      themes: ["light", "dark", "system"],
    }),
    [theme, setTheme, resolvedTheme, systemTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): UseThemeProps {
  const context = React.useContext(ThemeContext);
  if (!context) {
    return {
      theme: "dark",
      setTheme: () => {},
      resolvedTheme: "dark",
      systemTheme: "dark",
      themes: ["light", "dark", "system"],
    };
  }
  return context;
}
