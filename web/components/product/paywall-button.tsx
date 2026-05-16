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
        className="border border-[#4be277]/30 bg-[#003915]/40 p-4 text-sm text-[#4be277] font-mono"
        role="status"
        aria-live="polite"
      >
        Payment confirmed. Loading your content...
      </div>
    );
  }

  return (
    <div className="my-12 p-8 bg-[#1a221a] border border-[#ef9900]/30 relative overflow-hidden group">
      {/* Radial dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#ef9900 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />

      {/* Decorative state text */}
      <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
        <span className="font-mono text-[13px] text-[#ffba61]">WAITING_FOR_SIGNATURE...</span>
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-[#ffba61]">shield_person</span>
          <span className="text-[#ffba61] font-mono text-[10px] uppercase tracking-[0.2em] font-bold">
            Human tier
          </span>
        </div>
        <h3 className="text-[20px] leading-[28px] tracking-[-0.01em] font-semibold mb-3 text-[#dce5d9]">
          Unlock Deep Intelligence
        </h3>
        <p className="font-mono text-[12px] text-[#bccbb9] mb-6 max-w-md">
          Access the full technical specification, including vector weights and sentiment analysis
          parameters for our v1.0.4 autonomous agents.
        </p>

        <div aria-live="polite" aria-atomic="true">
          {step === "idle" && (
            <div className="flex flex-col sm:flex-row items-baseline sm:items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[#ffba61] text-[24px] font-bold leading-[32px]">
                  ${priceUsdc} USDC
                </span>
                <span className="font-mono text-[10px] text-[#bccbb9] uppercase">
                  One-time microtransaction
                </span>
              </div>
              <button
                type="button"
                onClick={handleSubscribe}
                className="flex-1 sm:flex-none px-8 py-3 bg-[#ffba61] text-[#472a00] font-mono font-semibold text-sm rounded hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffba61]"
              >
                Subscribe for ${priceUsdc}
                <span className="material-symbols-outlined text-[18px]">bolt</span>
              </button>
            </div>
          )}

          {step === "creating" && (
            <p className="font-mono text-sm text-[#bccbb9]" role="status">
              Creating checkout session...
            </p>
          )}

          {step === "polling" && (
            <div>
              <p className="mb-4 font-mono text-sm text-[#bccbb9]">
                Complete your payment in the Locus checkout window, then click below.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                {checkoutUrl && (
                  <a
                    href={checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 border border-[#3d4a3d] px-4 py-2.5 text-center font-mono text-sm text-[#bccbb9] hover:text-[#dce5d9] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4be277]"
                  >
                    Open checkout
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={verifying}
                  aria-busy={verifying}
                  className="flex-1 border border-[#4be277] bg-[#4be277] text-[#003915] px-4 py-2.5 font-mono text-sm font-semibold rounded hover:brightness-110 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4be277] disabled:opacity-50"
                >
                  {verifying ? "Verifying..." : "I paid — verify"}
                </button>
              </div>
              {errorMsg && (
                <p className="mt-3 font-mono text-xs text-[#ffba61]">{errorMsg}</p>
              )}
            </div>
          )}

          {step === "error" && (
            <div>
              <p className="mb-3 font-mono text-sm text-[#ffb4ab]">{errorMsg}</p>
              <button
                type="button"
                onClick={() => {
                  setStep("idle");
                  setErrorMsg(null);
                }}
                className="font-mono text-xs text-[#bccbb9] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4be277]"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
