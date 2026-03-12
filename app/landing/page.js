"use client";

import Link from "next/link";
import {
  FileText,
  LayoutGrid,
  MessageSquare,
  Home,
  User,
} from "lucide-react";

const SECTION_INNER = "mx-auto max-w-[1280px] px-8";

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-white font-sans text-[#001f3f] antialiased">
      {/* 1. Nav — full browser width, padding 32px only */}
      <header className="sticky top-0 z-50 w-full border-b border-[#e8ecf2] bg-white px-8">
        <nav className="flex items-center justify-between py-4">
          <Link href="/landing" className="flex items-center">
            <img
              src="/logo.png"
              alt="LaunchNYC"
              height={36}
              className="h-9 w-auto"
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-[#001f3f] no-underline transition-opacity hover:opacity-80"
            >
              Log In
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-[#001f3f] px-4 py-2.5 text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90"
            >
              Get Started — it&apos;s free
            </Link>
          </div>
        </nav>
      </header>

      {/* 2. Hero — full-width outer (bg), inner max-w 1280px, grid 1fr 1fr gap 80px */}
      <section className="w-full bg-white py-16 sm:py-20 lg:py-24">
        <div className={SECTION_INNER}>
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <div className="pl-0">
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-[#001f3f] sm:text-5xl lg:text-[60px]">
              Your NYC lease application. Ready in 20 minutes.
            </h1>
            <p className="mt-5 text-lg text-[#4b5563] leading-relaxed">
              Stop scrambling. LaunchNYC gets first-time renters organized, prepared, and moving fast — before the apartment is gone.
            </p>
            <div className="mt-8">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg bg-[#001f3f] px-6 py-3.5 text-base font-semibold text-white no-underline transition-opacity hover:opacity-90"
              >
                Get Started — it&apos;s free
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-end">
            {/* Browser window mockup */}
            <div className="ml-auto w-full max-w-lg overflow-hidden rounded-lg border border-[#e8ecf2] bg-white shadow-[0_12px_40px_rgba(0,31,63,0.15)]">
              <div className="flex items-center gap-2 border-b border-[#2d2d2d] bg-[#2d2d2d] px-3 py-2.5">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" aria-hidden />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" aria-hidden />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" aria-hidden />
              </div>
              <div className="border-b border-[#e8ecf2] bg-[#f5f6f7] px-3 py-2">
                <div className="rounded-md border border-[#e8ecf2] bg-white px-3 py-2 text-xs text-[#6b7280]">
                  launchnyc.vercel.app
                </div>
              </div>
              <div className="bg-white">
                <img
                  src="/searchhq-preview.png"
                  alt="Search HQ preview"
                  className="w-full object-cover object-top"
                />
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* 3. Feature cards — full-width outer (bg), inner max-w 1280px */}
      <section className="w-full border-t border-[#e8ecf2] bg-[#fafbfc] py-16 sm:py-20">
        <div className={SECTION_INNER}>
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="rounded-xl border border-[#e8ecf2] bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#001f3f]/10 text-[#001f3f]">
                <FileText className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#001f3f]">
                Build your renter profile once
              </h3>
              <p className="mt-2 text-sm text-[#6b7280] leading-relaxed">
                Fill it out once, use it everywhere. No more digging for your employer&apos;s phone number at 11pm.
              </p>
            </div>
            <div className="rounded-xl border border-[#e8ecf2] bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#001f3f]/10 text-[#001f3f]">
                <LayoutGrid className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#001f3f]">
                Track your search like a pro
              </h3>
              <p className="mt-2 text-sm text-[#6b7280] leading-relaxed">
                Save apartments, move them through stages, and never lose track of a listing again.
              </p>
            </div>
            <div className="rounded-xl border border-[#e8ecf2] bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#001f3f]/10 text-[#001f3f]">
                <MessageSquare className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#001f3f]">
                Your AI advisor knows your search
              </h3>
              <p className="mt-2 text-sm text-[#6b7280] leading-relaxed">
                Ask anything. It already knows your budget, neighborhoods, and where you stand.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Everything you need — full-width outer (bg), inner max-w 1280px */}
      <section className="w-full border-t border-[#e8ecf2] bg-white py-16 sm:py-20">
        <div className={SECTION_INNER}>
          <h2 className="text-center text-2xl font-bold tracking-tight text-[#001f3f] sm:text-3xl">
            Everything you need, in one place.
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:mt-16">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#001f3f]/10 text-[#001f3f]">
                <LayoutGrid className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#001f3f]">Search Board</h3>
                <p className="mt-2 text-sm text-[#6b7280] leading-relaxed">
                  Save apartments from any site and track them through every stage from first look to signed lease.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#001f3f]/10 text-[#001f3f]">
                <User className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#001f3f]">Renter Profile</h3>
                <p className="mt-2 text-sm text-[#6b7280] leading-relaxed">
                  Fill out your info once. Every field a landlord or broker could ask for, ready to go.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#001f3f]/10 text-[#001f3f]">
                <Home className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#001f3f]">Search HQ</h3>
                <p className="mt-2 text-sm text-[#6b7280] leading-relaxed">
                  Your week-by-week plan from start to signed, with your actual progress tracked in real time.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#001f3f]/10 text-[#001f3f]">
                <MessageSquare className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#001f3f]">AI Advisor</h3>
                <p className="mt-2 text-sm text-[#6b7280] leading-relaxed">
                  An advisor that knows your budget, timeline, and neighborhoods — ask it anything, anytime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Bottom CTA — full-width outer (bg), inner max-w 1280px */}
      <section className="w-full bg-[#001f3f] py-14 sm:py-16">
        <div className={`flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-8 ${SECTION_INNER}`}>
          <p className="text-center text-lg font-medium text-white sm:text-xl">
            Moving to NYC this summer? Get organized today.
          </p>
          <Link
            href="/login"
            className="flex-shrink-0 rounded-lg border-2 border-white bg-transparent px-6 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-white hover:text-[#001f3f]"
          >
            Get Started — it&apos;s free
          </Link>
        </div>
      </section>
    </div>
  );
}
