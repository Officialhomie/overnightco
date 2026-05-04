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

      // Open Locus checkout in new tab
      window.open(data.checkoutUrl, "_blank", "noopener");
    } catch {
      setErrorMsg("Network error");
      setStep("error");
    }
  }

  async function handleConfirm() {
    if (!sessionId) return;

    try {
      const res = await fetch(`/api/product/${productId}/subscribe/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json() as { success?: boolean; error?: string };

      if (res.ok && data.success) {
        setStep("done");
        // Reload to show content
        window.location.reload();
      } else {
        setErrorMsg(data.error ?? "Payment not confirmed yet");
      }
    } catch {
      setErrorMsg("Network error verifying payment");
    }
  }

  if (step === "done") {
    return (
      <div className="rounded border border-[#22c55e]/30 bg-[#052e16]/40 p-4 text-sm text-[#22c55e]">
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

      {step === "idle" && (
        <button
          onClick={handleSubscribe}
          className="w-full rounded border border-[#f59e0b] bg-[#f59e0b] px-6 py-2.5 text-sm font-semibold text-[#1c1917] transition-opacity hover:opacity-90"
        >
          Subscribe for ${priceUsdc}
        </button>
      )}

      {step === "creating" && (
        <div className="text-sm text-[#71717a]">Creating checkout session...</div>
      )}

      {step === "polling" && (
        <div>
          <p className="mb-4 text-sm text-[#a1a1aa]">
            Complete your payment in the Locus checkout window, then click below.
          </p>
          <div className="flex gap-3">
            {checkoutUrl && (
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded border border-[#27272a] px-4 py-2.5 text-center text-sm text-[#a1a1aa] hover:text-[#ededed]"
              >
                Open checkout
              </a>
            )}
            <button
              onClick={handleConfirm}
              className="flex-1 rounded border border-[#22c55e] bg-[#22c55e] px-4 py-2.5 text-sm font-semibold text-[#052e16] transition-opacity hover:opacity-90"
            >
              I paid — verify
            </button>
          </div>
          {errorMsg && <p className="mt-3 text-xs text-[#f59e0b]">{errorMsg}</p>}
        </div>
      )}

      {step === "error" && (
        <div>
          <p className="mb-3 text-sm text-[#ef4444]">{errorMsg}</p>
          <button
            onClick={() => { setStep("idle"); setErrorMsg(null); }}
            className="text-xs text-[#71717a] underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
