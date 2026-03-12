import { NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import ApplicationPDF from "@/components/ApplicationPDF";

export async function POST(request) {
  try {
    const body = await request.json();
    const { profile = {}, checklist = {}, apartment = null } = body;
    const pdf = React.createElement(ApplicationPDF, {
      profile,
      checklist,
      apartment: apartment || null,
    });
    const buffer = await renderToBuffer(pdf);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="application-package.pdf"',
      },
    });
  } catch (err) {
    console.error("[generate-pdf]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
