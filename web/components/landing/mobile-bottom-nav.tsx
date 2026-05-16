"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  { icon: "home", label: "Home", href: "/" },
  { icon: "terminal", label: "Ops", href: "/api/catalog" },
  { icon: "list_alt", label: "Logs", href: "/llms.txt" },
  { icon: "settings", label: "Settings", href: "/dashboard/settings" },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 w-full z-50 bg-[#0e150e] border-t border-[#3d4a3d] md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="flex justify-around items-center h-16">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                active ? "text-[#4be277]" : "text-[#bccbb9] hover:text-[#dce5d9]"
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
              <span className="text-[10px] font-mono leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
