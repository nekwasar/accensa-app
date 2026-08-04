"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse" />
    )
  }

  // No backdrop-blur on the button: the nav behind it is already blurred at 64px,
  // and nesting backdrop-filters breaks layer invalidation on iOS Safari, so the
  // button keeps its old paint when next-themes flips the class on <html>.
  // before:-inset-1 grows the hit area to 44x44 (Apple HIG) without resizing the
  // visible circle; pointer-events-none keeps the icons from eating the tap.
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/40 dark:bg-white/5 text-slate-500 dark:text-slate-400 md:hover:bg-white/60 dark:md:hover:bg-white/10 active:bg-white/60 dark:active:bg-white/10 transition-colors shadow-sm dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] cursor-pointer before:absolute before:-inset-1 before:content-['']"
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 dark:hidden pointer-events-none" />
      <Moon className="hidden h-4 w-4 dark:block pointer-events-none" />
    </button>
  )
}
