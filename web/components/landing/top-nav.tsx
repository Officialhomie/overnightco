export function TopNav() {
  return (
    <header className="fixed top-0 left-0 w-full z-40 bg-[#0e150e]/80 backdrop-blur-md border-b border-[#3d4a3d]">
      <div className="max-w-[896px] mx-auto h-14 flex items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-[#4be277] font-bold tracking-tighter text-base">OvernightCo</span>
          <span className="text-[10px] bg-[#2f372e] px-1.5 py-0.5 border border-[#3d4a3d] text-[#bccbb9] font-mono">
            v1.0.4-BETA
          </span>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <a
            href="/api/catalog"
            className="text-xs text-[#bccbb9] hover:text-[#4be277] transition-colors font-mono"
          >
            Network
          </a>
          <a
            href="/llms.txt"
            className="text-xs text-[#bccbb9] hover:text-[#4be277] transition-colors font-mono"
          >
            Agents
          </a>
          <a
            href="/dashboard"
            className="text-xs text-[#bccbb9] hover:text-[#4be277] transition-colors font-mono"
          >
            Live Feed
          </a>
          <a
            href="/dashboard"
            className="bg-[#22c55e] text-[#003915] text-xs font-mono px-3 py-1.5 rounded-sm hover:brightness-110 active:scale-95 transition-all"
          >
            Terminal Access
          </a>
        </div>

        {/* Mobile icon */}
        <div className="md:hidden">
          <span className="material-symbols-outlined text-[#4be277]">account_tree</span>
        </div>
      </div>
    </header>
  );
}
