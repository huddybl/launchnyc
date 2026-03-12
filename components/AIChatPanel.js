"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const WELCOME_MESSAGE = {
  id: 1,
  role: "ai",
  text: "Hi! I'm your LaunchNYC AI advisor. Ask me about your search, documents, neighborhoods, or timeline. How can I help?",
};

export default function AIChatPanel() {
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
          location: "components/AIChatPanel.js",
          message: "AIChatPanel render count (interval)",
          data: { renderCount: renderCountRef.current },
          timestamp: Date.now(),
          hypothesisId: "AIChatPanel",
        }),
      }).catch(() => {});
    }, 1500);
    return () => clearInterval(id);
  }, []);
  // #endregion
  const { isGuest, openSignUpModal } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", text: trimmed },
      {
        id: Date.now() + 1,
        role: "ai",
        text: "Thanks for your message. In a full implementation, an AI would respond here.",
      },
    ]);
    setInput("");
  }

  return (
    <>
      {/* Overlay */}
      <button
        type="button"
        aria-label="Close AI chat"
        className={`fixed inset-0 z-40 bg-black/15 backdrop-blur-sm transition-opacity duration-200 ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Slide-in panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-[#dde2ea] bg-white shadow-xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-[#dde2ea] bg-[#001f3f] px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-white/15 text-sm font-bold text-white">
              AI
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">LaunchNYC AI</h2>
              <p className="text-[10px] text-white/70">Ask about your search</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#001f3f] text-white"
                      : "bg-[#f4f6f9] text-[#0f1826] border border-[#dde2ea]"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="border-t border-[#dde2ea] p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 rounded-lg border border-[#dde2ea] bg-[#f4f6f9] px-3 py-2 text-sm text-[#0f1826] placeholder:text-[#a4b0be] focus:border-[#001f3f] focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-[#001f3f] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Send
            </button>
          </div>
        </form>
      </div>

      {/* Floating button */}
      <button
        type="button"
        onClick={() => (isGuest ? openSignUpModal() : setIsOpen(true))}
        aria-label="Open AI chat"
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#001f3f] text-white shadow-lg transition hover:bg-[#001a35] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#001f3f] focus:ring-offset-2"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    </>
  );
}
