"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/api/catalog", label: "Operations", icon: "terminal" },
  { href: "/llms.txt", label: "Agent Logs", icon: "history_edu" },
  { href: "/", label: "Marketplace", icon: "storefront" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
] as const;

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-0.5">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-4 py-3 font-mono text-[13px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4be277] ${
              active
                ? "bg-[#242c24] text-[#4be277] border-r-2 border-r-[#4be277]"
                : "text-[#bccbb9] hover:bg-[#1a221a] hover:text-[#dce5d9]"
            }`}
          >
            <span
              className="material-symbols-outlined text-xl"
              style={
                active
                  ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
                  : undefined
              }
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
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
    <div className="flex min-h-screen bg-[#0e150e] text-[#dce5d9]">
      {/* Desktop sidebar */}
      <aside className="w-[208px] h-screen fixed left-0 top-0 hidden md:flex flex-col bg-[#091009] border-r border-[#3d4a3d] py-6 overflow-y-auto">
        <div className="px-4 mb-8">
          <h1 className="font-mono font-bold text-[16px] text-[#4be277] tracking-tighter mb-1">
            OvernightCo
          </h1>
          <p className="font-mono text-[10px] text-[#bccbb9]">Autonomous v1.0.4</p>
        </div>

        <SidebarNav />

        <div className="px-4 mt-auto space-y-4 pt-6">
          <button
            type="button"
            className="w-full bg-[#22c55e] text-[#004b1e] font-mono text-[13px] py-2 rounded hover:brightness-110 active:scale-[0.98] transition-all"
          >
            Deploy Agent
          </button>
          <div className="space-y-1">
            <a
              href="#"
              className="flex items-center gap-3 text-[#bccbb9] hover:text-[#4be277] py-1 font-mono text-[10px] transition-colors"
            >
              <span className="material-symbols-outlined text-base">menu_book</span>
              <span>Docs</span>
            </a>
            <a
              href="/api/auth/signout"
              className="flex items-center gap-3 text-[#bccbb9] hover:text-[#4be277] py-1 font-mono text-[10px] transition-colors"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span>Logout</span>
            </a>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between border-b border-[#3d4a3d] bg-[#0e150e] px-4 md:hidden">
        <div>
          <div className="font-mono font-bold text-sm text-[#4be277]">OvernightCo</div>
          <div className="font-mono text-[10px] text-[#bccbb9]">dashboard</div>
        </div>
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="dashboard-mobile-nav"
          onClick={() => setMenuOpen((o) => !o)}
          className="p-2 text-[#bccbb9] transition-colors hover:text-[#dce5d9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4be277]"
        >
          <span className="material-symbols-outlined">
            {menuOpen ? "close" : "menu"}
          </span>
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
            className="fixed bottom-0 left-0 top-14 z-50 w-[208px] flex flex-col border-r border-[#3d4a3d] bg-[#091009] py-6 md:hidden"
          >
            <SidebarNav onNavigate={() => setMenuOpen(false)} />
            <div className="px-4 mt-auto pt-6 space-y-4">
              <button
                type="button"
                className="w-full bg-[#22c55e] text-[#004b1e] font-mono text-[13px] py-2 rounded hover:brightness-110 active:scale-[0.98] transition-all"
              >
                Deploy Agent
              </button>
              <a
                href="/api/auth/signout"
                className="flex items-center gap-3 text-[#bccbb9] hover:text-[#4be277] py-1 font-mono text-[10px] transition-colors"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                <span>Logout</span>
              </a>
            </div>
          </aside>
        </>
      )}

      {/* Content */}
      <main className="min-h-screen min-w-0 flex-1 overflow-auto pt-14 md:pt-0 md:ml-[208px]">
        {children}
      </main>
    </div>
  );
}
