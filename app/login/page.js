"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("mode") === "signup") setMode("signup");
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    if (mode === "signup") {
      if (password !== confirmPassword) {
        setMessage({ type: "error", text: "Passwords don't match." });
        return;
      }
      if (!termsAgreed) {
        setMessage({
          type: "error",
          text: "Please agree to the Terms of Service.",
        });
        return;
      }
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        const { data: { session } } = await supabase.auth.getSession();
        const pendingInviteId = typeof window !== "undefined" ? window.localStorage.getItem("pendingInviteId") : null;
        const pendingCode = typeof window !== "undefined" ? window.localStorage.getItem("pendingInviteCode") : null;
        if (pendingInviteId && session?.access_token) {
          window.localStorage.removeItem("pendingInviteId");
          const res = await fetch("/api/invite/accept", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ invite_id: pendingInviteId }),
          });
          if (res.ok) {
            router.replace("/board?joined=1");
            router.refresh();
            return;
          }
        }
        if (pendingCode && session?.access_token) {
          window.localStorage.removeItem("pendingInviteCode");
          const res = await fetch("/api/groups/join", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token ?? ""}`,
            },
            body: JSON.stringify({ invite_code: pendingCode }),
          });
          if (res.ok) {
            router.replace("/board?joined=1");
            router.refresh();
            return;
          }
        }
        router.replace("/");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        const { data: { session } } = await supabase.auth.getSession();
        const pendingInviteId = typeof window !== "undefined" ? window.localStorage.getItem("pendingInviteId") : null;
        const pendingCode = typeof window !== "undefined" ? window.localStorage.getItem("pendingInviteCode") : null;
        if (pendingInviteId && session?.access_token) {
          window.localStorage.removeItem("pendingInviteId");
          const res = await fetch("/api/invite/accept", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ invite_id: pendingInviteId }),
          });
          if (res.ok) {
            router.replace("/board?joined=1");
            router.refresh();
            return;
          }
        }
        if (pendingCode && session?.access_token) {
          window.localStorage.removeItem("pendingInviteCode");
          const res = await fetch("/api/groups/join", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ invite_code: pendingCode }),
          });
          if (res.ok) {
            router.replace("/board?joined=1");
            router.refresh();
            return;
          }
        }
        setMessage({
          type: "success",
          text: "Check your email to confirm your account, then log in.",
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.message ?? "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleExploreFirst() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("guest", "true");
      window.location.href = "/board";
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white px-6 py-12">
      <div className="flex w-full max-w-sm flex-col items-center">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-[#001f3f]">
          LaunchNYC
        </h1>
        <p className="mt-1 text-center text-sm text-zinc-500">
          Your NYC apartment search, simplified.
        </p>

        <div className="mt-8 w-full rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex rounded-lg bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === "login"
                  ? "bg-white text-[#001f3f] shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === "signup"
                  ? "bg-white text-[#001f3f] shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-600">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-[#001f3f] placeholder-zinc-400 focus:border-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#001f3f]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-600">
                Password
              </span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 pr-10 text-[#001f3f] placeholder-zinc-400 focus:border-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#001f3f]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </label>
            {mode === "signup" && (
              <>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-zinc-600">
                    Confirm Password
                  </span>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 pr-10 text-[#001f3f] placeholder-zinc-400 focus:border-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#001f3f]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((p) => !p)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-600"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-zinc-300 text-[#001f3f] focus:ring-[#001f3f]"
                  />
                  <span className="text-sm text-zinc-600">
                    I agree to the Terms of Service
                  </span>
                </label>
              </>
            )}
            {message.text && (
              <p
                className={`text-sm ${
                  message.type === "error"
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {message.text}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-lg bg-[#001f3f] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading
                ? "Please wait…"
                : mode === "login"
                  ? "Log In"
                  : "Sign Up"}
            </button>
          </form>
        </div>

        <button
          type="button"
          onClick={handleExploreFirst}
          className="mt-6 text-sm font-medium text-[#001f3f] hover:underline"
        >
          Explore first →
        </button>
      </div>
    </div>
  );
}
