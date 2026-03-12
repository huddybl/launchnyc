import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const MODEL = "claude-sonnet-4-20250514";

const DOC_LABELS = {
  government_id: "Government-issued ID",
  offer_letter: "Signed offer letter",
  pay_stubs: "Last 2 pay stubs",
  bank_statements: "Last 2 bank statements",
  tax_return: "Most recent tax return",
  guarantor_docs: "Guarantor tax return + income proof",
  credit_report: "Credit report",
  reference_letter: "Reference letter from previous landlord",
};

function buildSystemPrompt(context) {
  const budget_max = context?.budget_max ?? "—";
  const move_in_date = context?.move_in_date ?? "—";
  const bedrooms =
    context?.bedrooms != null
      ? context.bedrooms >= 4
        ? "4+"
        : String(context.bedrooms)
      : "—";
  const neighborhoods = Array.isArray(context?.neighborhoods)
    ? context.neighborhoods.join(", ")
    : context?.neighborhoods ?? "—";
  const apartment_count = context?.apartment_count ?? 0;
  const docs_ready = context?.docs_ready ?? 0;

  let apartmentsBlock = "None saved yet.";
  const apartments = context?.apartments;
  if (Array.isArray(apartments) && apartments.length > 0) {
    apartmentsBlock = apartments
      .map(
        (a, i) =>
          `${i + 1}. ${a.neighborhood} — $${a.price}/mo, ${a.beds} bed, ${a.baths} bath (status: ${a.status})`
      )
      .join("\n");
  }

  let documentsBlock = "No document checklist data.";
  const docChecklist = context?.document_checklist;
  if (docChecklist && typeof docChecklist === "object") {
    const lines = Object.entries(docChecklist).map(([key, val]) => {
      const label = (val && val.label) || DOC_LABELS[key] || key;
      const checked = val && val.checked;
      return `- ${label}: ${checked ? "Uploaded" : "Not yet uploaded"}`;
    });
    documentsBlock = lines.join("\n");
  }

  return `You are an expert NYC apartment search advisor helping a recent college grad find their first apartment in NYC.

Search preferences: Budget up to $${budget_max}/mo, Move-in: ${move_in_date}, Bedrooms: ${bedrooms}, Target neighborhoods: ${neighborhoods}.

Saved apartments (${apartment_count} total):
${apartmentsBlock}

Document checklist (${docs_ready} of 8 uploaded):
${documentsBlock}

When the user asks about their listings, documents, or next steps, reference the specific apartments and document status above. Give specific, practical advice. Be direct and concise.`;
}

export async function POST(request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { messages = [], context = {} } = body;

    const anthropic = new Anthropic({ apiKey });
    const systemPrompt = buildSystemPrompt(context);

    const apiMessages = messages.map((m) => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.content ?? m.text ?? "",
    }));

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: apiMessages,
    });

    const textBlock = response.content?.find((b) => b.type === "text");
    const text = textBlock?.text ?? "";

    return NextResponse.json({ text });
  } catch (err) {
    console.error("AI route error:", err);
    const message = err?.message ?? "Failed to get AI response";
    const status = err?.status ?? 500;
    return NextResponse.json({ error: message }, { status });
  }
}
