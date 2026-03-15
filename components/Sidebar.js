"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useEffect } from "react";
import { Home, LayoutGrid, FileText, MessageSquare, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const sidebarContent = (pathname, navLinks, isGuest, handleSignOut, onNavClick) => (
  <>
    <div className="flex min-h-0 flex-1 flex-col">
      <Link
        href="/landing"
        className="flex-shrink-0 cursor-pointer border-b border-white/10 px-6 py-5 text-xl font-semibold tracking-tight text-white no-underline hover:text-white"
        onClick={onNavClick}
      >
        LaunchNYC
      </Link>
      <nav className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-0.5">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavClick}
                className={`flex items-center gap-2.5 rounded-lg border-l-2 py-2.5 pl-3 pr-4 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-white/60 bg-white/15 text-white"
                    : "border-transparent text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {Icon ? <Icon className="h-4 w-4 flex-shrink-0" aria-hidden /> : null}
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
        </div>
      </nav>
    </div>
    <div className="flex-shrink-0 border-t border-white/10 p-4">
      <button
        type="button"
        onClick={handleSignOut}
        className="w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        Sign out
      </button>
    </div>
  </>
);

const NAV_LINKS = [
  { href: "/timeline", label: "Search HQ", icon: Home },
  { href: "/board", label: "Board", icon: LayoutGrid },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/ai", label: "AI Advisor", icon: MessageSquare },
  { href: "/account", label: "My Account", icon: User },
];

export default function Sidebar({ isOpen = false, onClose = () => {}, isMobile = false }) {
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
    onClose();
    router.replace("/landing");
    router.refresh();
  }

  const onNavClick = isMobile ? onClose : undefined;
  const content = sidebarContent(pathname, navLinks, isGuest, handleSignOut, onNavClick);

  /* Mobile: dark overlay + sliding sidebar; above page content and mobile header */
  if (isMobile) {
    return (
      <>
        <div
          role="presentation"
          className="fixed inset-0 z-[100] bg-black/50 transition-opacity duration-200 md:hidden"
          style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none" }}
          onClick={onClose}
          aria-hidden
        />
        <aside
          className="fixed left-0 top-0 bottom-0 z-[110] flex w-64 flex-col justify-between bg-[#001f3f] shadow-xl transition-transform duration-300 ease-out md:hidden"
          style={{ transform: isOpen ? "translateX(0)" : "translateX(-100%)" }}
          aria-hidden={!isOpen}
          aria-label="Main navigation"
        >
          {content}
        </aside>
      </>
    );
  }

  /* Desktop: sidebar in flow */
  return (
    <aside className="flex h-screen w-56 flex-shrink-0 flex-col justify-between bg-[#001f3f]">
      {content}
    </aside>
  );
}
