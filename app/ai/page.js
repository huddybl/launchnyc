"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import GuestPreviewBanner from "@/components/GuestPreviewBanner";

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "ai",
  text: "Hi! I'm your LaunchNYC AI advisor. I can help you with your apartment search — questions about neighborhoods, your timeline, documents, or your saved listings. What would you like to know?",
};

const GUEST_PREVIEW_MESSAGES = [
  { id: "preview-user-1", role: "user", text: "What neighborhoods fit a $3,500 budget?" },
  {
    id: "preview-ai-1",
    role: "ai",
    text: "For **$3,500/month** in NYC you can find solid options in several neighborhoods:\n\n**Astoria (Queens)** — Great value and a real neighborhood feel. You’ll see 1–2 beds in that range, often with more space than Manhattan. Solid restaurants, easy commute via N/W or ferry.\n\n**Bushwick (Brooklyn)** — Very common for this budget. Lots of 2-bed and even 3-bed options, younger crowd, strong arts/restaurant scene. L train access.\n\n**Ridgewood (Queens/Brooklyn border)** — Slightly more low-key than Bushwick, similar price range. Good 2-beds, L and M trains. Feels more residential.\n\nI can narrow this down by commute, vibe, or building type if you’d like.",
  },
];

function formatDate(value) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AIPage() {
  const { user, isGuest, openSignUpModal } = useAuth();
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [messagesLoaded, setMessagesLoaded] = useState(false);

  const DOCUMENT_CHECKLIST_KEYS = [
    "government_id",
    "offer_letter",
    "pay_stubs",
    "bank_statements",
    "tax_return",
    "guarantor_docs",
    "credit_report",
    "reference_letter",
  ];

  const fetchContext = useCallback(async () => {
    if (!user?.id) return null;
    const [profileRes, apartmentsRes, checklistRes] = await Promise.all([
      supabase.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("apartments")
        .select("id, neighborhood, price, beds, baths, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("document_checklist").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    const profile = profileRes.data ?? null;
    const apartments = Array.isArray(apartmentsRes.data) ? apartmentsRes.data : [];
    const checklist = checklistRes.data ?? null;
    const docsReady = checklist
      ? DOCUMENT_CHECKLIST_KEYS.filter((key) => checklist[key]).length
      : 0;
    const document_checklist = checklist
      ? Object.fromEntries(
          DOCUMENT_CHECKLIST_KEYS.map((key) => [
            key,
            { label: key.replace(/_/g, " "), checked: !!checklist[key] },
          ])
        )
      : null;
    return {
      budget_max: profile?.budget_max != null ? String(profile.budget_max) : null,
      move_in_date: profile?.move_in_date ?? null,
      bedrooms: profile?.bedrooms ?? null,
      neighborhoods: Array.isArray(profile?.neighborhoods) ? profile.neighborhoods : null,
      apartment_count: apartments.length,
      docs_ready: docsReady,
      apartments: apartments.map((a) => ({
        neighborhood: a.neighborhood ?? "—",
        price: a.price != null ? String(a.price) : "—",
        beds: a.beds ?? "—",
        baths: a.baths ?? "—",
        status: (a.status || "saved").toLowerCase(),
      })),
      document_checklist,
    };
  }, [user?.id]);

  const fetchMessages = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("ai_messages")
      .select("id, role, content, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(50);
    if (data?.length) {
      setMessages(
        data.map((row) => ({
          id: row.id,
          role: row.role === "assistant" ? "ai" : row.role,
          text: row.content,
        }))
      );
    }
    setMessagesLoaded(true);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || isGuest) {
      setContextLoading(false);
      setMessagesLoaded(true);
      return;
    }
    fetchContext().then((c) => {
      setContext(c ?? null);
      setContextLoading(false);
    });
    fetchMessages();
  }, [user?.id, isGuest, fetchContext, fetchMessages]);

  const guard = useCallback(
    (fn) =>
      (...args) => {
        if (isGuest) {
          openSignUpModal();
          return;
        }
        return typeof fn === "function" ? fn(...args) : undefined;
      },
    [isGuest, openSignUpModal]
  );

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const showPaywall = userMessageCount >= 3;

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading || showPaywall) return;

    const userMsg = { id: `user-${Date.now()}`, role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const apiMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.text,
      }));
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          context: context ?? {},
        }),
      });
      const data = await res.json();

      if (user?.id) {
        await supabase.from("ai_messages").insert({
          user_id: user.id,
          role: "user",
          content: trimmed,
        });
      }

      if (!res.ok) {
        const errText = `Sorry, something went wrong: ${data.error ?? res.statusText}.`;
        setMessages((prev) => [...prev, { id: `ai-${Date.now()}`, role: "ai", text: errText }]);
        if (user?.id) {
          await supabase.from("ai_messages").insert({
            user_id: user.id,
            role: "assistant",
            content: errText,
          });
        }
        return;
      }
      const aiText = data.text || "No response.";
      setMessages((prev) => [
        ...prev,
        { id: `ai-${Date.now()}`, role: "ai", text: aiText },
      ]);
      if (user?.id) {
        await supabase.from("ai_messages").insert({
          user_id: user.id,
          role: "assistant",
          content: aiText,
        });
      }
    } catch (err) {
      const errText = "Sorry, I couldn't get a response. Please try again.";
      setMessages((prev) => [
        ...prev,
        { id: `ai-${Date.now()}`, role: "ai", text: errText },
      ]);
      if (user?.id) {
        await supabase.from("ai_messages").insert({
          user_id: user.id,
          role: "assistant",
          content: errText,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  const displayBudget =
    context?.budget_max != null
      ? `$${Number(context.budget_max).toLocaleString()}/mo`
      : "—";
  const displayMoveIn = context?.move_in_date
    ? formatDate(context.move_in_date)
    : "—";
  const displayBedrooms =
    context?.bedrooms != null
      ? context.bedrooms >= 4
        ? "4+"
        : String(context.bedrooms)
      : "—";
  const displayNeighborhoods = Array.isArray(context?.neighborhoods)
    ? context.neighborhoods.join(" · ")
    : "—";
  const displayDocs = context
    ? `${context.docs_ready ?? 0} of 8 ready`
    : "—";
  const displayApartments = context ? `${context.apartment_count ?? 0} on board` : "—";

  if (isGuest) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f4f6f9]">
        <GuestPreviewBanner />
        <div className="flex flex-1">
        <aside className="hidden w-64 flex-shrink-0 flex-col bg-[#001f3f] p-5 text-white md:flex">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/70">
            Your search context
          </h2>
          <div className="mt-4 space-y-5 border-t border-white/10 pt-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Budget</div>
              <div className="mt-1 text-sm font-medium">—</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Move-in</div>
              <div className="mt-1 text-sm font-medium">—</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Size</div>
              <div className="mt-1 text-sm font-medium">—</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Areas</div>
              <div className="mt-1 text-sm font-medium">—</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Documents</div>
              <div className="mt-1 text-sm font-medium">—</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Apartments saved</div>
              <div className="mt-1 text-sm font-medium">—</div>
            </div>
          </div>
        </aside>
        <main className="flex flex-1 flex-col bg-white">
          <header className="flex items-center gap-3 border-b border-[#dde2ea] px-6 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#001f3f]/10 text-[#001f3f] font-bold text-sm">AI</div>
            <div>
              <h1 className="text-base font-semibold text-[#0f1826]">LaunchNYC AI Advisor</h1>
              <p className="text-xs text-[#6b7a8d]">Ask about your search, docs, or neighborhoods</p>
            </div>
          </header>
          <div className="flex items-center justify-center border-b border-[#e8ecf2] bg-[#f4f6f9] px-6 py-3 text-center text-sm text-[#6b7a8d]">
            This is a preview — sign up to get advice tailored to your actual search
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="mx-auto max-w-2xl space-y-5">
              {GUEST_PREVIEW_MESSAGES.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#001f3f] text-white"
                        : "bg-[#f4f6f9] text-[#0f1826] border border-[#dde2ea]"
                    }`}
                  >
                    {msg.role === "ai" ? (
                      <div className="ai-markdown [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:my-2 [&_li]:my-0.5 [&_strong]:font-semibold [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_h1]:mt-2 [&_h2]:mt-2 [&_h3]:mt-2">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.text
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-[#dde2ea] bg-white p-4">
            <div className="mx-auto flex max-w-2xl gap-3">
              <input
                type="text"
                disabled
                placeholder="Sign up to chat with your AI advisor"
                className="flex-1 rounded-lg border border-[#dde2ea] bg-[#f4f6f9] px-4 py-3 text-sm text-[#6b7a8d] placeholder:text-[#a4b0be]"
              />
              <button type="button" disabled className="rounded-lg bg-[#001f3f] px-5 py-3 text-sm font-semibold text-white opacity-60 cursor-not-allowed">
                Send
              </button>
            </div>
          </div>
        </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6f9]">
      {isGuest && <GuestPreviewBanner />}
      <div className="flex flex-1">
      {/* Left: context sidebar — hidden on mobile so chat is full width */}
      <aside className="hidden w-64 flex-shrink-0 flex-col bg-[#001f3f] p-5 text-white md:flex">
        <h2 className="text-xs font-bold uppercase tracking-wider text-white/70">
          Your search context
        </h2>
        {contextLoading ? (
          <div className="mt-4 border-t border-white/10 pt-4 text-sm text-white/60">
            Loading…
          </div>
        ) : (
          <div className="mt-4 space-y-5 border-t border-white/10 pt-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                Budget
              </div>
              <div className="mt-1 text-sm font-medium">{displayBudget}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                Move-in
              </div>
              <div className="mt-1 text-sm font-medium">{displayMoveIn}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                Size
              </div>
              <div className="mt-1 text-sm font-medium">{displayBedrooms}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                Areas
              </div>
              <div className="mt-1 text-sm font-medium leading-snug">
                {displayNeighborhoods || "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                Documents
              </div>
              <div className="mt-1 text-sm font-medium">{displayDocs}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                Apartments saved
              </div>
              <div className="mt-1 text-sm font-medium">{displayApartments}</div>
            </div>
          </div>
        )}
      </aside>

      {/* Right: chat */}
      <main className="flex flex-1 flex-col bg-white">
        <header className="flex items-center gap-3 border-b border-[#dde2ea] px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#001f3f]/10 text-[#001f3f] font-bold text-sm">
            AI
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#0f1826]">
              LaunchNYC AI Advisor
            </h1>
            <p className="text-xs text-[#6b7a8d]">
              Ask about your search, docs, or neighborhoods
            </p>
          </div>
        </header>

        {showPaywall && (
          <div className="flex items-center justify-between gap-4 border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900">
            <span>
              You&apos;ve used your 3 free messages. Upgrade to Pro for unlimited
              AI advice.
            </span>
            <Link
              href="/account#billing"
              className="rounded-lg bg-[#001f3f] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 no-underline"
            >
              Upgrade to Pro
            </Link>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mx-auto max-w-2xl space-y-5">
            {!messagesLoaded ? (
              <div className="flex justify-center py-8 text-sm text-[#6b7a8d]">
                Loading chat…
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#001f3f] text-white"
                        : "bg-[#f4f6f9] text-[#0f1826] border border-[#dde2ea]"
                    }`}
                  >
                    {msg.role === "ai" ? (
                      <div className="ai-markdown [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:my-2 [&_li]:my-0.5 [&_strong]:font-semibold [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_h1]:mt-2 [&_h2]:mt-2 [&_h3]:mt-2">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.text
                    )}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg border border-[#dde2ea] bg-[#f4f6f9] px-4 py-2.5 text-sm text-[#6b7a8d]">
                  Thinking…
                </div>
              </div>
            )}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            if (isGuest) {
              e.preventDefault();
              openSignUpModal();
              return;
            }
            handleSubmit(e);
          }}
          className="border-t border-[#dde2ea] bg-white p-4"
        >
          <div className="mx-auto flex max-w-2xl gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your search..."
              disabled={loading || showPaywall}
              className="flex-1 rounded-lg border border-[#dde2ea] bg-[#f4f6f9] px-4 py-3 text-sm text-[#0f1826] placeholder:text-[#a4b0be] focus:border-[#001f3f] focus:bg-white focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || showPaywall || !input.trim()}
              className="rounded-lg bg-[#001f3f] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              Send
            </button>
          </div>
        </form>
      </main>
      </div>
    </div>
  );
}
