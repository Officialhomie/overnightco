"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const fieldClass =
  "min-h-11 w-full rounded border border-[#27272a] bg-[#111111] px-4 py-2.5 text-sm text-[#ededed] outline-none focus-visible:border-[#22c55e] focus-visible:ring-2 focus-visible:ring-[#22c55e]/30 disabled:opacity-50";

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
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 sm:px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-sm text-[#71717a]">OvernightCo</div>
          <h1 className="text-2xl font-bold">Owner login</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-xs text-[#a1a1aa]">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-xs text-[#a1a1aa]">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
              className={fieldClass}
            />
          </div>

          <div className="min-h-5" aria-live="polite" aria-atomic="true">
            {error && <p className="text-xs text-[#ef4444]">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="min-h-11 w-full rounded border border-[#22c55e] bg-[#22c55e] px-6 py-2.5 text-sm font-semibold text-[#052e16] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] disabled:opacity-40"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
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
