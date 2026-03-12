"use client";

import Link from "next/link";

export default function GuestPreviewBanner() {
  return (
    <div
      className="flex w-full items-center justify-center gap-2 px-4 py-2 text-sm text-[#001f3f]"
      style={{ backgroundColor: "#eef2f9" }}
    >
      <span>👀 You&apos;re viewing a preview — create a free account to save your progress</span>
      <Link
        href="/login?mode=signup"
        className="font-semibold text-[#001f3f] underline hover:no-underline"
      >
        Sign up
      </Link>
    </div>
  );
}
