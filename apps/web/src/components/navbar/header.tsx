"use client";

import { cn } from "@Duty-Roster/ui/lib/utils";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ROUTES } from "@/lib/paths";

// Dynamic import — better-auth's client SDK (~40 kB) is NOT bundled
// into the root layout chunk. It loads as a separate chunk after hydration.
const UserMenu = dynamic(
  () => import("./UserMenu").then((m) => ({ default: m.UserMenu })),
  {
    ssr: false,
    // Placeholder matches the approximate size of the UserMenu button
    // to prevent layout shift while better-auth resolves the session.
    loading: () => (
      <div className="ml-1 h-8 w-20 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
    ),
  },
);

// Static nav links that don't require auth state.
// Admin-only links (Dashboard, Manage) are rendered by UserMenu after
// the session resolves client-side, avoiding an auth-gated server render.
const NAV_LINKS = [
  { to: ROUTES.home, label: "Home" },
  { to: ROUTES.roster, label: "Roster" },
] as const;

/**
 * Header is a Client Component only because it needs pathname for active-link
 * highlighting and mobile menu open/close state.
 * The auth-dependent UI (session, sign-out) is fully isolated in <UserMenu>
 * so better-auth's client SDK is NOT pulled into the shared layout chunk.
 */
export default function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-[100] w-full border-border/50 border-b bg-white dark:bg-slate-950">
      <div className="mx-auto flex h-14 items-center justify-between px-4 sm:px-12 lg:px-20">
        <Link href="/" className="flex h-10 items-center gap-2">
          <Image
            src="/logo.png"
            alt="logo"
            height={40}
            width={40}
            className="rounded-sm"
            priority
          />
          <p className="font-semibold text-xl tracking-tight">
            <span className="text-slate-900 dark:text-slate-100">simple</span>
            <span className="text-slate-500 dark:text-slate-400">roster</span>
          </p>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              href={to}
              className={cn(
                "px-3 py-1.5 font-medium text-sm transition-colors",
                pathname === to
                  ? "text-foreground underline underline-offset-4"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </Link>
          ))}
          {/* Auth-dependent links + sign-out — isolated client component */}
          <UserMenu pathname={pathname} />
        </nav>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center text-foreground md:hidden"
          onClick={() => setIsMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="border-border/50 border-t bg-background p-4 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                href={to}
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  "px-3 py-2 font-medium text-sm transition-colors",
                  pathname === to ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </Link>
            ))}
            <UserMenu
              pathname={pathname}
              mobile
              onNavigate={() => setIsMenuOpen(false)}
            />
          </div>
        </div>
      )}
    </header>
  );
}
