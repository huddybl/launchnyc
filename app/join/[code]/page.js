"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isInviteId(value) {
  return typeof value === "string" && UUID_REGEX.test(value.trim());
}

export default function JoinGroupPage() {
  const router = useRouter();
  const params = useParams();
  const code = params?.code ?? "";
  const [status, setStatus] = useState("loading");
  const [groupName, setGroupName] = useState(null);

  useEffect(() => {
    console.log("[Join] code:", code);
    if (!code) {
      setStatus("error");
      return;
    }

    let cancelled = false;
    const isId = isInviteId(code);

    async function run() {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (session?.user) {
        setStatus("joining");
        try {
          if (isId) {
            const res = await fetch("/api/invite/accept", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ invite_id: code.trim() }),
            });
            if (cancelled) return;
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              setStatus("error");
              return;
            }
            router.replace("/board?joined=1");
          } else {
            const res = await fetch("/api/groups/join", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ invite_code: code }),
            });
            if (cancelled) return;
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              setStatus("error");
              return;
            }
            router.replace("/board?joined=1");
          }
        } catch {
          if (!cancelled) setStatus("error");
        }
        return;
      }

      if (isId) {
        const res = await fetch(`/api/invite/${encodeURIComponent(code.trim())}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data.group_name) {
          setGroupName(data.group_name);
          if (typeof window !== "undefined") {
            window.localStorage.setItem("pendingInviteId", code.trim());
          }
          setStatus("not_logged_in");
        } else {
          setStatus("error");
        }
      } else {
        const res = await fetch(`/api/groups/invite/${encodeURIComponent(code)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data.name) {
          setGroupName(data.name);
          if (typeof window !== "undefined") {
            window.localStorage.setItem("pendingInviteCode", code);
          }
          setStatus("not_logged_in");
        } else {
          setStatus("error");
        }
      }
    }

    run();
    return () => { cancelled = true; };
  }, [code, router]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen w-full flex-col bg-[#f5f6f7]">
        <header className="flex h-14 items-center border-b border-[#e5e7eb] bg-white px-6">
          <Link href="/landing" className="font-semibold tracking-tight text-[#001f3f] no-underline">
            LaunchNYC
          </Link>
        </header>
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-[#001f3f]">Invalid or expired invite</h1>
            <p className="mt-2 text-sm text-[#6b7280]">This invite may be wrong or no longer valid.</p>
            <Link
              href="/board"
              className="mt-4 inline-block rounded-lg bg-[#001f3f] px-4 py-2.5 text-sm font-semibold text-white no-underline hover:opacity-90"
            >
              Go to board
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === "not_logged_in" && groupName) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-[#f5f6f7]">
        <header className="flex h-14 items-center border-b border-[#e5e7eb] bg-white px-6">
          <Link href="/landing" className="font-semibold tracking-tight text-[#001f3f] no-underline">
            LaunchNYC
          </Link>
        </header>
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md rounded-xl border border-[#e5e7eb] bg-white p-8 shadow-sm">
            <h1 className="text-xl font-semibold text-[#001f3f]">
              You&apos;ve been invited to join {groupName} on LaunchNYC
            </h1>
            <p className="mt-2 text-sm text-[#6b7280]">
              Sign up or log in to accept the invite and see the shared search board.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login?mode=signup"
                className="inline-flex justify-center rounded-lg bg-[#001f3f] px-4 py-2.5 text-sm font-semibold text-white no-underline hover:opacity-90"
              >
                Sign Up
              </Link>
              <Link
                href="/login"
                className="inline-flex justify-center rounded-lg border-2 border-[#001f3f] bg-white px-4 py-2.5 text-sm font-semibold text-[#001f3f] no-underline hover:bg-[#f0f4f8]"
              >
                Log In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f5f6f7]">
      <header className="flex h-14 items-center border-b border-[#e5e7eb] bg-white px-6">
        <Link href="/landing" className="font-semibold tracking-tight text-[#001f3f] no-underline">
          LaunchNYC
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-[#001f3f]">
            {status === "joining" ? "Joining group…" : "Loading…"}
          </h1>
          <p className="mt-2 text-sm text-[#6b7280]">
            {status === "joining" ? "Taking you to your board." : "Please wait."}
          </p>
        </div>
      </div>
    </div>
  );
}
