import "dotenv/config";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const resend = new Resend(process.env.RESEND_API_KEY);

const ZIP_TO_NEIGHBORHOOD = {
  "10001": "Chelsea",
  "10002": "Lower East Side",
  "10003": "East Village",
  "10004": "Financial District",
  "10005": "Financial District",
  "10006": "Financial District",
  "10007": "Tribeca",
  "10009": "East Village",
  "10010": "Gramercy",
  "10011": "Chelsea",
  "10012": "SoHo",
  "10013": "Tribeca",
  "10014": "West Village",
  "10016": "Murray Hill",
  "10017": "Midtown",
  "10018": "Midtown",
  "10019": "Midtown West",
  "10021": "Upper East Side",
  "10022": "Midtown East",
  "10023": "Upper West Side",
  "10024": "Upper West Side",
  "10025": "Upper West Side",
  "10026": "Harlem",
  "10027": "Harlem",
  "10028": "Upper East Side",
  "10029": "East Harlem",
  "10030": "Harlem",
  "10031": "Harlem",
  "10032": "Washington Heights",
  "10033": "Washington Heights",
  "10034": "Washington Heights",
  "10036": "Midtown",
  "10065": "Upper East Side",
  "10075": "Upper East Side",
  "10128": "Upper East Side",
  "11201": "Brooklyn Heights",
  "11205": "Clinton Hill",
  "11206": "Bushwick",
  "11207": "Bushwick",
  "11208": "East New York",
  "11209": "Bay Ridge",
  "11211": "Williamsburg",
  "11215": "Park Slope",
  "11216": "Crown Heights",
  "11217": "Boerum Hill",
  "11218": "Kensington",
  "11221": "Bed-Stuy",
  "11222": "Greenpoint",
  "11225": "Crown Heights",
  "11226": "Flatbush",
  "11231": "Carroll Gardens",
  "11232": "Sunset Park",
  "11233": "Bed-Stuy",
  "11238": "Prospect Heights",
  "11249": "Williamsburg",
  "11101": "Long Island City",
  "11102": "Astoria",
  "11103": "Astoria",
  "11104": "Sunnyside",
  "11105": "Astoria",
  "11106": "Astoria",
};

function getNeighborhoodFromZip(zip) {
  if (!zip) return null;
  const normalized = String(zip).trim().slice(0, 5);
  return ZIP_TO_NEIGHBORHOOD[normalized] ?? null;
}

/** Normalize address for dedup (lowercase, collapse spaces). */
function normalizeAddress(str) {
  if (!str || typeof str !== "string") return "";
  return str.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Build stable listing id for digest_sent (RentCast id or address). */
function getListingId(listing) {
  const id = listing?.id ?? listing?.listingId ?? listing?.externalId;
  if (id) return String(id);
  const addr = listing?.formattedAddress ?? listing?.address ?? listing?.street ?? "";
  return normalizeAddress(addr) || `listing-${JSON.stringify(listing).slice(0, 100)}`;
}

/** Map RentCast listing to our shape. */
function mapListing(listing, neighborhood) {
  const price = listing?.price ?? listing?.monthlyRent ?? listing?.rent;
  const address =
    listing?.formattedAddress ??
    (typeof listing?.address === "string" ? listing.address : listing?.address?.line1 ?? listing?.address?.formatted ?? "") ??
    listing?.street ??
    "";
  return {
    neighborhood: neighborhood ?? "",
    street: address || null,
    price: price != null ? Number(price) : null,
    beds: listing?.bedrooms ?? listing?.beds ?? null,
    baths: listing?.bathrooms ?? listing?.baths ?? null,
  };
}

export async function GET(request) {
  const cronSecret = request.headers.get("X-Cron-Secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RENTCAST_API_KEY not configured" }, { status: 500 });
  }

  const { data: profiles } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, move_in_date, budget_max, bedrooms, neighborhoods")
    .not("move_in_date", "is", null)
    .not("budget_max", "is", null);

  if (!profiles?.length) {
    return NextResponse.json({ processed: 0, message: "No eligible users" });
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "LaunchNYC <onboarding@resend.dev>";
  let processed = 0;
  const errors = [];

  for (const profile of profiles) {
    const userId = profile.user_id;
    const budgetMax = Number(profile.budget_max);
    const bedrooms = profile.bedrooms != null ? Number(profile.bedrooms) : null;
    const targetNeighborhoods = Array.isArray(profile.neighborhoods) ? profile.neighborhoods : [];

    if (!userId || (budgetMax !== budgetMax)) continue;

    let email;
    try {
      const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId);
      email = authUser?.email;
    } catch (e) {
      errors.push({ userId, error: "getUserById failed" });
      continue;
    }
    if (!email) continue;

    const bedroomsParam = bedrooms != null ? Math.min(Math.max(0, Math.floor(bedrooms)), 5) : "";
    const url = new URL("https://api.rentcast.io/v1/listings/rental/long-term");
    url.searchParams.set("city", "New York");
    url.searchParams.set("state", "NY");
    url.searchParams.set("limit", "20");
    if (bedroomsParam !== "") url.searchParams.set("bedrooms", String(bedroomsParam));

    let listings = [];
    try {
      const res = await fetch(url.toString(), {
        headers: { "X-Api-Key": apiKey },
      });
      if (!res.ok) {
        errors.push({ userId, error: `RentCast ${res.status}` });
        continue;
      }
      const json = await res.json();
      const raw = Array.isArray(json) ? json : json?.listings ?? json?.data ?? [];
      listings = raw.filter((item) => item != null);
    } catch (e) {
      errors.push({ userId, error: String(e?.message ?? e) });
      continue;
    }

    const normalizedListings = listings.map((l) => {
      const zip = l?.zipCode ?? l?.zip ?? l?.address?.zipCode ?? (l?.address && typeof l.address === "object" ? l.address.zipCode : "") ?? "";
      const neighborhood = getNeighborhoodFromZip(zip);
      return { ...mapListing(l, neighborhood), raw: l, zip };
    }).filter((l) => l.street != null || l.price != null);

    const byBudget = budgetMax > 0
      ? normalizedListings.filter((l) => l.price != null && l.price <= budgetMax)
      : normalizedListings;

    const byNeighborhood = targetNeighborhoods.length > 0
      ? byBudget.filter((l) => l.neighborhood && targetNeighborhoods.includes(l.neighborhood))
      : byBudget;

    const existingAddresses = new Set();
    const { data: existingApts } = await supabaseAdmin
      .from("apartments")
      .select("street")
      .eq("user_id", userId)
      .is("group_id", null);
    (existingApts ?? []).forEach((a) => {
      existingAddresses.add(normalizeAddress(a.street || ""));
    });

    const { data: sentRows } = await supabaseAdmin
      .from("digest_sent")
      .select("listing_id")
      .eq("user_id", userId);
    const sentIds = new Set((sentRows ?? []).map((r) => r.listing_id));

    const toInsert = [];
    for (const item of byNeighborhood) {
      const listingId = getListingId(item.raw ?? item);
      if (sentIds.has(listingId)) continue;
      const addrNorm = normalizeAddress(item.street || "");
      if (addrNorm && existingAddresses.has(addrNorm)) continue;

      toInsert.push({
        listing_id: listingId,
        neighborhood: item.neighborhood || null,
        street: item.street || null,
        price: item.price,
        beds: item.beds,
        baths: item.baths,
      });
    }

    if (toInsert.length === 0) {
      processed += 1;
      continue;
    }

    for (const item of toInsert) {
      const { error: insertErr } = await supabaseAdmin
        .from("apartments")
        .insert({
          user_id: userId,
          group_id: null,
          status: "saved",
          price: item.price,
          neighborhood: item.neighborhood,
          street: item.street,
          beds: item.beds,
          baths: item.baths,
          listing_url: null,
          notes: null,
        });
      if (insertErr) {
        errors.push({ userId, listing_id: item.listing_id, error: insertErr.message });
        continue;
      }
      await supabaseAdmin
        .from("digest_sent")
        .insert({ user_id: userId, listing_id: item.listing_id });
    }

    const subject = `${toInsert.length} new apartment${toInsert.length !== 1 ? "s" : ""} match your search — LaunchNYC`;
    const cardsHtml = toInsert
      .map(
        (item) => `
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin-bottom:12px;background:#fafafa;">
          <div style="font-weight:600;color:#001f3f;">${escapeHtml(item.neighborhood || "NYC")}</div>
          <div style="font-size:14px;color:#374151;margin-top:4px;">${escapeHtml(item.street || "—")}</div>
          <div style="margin-top:8px;font-size:14px;color:#001f3f;">
            ${item.price != null ? `$${Number(item.price).toLocaleString()}/mo` : "—"} · ${item.beds ?? "?"} bed · ${item.baths ?? "?"} bath
          </div>
          <a href="https://launchnyc.app/board" style="display:inline-block;margin-top:10px;font-size:13px;font-weight:600;color:#001f3f;">View on Board →</a>
        </div>`
      )
      .join("");

    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
        <h2 style="color:#001f3f;font-size:20px;">New listings for you</h2>
        <p style="color:#6b7280;font-size:14px;">We added these to your board:</p>
        ${cardsHtml}
        <p style="margin-top:24px;font-size:12px;color:#9ca3af;">You're receiving this because you have an active search on LaunchNYC. Unsubscribe</p>
      </div>`;

    try {
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject,
        html,
      });
    } catch (e) {
      errors.push({ userId, error: `Resend: ${e?.message ?? e}` });
    }
    processed += 1;
  }

  return NextResponse.json({
    processed,
    errors: errors.length ? errors : undefined,
  });
}

function escapeHtml(str) {
  if (str == null) return "";
  const s = String(str);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
