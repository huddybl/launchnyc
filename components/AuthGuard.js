"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AuthProvider } from "@/contexts/AuthContext";
import Sidebar from "@/components/Sidebar";
import AIChatPanel from "@/components/AIChatPanel";
import OnboardingModal from "@/components/OnboardingModal";

function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    setMatches(m.matches);
    const handler = (e) => setMatches(e.matches);
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

export default function AuthGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

    // Root URL (/) redirects by auth state
    if (pathname === "/") {
      if (session) {
        router.replace("/search-hq");
        return;
      }
      if (isGuest) {
        router.replace("/board");
        return;
      }
      router.replace("/landing");
      return;
    }

    // Not logged in and no guest: only /landing, /login, and /join/* are allowed.
    if (!allowed) {
      if (pathname !== "/landing" && pathname !== "/login" && !pathname.startsWith("/join/")) {
        router.replace("/landing");
        return;
      }
    }
    // Logged-in user on landing or login → send to search-hq
    if (session && (pathname === "/login" || pathname === "/landing")) {
      router.replace("/search-hq");
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
    if (pathname.startsWith("/join/")) {
      return <div className="flex min-h-screen w-full min-w-0 flex-1">{children}</div>;
    }
    return null;
  }

  return (
    <AuthProvider user={session?.user ?? null} isGuest={isGuest} pathname={pathname}>
      {/* Mobile top bar: hamburger + logo (only below 768px) */}
      {!isDesktop && (
        <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center gap-3 bg-[#001f3f] px-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/10"
            aria-label="Open menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <Link href="/landing" className="font-semibold tracking-tight text-white no-underline">
            LaunchNYC
          </Link>
        </header>
      )}
      <div className="flex min-h-screen flex-1 min-w-0">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isMobile={!isDesktop} />
        <main className={`min-w-0 flex-1 overflow-x-hidden ${!isDesktop ? "w-full pt-14 px-4 pb-6" : ""}`} style={!isDesktop ? { maxWidth: "100vw", boxSizing: "border-box" } : undefined}>
          {children}
        </main>
      </div>
      <AIChatPanel />
      <OnboardingModal />
    </AuthProvider>
  );
}
