"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  FileText,
  MessageSquare,
  Bell,
} from "lucide-react";

const SECTION_INNER = "mx-auto max-w-[1280px] px-6 sm:px-8";

const PROGRESS_STAGES = [
  { label: "Set Up Your Search", start: 0, end: 25 },
  { label: "Build Your List", start: 25, end: 50 },
  { label: "Get Documents Ready", start: 50, end: 75 },
  { label: "Sign Your Lease 🎉", start: 75, end: 100 },
];

const TICK_MS = 50;
const TICKS_PER_STAGE = 60;

export default function LandingPage() {
  const [progressStage, setProgressStage] = useState(0);
  const [tickIndex, setTickIndex] = useState(0);
  const [displayPct, setDisplayPct] = useState(0);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const tickIndexRef = useRef(0);
  const progressStageRef = useRef(0);

  useEffect(() => {
    tickIndexRef.current = tickIndex;
    progressStageRef.current = progressStage;
  }, [tickIndex, progressStage]);

  useEffect(() => {
    const id = setInterval(() => {
      const stage = progressStageRef.current;
      const tick = tickIndexRef.current;
      if (stage === 3 && tick === TICKS_PER_STAGE - 1) {
        setTransitionEnabled(false);
        setDisplayPct(0);
        setProgressStage(0);
        setTickIndex(0);
        tickIndexRef.current = 0;
        progressStageRef.current = 0;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTransitionEnabled(true);
          });
        });
        return;
      }
      if (tick === TICKS_PER_STAGE - 1) {
        setProgressStage((s) => s + 1);
        progressStageRef.current = stage + 1;
        setTickIndex(0);
        tickIndexRef.current = 0;
        const next = PROGRESS_STAGES[stage + 1];
        setDisplayPct(next.start);
        return;
      }
      const start = PROGRESS_STAGES[stage].start;
      const end = PROGRESS_STAGES[stage].end;
      const nextPct = start + (end - start) * (tick + 1) / TICKS_PER_STAGE;
      setDisplayPct(nextPct);
      setTickIndex((t) => t + 1);
      tickIndexRef.current = tick + 1;
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const currentLabel = PROGRESS_STAGES[progressStage].label;
  const displayPctInt = Math.round(displayPct);

  const [minutes, setMinutes] = useState(10);
  useEffect(() => {
    if (minutes >= 20) return;
    const id = setInterval(() => {
      setMinutes((m) => (m >= 20 ? 20 : m + 1));
    }, 200);
    return () => clearInterval(id);
  }, [minutes]);

  return (
    <div className="min-h-screen w-full bg-white font-sans text-[#001f3f] antialiased">
      {/* Navbar */}
      <header className="sticky top-0 z-[100] w-full bg-[#f4f6f9] border-b border-[#e5e7eb] px-6 py-4 sm:px-8">
        <nav className="mx-auto flex max-w-[1280px] items-center justify-between">
          <Link href="/landing" className="flex items-center">
            <img
              src="/logo.png"
              alt="LaunchNYC"
              height={56}
              className="h-12 w-auto sm:h-14"
            />
          </Link>
          <div className="flex items-center gap-4 sm:gap-6">
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

      {/* Progress bar pill — exact same as before */}
      <div className="w-full bg-[#f4f6f9] py-4">
        <div className={SECTION_INNER}>
          <div className="relative h-11 w-full overflow-hidden rounded-[999px] bg-[#001f3f]">
            <div
              className="absolute left-0 top-0 h-full bg-[#16a34a]"
              style={{
                width: `${displayPct}%`,
                transition: transitionEnabled ? "width 0.05s linear" : "none",
              }}
            />
            <div className="relative flex h-full w-full items-center">
              <div className="flex flex-1 justify-center">
                <span className="text-sm font-semibold text-white" style={{ fontSize: "14px" }}>
                  {currentLabel}
                </span>
              </div>
              <span className="pr-4 text-lg font-bold text-white" style={{ fontSize: "18px" }}>
                {displayPctInt}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero — light gray */}
      <section className="w-full bg-[#f4f6f9] py-12 sm:py-16 lg:py-20">
        <div className={SECTION_INNER}>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#001f3f] sm:text-sm">
              Built for NYC&apos;s most competitive rental market
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-[#001f3f] sm:text-5xl lg:text-6xl">
              NYC apartments are gone in hours.
              <br />
              Are you ready?
            </h1>
            <p className="mt-6 text-lg text-[#6b7280] leading-relaxed sm:text-xl">
              Get your full application package ready in{" "}
              <span className="font-semibold text-[#001f3f]">{Math.min(minutes, 20)}</span>{" "}
              minutes — so when you find the right place, you can move before anyone else.
            </p>
            <div className="mt-8">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg bg-[#001f3f] px-6 py-3.5 text-base font-semibold text-white no-underline transition-opacity hover:opacity-90"
              >
                Get Started — it&apos;s free
              </Link>
              <p className="mt-4 text-sm text-[#6b7280]">
                Free to use · No credit card required
              </p>
            </div>
            {/* Browser mockup — exact same as before, centered */}
            <div className="mt-12 mx-auto w-full max-w-lg overflow-hidden rounded-lg border border-[#e8ecf2] bg-white shadow-[0_32px_80px_rgba(0,0,0,0.18)]">
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
      </section>

      {/* Problem section — dark navy */}
      <section className="w-full bg-[#001f3f] py-16 sm:py-20 lg:py-24">
        <div className={SECTION_INNER}>
          <h2 className="text-center text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            StreetEasy has a monopoly. That&apos;s not changing.
          </h2>
          <p className="mx-auto mt-6 max-w-[580px] text-center text-lg leading-relaxed text-[#94a3b8]">
            Brokers and landlords benefit from the broken market — so nobody&apos;s fixing it. The only way to win is to be more prepared and move faster than everyone else.
          </p>
          <div className="mt-12 flex flex-col items-center justify-center gap-8 sm:flex-row sm:gap-0 sm:divide-x sm:divide-[#334155]">
            <div className="text-center px-6 sm:px-10">
              <p className="text-2xl font-bold text-white sm:text-3xl">Hours</p>
              <p className="mt-1 text-sm text-[#94a3b8]">How long a good apartment stays listed</p>
            </div>
            <div className="text-center px-6 sm:px-10">
              <p className="text-2xl font-bold text-white sm:text-3xl">1 in 4</p>
              <p className="mt-1 text-sm text-[#94a3b8]">NYC renters who lose an apartment because someone else applied first</p>
            </div>
            <div className="text-center px-6 sm:px-10">
              <p className="text-2xl font-bold text-white sm:text-3xl">8 docs</p>
              <p className="mt-1 text-sm text-[#94a3b8]">What every landlord asks for before they&apos;ll consider you</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature section — white */}
      <section className="w-full bg-white py-16 sm:py-20 lg:py-24">
        <div className={SECTION_INNER}>
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-[#001f3f] sm:text-sm">
            How LaunchNYC works
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-[#001f3f] sm:text-4xl lg:text-5xl">
            Your entire search. One place.
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:mt-16 lg:gap-8">
            <div className="rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#001f3f]/10 text-[#001f3f]">
                <LayoutGrid className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#001f3f]">Search Board</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6b7280]">
                Save listings from any site, track them through every stage, and search together with your roommates. No more chaotic group chats.
              </p>
            </div>
            <div className="rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#001f3f]/10 text-[#001f3f]">
                <FileText className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#001f3f]">Application Profile</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6b7280]">
                Fill out your info once. Every field a landlord could ask for, ready to export as a professional package in one click.
              </p>
            </div>
            <div className="rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#001f3f]/10 text-[#001f3f]">
                <MessageSquare className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#001f3f]">AI Advisor</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6b7280]">
                An advisor built into the app that knows your budget, timeline, and documents — and tells you exactly what to do next.
              </p>
            </div>
            <div className="relative rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-6 shadow-sm">
              <span className="absolute right-4 top-4 rounded bg-[#e5e7eb] px-2 py-0.5 text-xs font-medium text-[#6b7280]">
                Coming Soon
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#001f3f]/10 text-[#9ca3af]">
                <Bell className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#9ca3af]">Daily Alerts</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#9ca3af]">
                Coming soon: new listings matching your criteria pushed to your board the moment they hit the market.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA — dark navy */}
      <section className="w-full bg-[#001f3f] py-14 sm:py-20">
        <div className={`flex flex-col items-center justify-center gap-8 ${SECTION_INNER}`}>
          <h2 className="text-center text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
            Stop losing apartments to people who were more ready.
          </h2>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3.5 text-base font-semibold text-[#001f3f] no-underline transition-opacity hover:opacity-90"
          >
            Start Your Search — It&apos;s Free
          </Link>
        </div>
      </section>
    </div>
  );
}
