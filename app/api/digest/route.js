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
  "10001": "Chelsea", "10002": "Lower East Side", "10003": "East Village",
  "10004": "Financial District", "10005": "Financial District", "10006": "Financial District",
  "10007": "Tribeca", "10009": "East Village", "10010": "Gramercy", "10011": "Chelsea",
  "10012": "SoHo", "10013": "Tribeca", "10014": "West Village", "10016": "Murray Hill",
  "10017": "Midtown", "10018": "Midtown", "10019": "Midtown West", "10021": "Upper East Side",
  "10022": "Midtown East", "10023": "Upper West Side", "10024": "Upper West Side", "10025": "Upper West Side",
  "10026": "Harlem", "10027": "Harlem", "10028": "Upper East Side", "10029": "East Harlem",
  "10030": "Harlem", "10031": "Harlem", "10032": "Washington Heights", "10033": "Washington Heights",
  "10034": "Washington Heights", "10036": "Midtown", "10065": "Upper East Side", "10075": "Upper East Side",
  "10128": "Upper East Side", "11201": "Brooklyn Heights", "11205": "Clinton Hill", "11206": "Bushwick",
  "11207": "Bushwick", "11208": "East New York", "11209": "Bay Ridge", "11211": "Williamsburg",
  "11215": "Park Slope", "11216": "Crown Heights", "11217": "Boerum Hill", "11218": "Kensington",
  "11221": "Bed-Stuy", "11222": "Greenpoint", "11225": "Crown Heights", "11226": "Flatbush",
  "11231": "Carroll Gardens", "11232": "Sunset Park", "11233": "Bed-Stuy", "11238": "Prospect Heights",
  "11249": "Williamsburg", "11101": "Long Island City", "11102": "Astoria", "11103": "Astoria",
  "11104": "Sunnyside", "11105": "Astoria", "11106": "Astoria",
};

const MOCK_LISTING = [
  {
    id: "mock-listing-1",
    formattedAddress: "123 Bedford Ave, Apt 2B, Brooklyn, NY 11211",
    addressLine1: "123 Bedford Ave",
    zipCode: "11211",
    bedrooms: 2,
    bathrooms: 1,
    price: 3200,
    listedDate: "2026-03-15T00:00:00.000Z",
  },
];

function getNeighborhoodFromZip(zip) {
  if (!zip) return null;
  const normalized = String(zip).trim().slice(0, 5);
  return ZIP_TO_NEIGHBORHOOD[normalized] ?? null;
}

function normalizeAddress(str) {
  if (!str || typeof str !== "string") return "";
  return str.trim().toLowerCase().replace(/\s+/g, " ");
}

function getListingId(listing) {
  const id = listing?.id ?? listing?.listingId ?? listing?.externalId;
  if (id) return String(id);
  const addr = listing?.formattedAddress ?? listing?.address ?? listing?.street ?? "";
  return normalizeAddress(addr) || `listing-${JSON.stringify(listing).slice(0, 100)}`;
}

function escapeHtml(str) {
  if (str == null) return "";
  const s = String(str);
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Today at 00:00:00 UTC. */
function getTodayStartUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Map raw RentCast item to daily_listings row shape (with neighborhood from zip). */
function toDailyListingRow(raw) {
  const zip = raw?.zipCode ?? raw?.zip ?? raw?.address?.zipCode ?? (raw?.address && typeof raw.address === "object" ? raw.address.zipCode : "") ?? "";
  const neighborhood = getNeighborhoodFromZip(zip);
  const address = raw?.formattedAddress ?? (typeof raw?.address === "string" ? raw.address : raw?.address?.line1 ?? raw?.address?.formatted ?? "") ?? raw?.street ?? "";
  const price = raw?.price ?? raw?.monthlyRent ?? raw?.rent;
  return {
    listing_id: getListingId(raw),
    address: address || null,
    street: address || null,
    zip_code: zip || null,
    neighborhood: neighborhood || null,
    price: price != null ? Number(price) : null,
    bedrooms: raw?.bedrooms ?? raw?.beds ?? null,
    bathrooms: raw?.bathrooms ?? raw?.baths ?? null,
    listed_date: raw?.listedDate ?? raw?.listed_date ?? null,
  };
}

export async function GET(request) {
  const cronSecret = request.headers.get("X-Cron-Secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mockMode = process.env.DIGEST_MOCK === "true";
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!mockMode && !apiKey) {
    return NextResponse.json({ error: "RENTCAST_API_KEY not configured" }, { status: 500 });
  }

  const { data: profiles } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, move_in_date, budget_max, bedrooms, neighborhoods")
    .not("move_in_date", "is", null)
    .not("budget_max", "is", null);

  const eligible = profiles?.length ?? 0;
  if (eligible === 0) {
    return NextResponse.json({
      used_cache: false,
      listings_available: 0,
      processed: 0,
      eligible: 0,
      emailed: 0,
      errors: [],
    });
  }

  const url = new URL(request.url);
  const testMode = url.searchParams.get("test") === "true";
  const profilesToProcess = testMode || mockMode ? profiles.slice(0, 1) : profiles;

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "LaunchNYC <hello@launchnyc.app>";
  const errors = [];
  let used_cache = false;
  let listings_available = 0;
  let processed = 0;
  let emailed = 0;

  let allListings = [];

  if (mockMode) {
    console.log("[digest] DIGEST_MOCK=true: using hardcoded mock listing, skipping RentCast and cache");
    allListings = MOCK_LISTING.map((l) => ({
      listing_id: getListingId(l),
      street: l.formattedAddress ?? l.addressLine1 ?? "",
      neighborhood: getNeighborhoodFromZip(l.zipCode) ?? "",
      price: l.price,
      beds: l.bedrooms,
      baths: l.bathrooms,
    }));
    listings_available = allListings.length;
  } else {
    const todayStart = getTodayStartUTC();
    const { data: cachedRows } = await supabaseAdmin
      .from("daily_listings")
      .select("listing_id, street, neighborhood, price, bedrooms, bathrooms")
      .gte("fetched_at", todayStart);

    if (cachedRows?.length > 0) {
      used_cache = true;
      listings_available = cachedRows.length;
      console.log("[digest] Using cached listings from today, skipping RentCast call.");
      allListings = cachedRows.map((r) => ({
        listing_id: r.listing_id,
        street: r.street ?? "",
        neighborhood: r.neighborhood ?? "",
        price: r.price,
        beds: r.bedrooms,
        baths: r.bathrooms,
      }));
    } else {
      const rentcastUrl = new URL("https://api.rentcast.io/v1/listings/rental/long-term");
      rentcastUrl.searchParams.set("city", "New York");
      rentcastUrl.searchParams.set("state", "NY");
      rentcastUrl.searchParams.set("limit", "50");
      try {
        const res = await fetch(rentcastUrl.toString(), { headers: { "X-Api-Key": apiKey } });
        if (!res.ok) {
          return NextResponse.json({
            used_cache: false,
            listings_available: 0,
            processed: 0,
            eligible,
            emailed: 0,
            errors: [{ error: `RentCast ${res.status}` }],
          });
        }
        const json = await res.json();
        const raw = Array.isArray(json) ? json : json?.listings ?? json?.data ?? [];
        const items = raw.filter((item) => item != null);
        await supabaseAdmin.from("daily_listings").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        const rows = items.map((l) => toDailyListingRow(l));
        if (rows.length > 0) {
          const { error: insertErr } = await supabaseAdmin.from("daily_listings").insert(
            rows.map((r) => ({
              listing_id: r.listing_id,
              address: r.address,
              street: r.street,
              zip_code: r.zip_code,
              neighborhood: r.neighborhood,
              price: r.price,
              bedrooms: r.bedrooms,
              bathrooms: r.bathrooms,
              listed_date: r.listed_date,
            }))
          );
          if (insertErr) console.error("[digest] daily_listings insert error:", insertErr.message);
        }
        listings_available = rows.length;
        allListings = rows.map((r) => ({
          listing_id: r.listing_id,
          street: r.street ?? "",
          neighborhood: r.neighborhood ?? "",
          price: r.price,
          beds: r.bedrooms,
          baths: r.bathrooms,
        }));
        console.log(`[digest] Fetched ${listings_available} fresh listings from RentCast, cached to DB.`);
      } catch (e) {
        return NextResponse.json({
          used_cache: false,
          listings_available: 0,
          processed: 0,
          eligible,
          emailed: 0,
          errors: [{ error: String(e?.message ?? e) }],
        });
      }
    }
  }

  for (const profile of profilesToProcess) {
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

    let toInsert = allListings;
    if (!mockMode) {
      const byPrice = budgetMax > 0 ? toInsert.filter((l) => l.price != null && l.price <= budgetMax) : toInsert;
      const byBedrooms = bedrooms != null ? byPrice.filter((l) => l.beds != null && Number(l.beds) === Number(bedrooms)) : byPrice;
      const byNeighborhood = targetNeighborhoods.length > 0
        ? byBedrooms.filter((l) => l.neighborhood && targetNeighborhoods.includes(l.neighborhood))
        : byBedrooms;

      const { data: sentRows } = await supabaseAdmin.from("digest_sent").select("listing_id").eq("user_id", userId);
      const sentIds = new Set((sentRows ?? []).map((r) => r.listing_id));

      const { data: existingApts } = await supabaseAdmin.from("apartments").select("street").eq("user_id", userId);
      const existingAddresses = new Set((existingApts ?? []).map((a) => normalizeAddress(a.street || "")));

      toInsert = byNeighborhood.filter((l) => {
        if (sentIds.has(l.listing_id)) return false;
        const addrNorm = normalizeAddress(l.street || "");
        if (addrNorm && existingAddresses.has(addrNorm)) return false;
        return true;
      });
    }

    if (toInsert.length === 0) {
      processed += 1;
      continue;
    }

    if (!mockMode) {
      for (const item of toInsert) {
        const { error: insertErr } = await supabaseAdmin.from("apartments").insert({
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
        if (!insertErr) {
          await supabaseAdmin.from("digest_sent").insert({ user_id: userId, listing_id: item.listing_id });
        }
      }
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
      const resendResult = await resend.emails.send({ from: fromEmail, to: email, subject, html });
      if (resendResult?.error) {
        errors.push({ userId, error: `Resend: ${resendResult.error?.message ?? resendResult.error}` });
      } else {
        emailed += 1;
      }
    } catch (e) {
      errors.push({ userId, error: `Resend: ${e?.message ?? e}` });
    }
    processed += 1;
  }

  return NextResponse.json({
    used_cache: mockMode ? false : used_cache,
    listings_available: listings_available,
    processed,
    eligible,
    emailed,
    errors: errors.length ? errors : [],
  });
}
