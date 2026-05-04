import { auth } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 border-r border-[#27272a] px-4 py-6">
        <div className="mb-8">
          <div className="text-sm font-bold">OvernightCo</div>
          <div className="text-xs text-[#71717a]">dashboard</div>
        </div>
        <nav className="space-y-1">
          {[
            { href: "/dashboard", label: "P&L" },
            { href: "/dashboard/settings", label: "Settings" },
            { href: "/", label: "Landing" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded px-3 py-2 text-sm text-[#a1a1aa] transition-colors hover:bg-[#111111] hover:text-[#ededed]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
