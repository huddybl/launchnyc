"use client";

import Link from "next/link";

export default function GuestModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-modal-title"
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="guest-modal-title" className="text-lg font-semibold text-[#001f3f]">
          Create your free account
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          Sign up to save your search profile, track apartments, and get AI advice tailored to you.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/login?mode=signup"
            className="rounded-lg bg-[#001f3f] px-4 py-3 text-center text-sm font-semibold text-white hover:opacity-90"
          >
            Sign up
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-[#dde2ea] px-4 py-3 text-center text-sm font-medium text-[#0f1826] hover:bg-[#f4f6f9]"
          >
            Log in
          </Link>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full text-sm text-zinc-500 hover:text-zinc-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
