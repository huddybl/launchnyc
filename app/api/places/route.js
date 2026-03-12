import { NextResponse } from "next/server";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

/**
 * GET /api/places?input=... — Autocomplete: returns place predictions.
 * GET /api/places?place_id=... — Place details: returns address_components for the given place_id.
 * Uses server-only GOOGLE_MAPS_API_KEY (no NEXT_PUBLIC_ prefix).
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input")?.trim() || "";
  const placeId = searchParams.get("place_id")?.trim() || "";

  if (!GOOGLE_MAPS_API_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_API_KEY is not configured" },
      { status: 503 }
    );
  }

  // Place Details: fetch address_components for a selected place
  if (placeId) {
    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "address_components");
    url.searchParams.set("key", GOOGLE_MAPS_API_KEY);

    try {
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        return NextResponse.json(
          { error: data.error_message || data.status || "Place details failed" },
          { status: 400 }
        );
      }
      const components = data.result?.address_components || [];
      return NextResponse.json({ address_components: components });
    } catch (err) {
      console.error("[api/places] details fetch error:", err);
      return NextResponse.json(
        { error: err?.message || "Failed to fetch place details" },
        { status: 500 }
      );
    }
  }

  // Autocomplete: return predictions for the search input
  if (!input) {
    return NextResponse.json({ predictions: [] });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", input);
  url.searchParams.set("key", GOOGLE_MAPS_API_KEY);
  url.searchParams.set("components", "country:us");

  try {
    const res = await fetch(url.toString());
    const data = await res.json();
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json(
        { error: data.error_message || data.status || "Autocomplete failed" },
        { status: 400 }
      );
    }
    const predictions = (data.predictions || []).map((p) => ({
      place_id: p.place_id,
      description: p.description,
    }));
    return NextResponse.json({ predictions });
  } catch (err) {
    console.error("[api/places] autocomplete fetch error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}
