import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const storageKey = "cairn-theme";

function storedTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(storageKey);

    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// The chosen theme, falling back to the system's, applied as the `dark` class shadcn's tokens key off.
export function useTheme(): readonly [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => storedTheme() ?? systemTheme());

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const choose = (next: Theme) => {
    setTheme(next);

    try {
      window.localStorage.setItem(storageKey, next);
    } catch {
      // Storage can be unavailable; the choice then lasts until the page reloads.
    }
  };

  return [theme, choose];
}
