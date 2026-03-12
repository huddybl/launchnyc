"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const NAV_LINKS = [
  { href: "/timeline", label: "Search HQ", icon: null },
  { href: "/board", label: "Board", icon: null },
  { href: "/documents", label: "Documents", icon: null },
  { href: "/ai", label: "AI Advisor", icon: null },
  { href: "/account", label: "My Account", icon: null },
];

export default function Sidebar() {
  const { isGuest } = useAuth();
  const navLinks = NAV_LINKS;
  // #region agent log
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  useEffect(() => {
    const id = setInterval(() => {
      fetch("http://127.0.0.1:7556/ingest/d61c60a1-1868-49a7-9882-9199063191d5", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5bd27a" },
        body: JSON.stringify({
          sessionId: "5bd27a",
          location: "components/Sidebar.js",
          message: "Sidebar render count (interval)",
          data: { renderCount: renderCountRef.current },
          timestamp: Date.now(),
          hypothesisId: "Sidebar",
        }),
      }).catch(() => {});
    }, 1500);
    return () => clearInterval(id);
  }, []);
  // #endregion
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/landing");
    router.refresh();
  }

  return (
    <aside className="flex w-56 flex-shrink-0 flex-col bg-[#001f3f]">
      <Link
        href="/landing"
        className="cursor-pointer border-b border-white/10 px-6 py-5 text-xl font-semibold tracking-tight text-white no-underline hover:text-white"
      >
        LaunchNYC
      </Link>
      <nav className="flex flex-1 flex-col gap-0.5 p-4">
        {navLinks.map(({ href, label, icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white/15 text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="flex-1">{label}</span>
              {isGuest && href === "/ai" ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 opacity-80" aria-hidden>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
