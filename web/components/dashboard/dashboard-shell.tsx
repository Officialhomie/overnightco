"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/dashboard", label: "P&L" },
  { href: "/dashboard/settings", label: "Settings" },
  { href: "/", label: "Landing" },
] as const;

function NavLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={className}>
      {NAV_LINKS.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`block rounded px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] ${
              active
                ? "bg-[#111111] text-[#ededed]"
                : "text-[#a1a1aa] hover:bg-[#111111] hover:text-[#ededed]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {/* Mobile header */}
      <header className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between border-b border-[#27272a] bg-[#0a0a0a] px-4 md:hidden">
        <div>
          <div className="text-sm font-bold">OvernightCo</div>
          <div className="text-xs text-[#71717a]">dashboard</div>
        </div>
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="dashboard-mobile-nav"
          onClick={() => setMenuOpen((o) => !o)}
          className="rounded p-2 text-[#a1a1aa] transition-colors hover:bg-[#111111] hover:text-[#ededed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
        >
          {menuOpen ? (
            <X className="h-5 w-5" aria-hidden />
          ) : (
            <Menu className="h-5 w-5" aria-hidden />
          )}
          <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
        </button>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation menu"
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <aside
            id="dashboard-mobile-nav"
            className="fixed bottom-0 left-0 top-14 z-50 w-52 border-r border-[#27272a] bg-[#0a0a0a] px-4 py-6 md:hidden"
          >
            <NavLinks
              onNavigate={() => setMenuOpen(false)}
              className="space-y-1"
            />
          </aside>
        </>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-52 shrink-0 border-r border-[#27272a] px-4 py-6 md:block">
        <div className="mb-8">
          <div className="text-sm font-bold">OvernightCo</div>
          <div className="text-xs text-[#71717a]">dashboard</div>
        </div>
        <NavLinks className="space-y-1" />
      </aside>

      <main className="min-h-screen min-w-0 flex-1 overflow-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
