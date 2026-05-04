"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

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
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-sm text-[#71717a]">OvernightCo</div>
          <h1 className="text-2xl font-bold">Owner login</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-[#a1a1aa]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full rounded border border-[#27272a] bg-[#111111] px-4 py-2.5 text-sm text-[#ededed] outline-none focus:border-[#22c55e] disabled:opacity-50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[#a1a1aa]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full rounded border border-[#27272a] bg-[#111111] px-4 py-2.5 text-sm text-[#ededed] outline-none focus:border-[#22c55e] disabled:opacity-50"
            />
          </div>

          {error && (
            <p className="text-xs text-[#ef4444]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded border border-[#22c55e] bg-[#22c55e] px-6 py-2.5 text-sm font-semibold text-[#052e16] transition-opacity hover:opacity-90 disabled:opacity-40"
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
