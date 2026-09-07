"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type Step = "phone" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!phone.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.requestOtp(phone.trim());
      setInfo(res.message);
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp.length < 6) {
      setError("Enter the 6-digit code");
      return;
    }
    setSubmitting(true);
    try {
      if (isNewUser) {
        if (!displayName.trim()) {
          setError("Enter a display name");
          setSubmitting(false);
          return;
        }
        const res = await api.register({
          phone_or_username: phone.trim(),
          otp,
          display_name: displayName.trim(),
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(
            displayName.trim()
          )}&background=random&color=fff`,
        });
        setSession(res.access_token, res.user);
        router.replace("/chat");
        return;
      }

      try {
        const res = await api.login({ phone_or_username: phone.trim(), otp });
        setSession(res.access_token, res.user);
        router.replace("/chat");
      } catch (err: any) {
        if (String(err.message).toLowerCase().includes("no account")) {
          setIsNewUser(true);
          setError("");
          setInfo("New number — set up your profile below.");
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-signal-panel">
      <div className="w-full max-w-sm bg-signal-bg rounded-2xl shadow-sm border border-signal-border p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-signal-blue flex items-center justify-center mb-3">
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8">
              <path
                d="M12 2C6.48 2 2 6.03 2 11c0 2.4 1.05 4.57 2.77 6.17-.09.9-.42 2.5-1.27 3.83 1.83-.32 3.5-1.15 4.4-1.72A11.6 11.6 0 0 0 12 20c5.52 0 10-4.03 10-9s-4.48-9-10-9z"
                fill="white"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-signal-text">Signal Clone</h1>
          <p className="text-sm text-signal-textMuted mt-1 text-center">
            Private messaging, recreated for a demo.
          </p>
        </div>

        {step === "phone" && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-signal-textMuted mb-1">
                Phone number or username
              </label>
              <input
                autoFocus
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. alice or +1 555 0100"
                className="w-full border border-signal-border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-signal-blue/40 focus:border-signal-blue"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-signal-blue hover:bg-signal-blue-dark transition-colors text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-60"
            >
              {submitting ? "Sending code…" : "Continue"}
            </button>
            <p className="text-[11px] text-signal-textMuted text-center pt-1">
              Demo accounts: Harshit, garvit, vrinda, rhythm, vanshika — OTP is always 123456
            </p>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            {info && <p className="text-xs text-signal-blue-dark">{info}</p>}
            <div>
              <label className="block text-xs font-medium text-signal-textMuted mb-1">
                Verification code
              </label>
              <input
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                inputMode="numeric"
                className="w-full border border-signal-border rounded-lg px-3 py-2.5 text-sm tracking-[0.3em] outline-none focus:ring-2 focus:ring-signal-blue/40 focus:border-signal-blue"
              />
            </div>
            {isNewUser && (
              <div>
                <label className="block text-xs font-medium text-signal-textMuted mb-1">
                  Display name
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full border border-signal-border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-signal-blue/40 focus:border-signal-blue"
                />
              </div>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-signal-blue hover:bg-signal-blue-dark transition-colors text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-60"
            >
              {submitting ? "Verifying…" : isNewUser ? "Create account" : "Verify & continue"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setOtp("");
                setError("");
                setIsNewUser(false);
              }}
              className="w-full text-xs text-signal-textMuted hover:text-signal-text py-1"
            >
              Use a different number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
