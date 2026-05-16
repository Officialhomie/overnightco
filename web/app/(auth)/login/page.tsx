"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const inputClass =
  "w-full bg-[#091009] border border-[#3d4a3d] rounded-[6px] px-4 py-3 font-mono text-sm text-[#dce5d9] outline-none focus:border-[#4be277] focus:ring-1 focus:ring-[#4be277] transition-all placeholder:text-[#869585] disabled:opacity-50";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    router.push(callbackUrl);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0e150e] px-6">
      <div className="w-full max-w-[400px]">
        {/* Login card */}
        <div className="bg-[#1a221a] border border-[#3d4a3d] rounded-lg p-6 flex flex-col gap-6">
          {/* Header */}
          <header className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#4be277] tracking-widest uppercase">
                OVERNIGHTCO.SYS
              </span>
              <span className="material-symbols-outlined text-[#4be277] text-sm">lock</span>
            </div>
            <h1 className="text-[24px] font-bold text-[#dce5d9] leading-[32px] tracking-[-0.02em]">
              Owner login<span className="terminal-cursor" aria-hidden />
            </h1>
          </header>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="login-email"
                className="font-mono text-[12px] text-[#bccbb9] uppercase tracking-wider"
              >
                OPERATOR_ID / EMAIL
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@overnight.co"
                required
                disabled={loading}
                autoComplete="email"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="login-password"
                className="font-mono text-[12px] text-[#bccbb9] uppercase tracking-wider"
              >
                AUTHENTICATION_KEY
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                autoComplete="current-password"
                className={inputClass}
              />
            </div>

            {/* Error box */}
            {error && (
              <div
                aria-live="polite"
                aria-atomic="true"
                className="font-mono text-[12px] text-[#ffb4ab] bg-[#93000a]/10 border border-[#ffb4ab]/20 p-3 rounded flex items-start gap-2"
              >
                <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">warning</span>
                <span>ERR: {error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="bg-[#22c55e] text-[#004b1e] rounded-[6px] py-3 font-mono font-semibold text-sm hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-40"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">
                    progress_activity
                  </span>
                  Authenticating...
                </>
              ) : (
                <>
                  Sign in
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </>
              )}
            </button>
          </form>

          {/* Footer links */}
          <footer className="flex items-center justify-between">
            <a
              href="#"
              className="font-mono text-[12px] text-[#bccbb9] hover:text-[#4be277] transition-colors"
            >
              Recover Access
            </a>
            <a
              href="#"
              className="font-mono text-[12px] text-[#bccbb9] hover:text-[#4be277] transition-colors"
            >
              Support Node
            </a>
          </footer>
        </div>

        {/* Atmospheric divider */}
        <div className="mt-8 flex justify-center opacity-20">
          <div className="flex flex-col items-center gap-1">
            <div className="w-16 h-px bg-[#3d4a3d]" />
            <p className="font-mono text-[10px] text-[#bccbb9] uppercase tracking-[0.2em]">
              Autonomous Protocol v1.0.4
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
