"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AuthProvider } from "@/contexts/AuthContext";
import Sidebar from "@/components/Sidebar";
import AIChatPanel from "@/components/AIChatPanel";
import OnboardingModal from "@/components/OnboardingModal";

export default function AuthGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (!s && typeof window !== "undefined" && window.localStorage.getItem("guest") === "true") {
        setIsGuest(true);
      }
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) setIsGuest(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (typeof window !== "undefined" && !session && window.localStorage.getItem("guest") === "true") {
      setIsGuest(true);
      return;
    }
    const allowed = !!session || isGuest;
    // Not logged in and no guest flag: only /landing and /login are allowed. Redirect to /landing (never to /login or /board).
    if (!allowed) {
      if (pathname !== "/landing" && pathname !== "/login") {
        router.replace("/landing");
        return;
      }
    }
    if (session && (pathname === "/login" || pathname === "/landing")) {
      router.replace("/timeline");
      return;
    }
  }, [loading, session, isGuest, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-white">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (pathname === "/login" || pathname === "/landing") {
    return <div className="flex min-h-screen w-full min-w-0 flex-1">{children}</div>;
  }

  if (!session && !isGuest) {
    return null;
  }

  return (
    <AuthProvider user={session?.user ?? null} isGuest={isGuest}>
      <div className="flex min-h-screen flex-1">
        <Sidebar />
        <div className="flex-1">{children}</div>
      </div>
      <AIChatPanel />
      <OnboardingModal />
    </AuthProvider>
  );
}
