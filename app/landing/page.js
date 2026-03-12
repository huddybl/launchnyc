"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#f5f5f5] px-6 py-12">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold tracking-tight text-[#001f3f]">
          LaunchNYC
        </h1>
        <p className="mt-3 text-base text-[#6b7280]">
          Your NYC apartment search, simplified. Save listings, track your applications, and get your documents in order — all in one place.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href="/login?mode=signup"
            className="inline-flex items-center justify-center rounded-lg bg-[#001f3f] px-6 py-3 text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90"
          >
            Sign up
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-[#001f3f] bg-white px-6 py-3 text-sm font-semibold text-[#001f3f] no-underline transition-colors hover:bg-[#f0f4f8]"
          >
            Log in
          </Link>
        </div>
        <p className="mt-8 text-sm text-[#6b7280]">
          <Link href="/login" className="font-medium text-[#001f3f] underline hover:no-underline">
            Explore as guest
          </Link>
          {" "}— try the app without an account
        </p>
      </div>
    </div>
  );
}
