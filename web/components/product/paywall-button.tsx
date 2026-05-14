"use client";

import { useState } from "react";

interface PaywallButtonProps {
  productId: string;
  priceUsdc: string;
}

type Step = "idle" | "creating" | "polling" | "done" | "error";

export function PaywallButton({ productId, priceUsdc }: PaywallButtonProps) {
  const [step, setStep] = useState<Step>("idle");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  async function handleSubscribe() {
    setStep("creating");
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/product/${productId}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerType: "HUMAN" }),
      });
      const data = await res.json() as { sessionId?: string; checkoutUrl?: string; error?: string };

      if (!res.ok || !data.checkoutUrl) {
        setErrorMsg(data.error ?? "Failed to create checkout session");
        setStep("error");
        return;
      }

      setCheckoutUrl(data.checkoutUrl);
      setSessionId(data.sessionId ?? null);
      setStep("polling");

      window.open(data.checkoutUrl, "_blank", "noopener");
    } catch {
      setErrorMsg("Network error");
      setStep("error");
    }
  }

  async function handleConfirm() {
    if (!sessionId) return;

    setVerifying(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/product/${productId}/subscribe/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json() as { success?: boolean; error?: string };

      if (res.ok && data.success) {
        setStep("done");
        window.location.reload();
      } else {
        setErrorMsg(data.error ?? "Payment not confirmed yet");
      }
    } catch {
      setErrorMsg("Network error verifying payment");
    } finally {
      setVerifying(false);
    }
  }

  if (step === "done") {
    return (
      <div
        className="rounded border border-[#22c55e]/30 bg-[#052e16]/40 p-4 text-sm text-[#22c55e]"
        role="status"
        aria-live="polite"
      >
        Payment confirmed. Loading your content...
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#27272a] bg-[#111111] p-6 text-center">
      <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#f59e0b]">
        Human tier
      </div>
      <p className="mb-4 text-sm text-[#a1a1aa]">
        Full article with analysis and context. One-time payment.
      </p>
      <div className="mb-5 text-2xl font-bold">
        ${priceUsdc} <span className="text-sm text-[#71717a]">USDC</span>
      </div>

      <div aria-live="polite" aria-atomic="true" className="min-h-10">
        {step === "idle" && (
          <button
            type="button"
            onClick={handleSubscribe}
            className="min-h-11 w-full rounded border border-[#f59e0b] bg-[#f59e0b] px-6 py-2.5 text-sm font-semibold text-[#1c1917] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
          >
            Subscribe for ${priceUsdc}
          </button>
        )}

        {step === "creating" && (
          <p className="text-sm text-[#71717a]" role="status">
            Creating checkout session...
          </p>
        )}

        {step === "polling" && (
          <div>
            <p className="mb-4 text-sm text-[#a1a1aa]">
              Complete your payment in the Locus checkout window, then click below.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {checkoutUrl && (
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-11 flex-1 rounded border border-[#27272a] px-4 py-2.5 text-center text-sm text-[#a1a1aa] hover:text-[#ededed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
                >
                  Open checkout
                </a>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={verifying}
                aria-busy={verifying}
                className="min-h-11 flex-1 rounded border border-[#22c55e] bg-[#22c55e] px-4 py-2.5 text-sm font-semibold text-[#052e16] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111] disabled:opacity-50"
              >
                {verifying ? "Verifying…" : "I paid — verify"}
              </button>
            </div>
            {errorMsg && <p className="mt-3 text-xs text-[#f59e0b]">{errorMsg}</p>}
          </div>
        )}

        {step === "error" && (
          <div>
            <p className="mb-3 text-sm text-[#ef4444]">{errorMsg}</p>
            <button
              type="button"
              onClick={() => {
                setStep("idle");
                setErrorMsg(null);
              }}
              className="text-xs text-[#71717a] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#71717a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
