"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import GuestPreviewBanner from "@/components/GuestPreviewBanner";

const NEIGHBORHOODS = [
  "West Village", "East Village", "Lower East Side", "SoHo", "Tribeca", "Nolita",
  "Greenwich Village", "Chelsea", "Gramercy", "Murray Hill", "Upper East Side", "Upper West Side",
  "Harlem", "Washington Heights", "Williamsburg", "Greenpoint", "DUMBO", "Brooklyn Heights",
  "Cobble Hill", "Carroll Gardens", "Park Slope", "Crown Heights", "Bed-Stuy", "Bushwick", "Ridgewood",
];

function formatDate(value) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const cardClass = "rounded-xl border border-[#e0e0e0] bg-white p-6";

export default function AccountPage() {
  const { user, isGuest, openSignUpModal } = useAuth();
  const [profile, setProfile] = useState(null);
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    budget_max: "",
    move_in_date: "",
    bedrooms: null,
    num_people: null,
    neighborhoods: [],
  });

  const fetchData = useCallback(async () => {
    if (!user?.id || isGuest) return;
    const [profileRes, aptRes] = await Promise.all([
      supabase.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("apartments").select("id, status").eq("user_id", user.id),
    ]);
    setProfile(profileRes.data ?? null);
    const aptList = Array.isArray(aptRes.data) ? aptRes.data : [];
    setApartments(aptList);
    const data = profileRes.data;
    if (data) {
      setForm({
        budget_max: data.budget_max != null ? String(data.budget_max) : "",
        move_in_date: data.move_in_date ?? "",
        bedrooms: data.bedrooms ?? null,
        num_people: data.num_people ?? null,
        neighborhoods: Array.isArray(data.neighborhoods) ? data.neighborhoods : [],
      });
    } else {
      setForm({
        budget_max: "",
        move_in_date: "",
        bedrooms: null,
        num_people: null,
        neighborhoods: [],
      });
    }
  }, [user?.id, isGuest]);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const stats = {
    total: apartments.length,
    saved: apartments.filter((a) => (a.status || "saved").toLowerCase() === "saved").length,
    touring: apartments.filter((a) => (a.status || "").toLowerCase() === "touring").length,
    applying: apartments.filter((a) => (a.status || "").toLowerCase() === "applying").length,
    signed: apartments.filter((a) => (a.status || "").toLowerCase() === "signed").length,
  };

  async function handleSaveProfile() {
    if (!user?.id) return;
    setSaving(true);
    try {
      const rawDate = form.move_in_date?.trim?.() || form.move_in_date;
      const moveInDateStr =
        rawDate
          ? typeof rawDate === "string"
            ? rawDate
            : new Date(rawDate).toISOString().slice(0, 10)
          : null;
      const payload = {
        user_id: user.id,
        budget_max: form.budget_max ? Number(form.budget_max) : null,
        move_in_date: moveInDateStr,
        bedrooms: form.bedrooms,
        num_people: form.num_people,
        neighborhoods: form.neighborhoods.length > 0 ? form.neighborhoods : null,
      };
      const { error } = await supabase
        .from("user_profiles")
        .upsert(payload, { onConflict: "user_id" });
      if (!error) {
        setProfile((prev) => (prev ? { ...prev, ...payload } : payload));
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  function toggleNeighborhood(name) {
    setForm((prev) => ({
      ...prev,
      neighborhoods: prev.neighborhoods.includes(name)
        ? prev.neighborhoods.filter((n) => n !== name)
        : [...prev.neighborhoods, name],
    }));
  }

  const hasProfile =
    profile &&
    (profile.budget_max != null ||
      profile.move_in_date ||
      (Array.isArray(profile.neighborhoods) && profile.neighborhoods.length > 0) ||
      profile.bedrooms != null ||
      profile.num_people != null);

  if (isGuest) {
    return (
      <div className="min-h-screen w-full bg-[#f5f5f5]">
        <GuestPreviewBanner />
        <main className="mx-auto max-w-2xl px-6 py-12">
          <h1 className="text-2xl font-semibold text-[#001f3f]">My Account</h1>
          <p className="mt-2 text-sm text-[#6b7280]">
            You're viewing as a guest. Create an account to save your progress.
          </p>
          <button
            type="button"
            onClick={openSignUpModal}
            className="mt-6 rounded-lg bg-[#001f3f] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Sign up
          </button>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#f5f5f5]">
        <p className="text-sm text-[#6b7280]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#f5f5f5]">
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-[#001f3f]">My Account</h1>
        <p className="mt-1 text-sm text-[#6b7280]">{user?.email ?? ""}</p>

        {/* Plan & Billing */}
        <section className={`mt-8 ${cardClass}`}>
          <h2 className="text-base font-semibold text-[#001f3f]">Plan & Billing</h2>
          <p className="mt-2 text-sm text-[#6b7280]">Current plan</p>
          <p className="mt-0.5 text-lg font-medium text-[#001f3f]">Free Plan</p>
          <ul className="mt-4 space-y-1.5 text-sm text-[#374151]">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#22c55e]" aria-hidden />
              Board
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#22c55e]" aria-hidden />
              Documents
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#22c55e]" aria-hidden />
              Timeline (Search HQ)
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#22c55e]" aria-hidden />
              3 AI advisor messages per month
            </li>
          </ul>
          <button
            type="button"
            className="mt-6 rounded-lg bg-[#001f3f] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Upgrade to Pro
          </button>
          <div className="mt-6 border-t border-[#e5e7eb] pt-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[#6b7280]">Pro includes</p>
            <ul className="mt-2 space-y-1.5 text-sm text-[#374151]">
              <li><strong>Unlimited AI Advisor</strong> — get real-time advice tailored to your exact search</li>
              <li><strong>Daily Listing Alerts</strong> — new apartments matching your criteria sent every morning</li>
              <li><strong>Unlimited Application Package Exports</strong> — generate and send your full renter package instantly</li>
              <li><strong>Priority Support</strong> — get help when it matters most</li>
            </ul>
          </div>
        </section>

        {/* My Search Profile */}
        <section className={`mt-6 ${cardClass}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#001f3f]">My Search Profile</h2>
            {hasProfile && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-lg border border-[#d1d5db] px-3 py-1.5 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
              >
                Edit
              </button>
            )}
            {editing && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="rounded-lg bg-[#001f3f] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-[#d1d5db] px-3 py-1.5 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {!hasProfile && !editing ? (
            <p className="mt-4 text-sm text-[#6b7280]">
              Set up your search to get personalized results.{" "}
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="font-medium text-[#001f3f] underline hover:no-underline"
              >
                Set Up Your Search
              </button>
            </p>
          ) : !editing ? (
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-[#6b7280]">Budget</dt>
                <dd className="mt-0.5 text-sm text-[#001f3f]">
                  {profile.budget_max != null ? `$${Number(profile.budget_max).toLocaleString()}/mo` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[#6b7280]">Move-in date</dt>
                <dd className="mt-0.5 text-sm text-[#001f3f]">{formatDate(profile.move_in_date)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[#6b7280]">Bedrooms</dt>
                <dd className="mt-0.5 text-sm text-[#001f3f]">
                  {profile.bedrooms != null ? (profile.bedrooms >= 4 ? "4+" : profile.bedrooms) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[#6b7280]">People</dt>
                <dd className="mt-0.5 text-sm text-[#001f3f]">
                  {profile.num_people != null ? (profile.num_people >= 4 ? "4+" : profile.num_people) : "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-[#6b7280]">Target neighborhoods</dt>
                <dd className="mt-1.5 flex flex-wrap gap-2">
                  {Array.isArray(profile.neighborhoods) && profile.neighborhoods.length > 0 ? (
                    profile.neighborhoods.map((n) => (
                      <span
                        key={n}
                        className="inline-flex rounded-full bg-[#f0f4f8] px-2.5 py-0.5 text-xs font-medium text-[#001f3f]"
                      >
                        {n}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[#9ca3af]">—</span>
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#6b7280]">Monthly budget ($/mo)</span>
                <input
                  type="number"
                  min={0}
                  value={form.budget_max}
                  onChange={(e) => setForm((f) => ({ ...f, budget_max: e.target.value }))}
                  className="w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#001f3f] focus:border-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#001f3f]"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#6b7280]">Move-in date</span>
                <input
                  type="date"
                  value={form.move_in_date}
                  onChange={(e) => setForm((f) => ({ ...f, move_in_date: e.target.value }))}
                  className="w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#001f3f] focus:border-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#001f3f]"
                />
              </label>
              <div>
                <span className="mb-2 block text-xs font-medium text-[#6b7280]">Bedrooms</span>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, "4+"].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, bedrooms: n === "4+" ? 4 : n }))}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                        form.bedrooms === (n === "4+" ? 4 : n)
                          ? "border-[#001f3f] bg-[#001f3f] text-white"
                          : "border-[#d1d5db] text-[#374151] hover:border-[#9ca3af]"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="mb-2 block text-xs font-medium text-[#6b7280]">People (including you)</span>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, "4+"].map((n) => {
                    const val = n === "4+" ? 4 : n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, num_people: val }))}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                          form.num_people === val
                            ? "border-[#001f3f] bg-[#001f3f] text-white"
                            : "border-[#d1d5db] text-[#374151] hover:border-[#9ca3af]"
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <span className="mb-2 block text-xs font-medium text-[#6b7280]">Neighborhoods</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {NEIGHBORHOODS.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleNeighborhood(name)}
                      className={`rounded-lg border px-3 py-2 text-left text-sm font-medium ${
                        form.neighborhoods.includes(name)
                          ? "border-[#001f3f] bg-[#001f3f] text-white"
                          : "border-[#d1d5db] text-[#374151] hover:border-[#9ca3af]"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Search Stats */}
        <section className={`mt-6 ${cardClass}`}>
          <h2 className="text-base font-semibold text-[#001f3f]">Search Stats</h2>
          <p className="mt-2 text-sm text-[#6b7280]">Apartments saved and tracked</p>
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="rounded-lg bg-[#f5f5f5] px-4 py-3">
              <p className="text-2xl font-semibold text-[#001f3f]">{stats.total}</p>
              <p className="text-xs font-medium text-[#6b7280]">Total saved</p>
            </div>
            <div className="rounded-lg bg-[#f5f5f5] px-4 py-3">
              <p className="text-2xl font-semibold text-[#001f3f]">{stats.saved}</p>
              <p className="text-xs font-medium text-[#6b7280]">Saved</p>
            </div>
            <div className="rounded-lg bg-[#f5f5f5] px-4 py-3">
              <p className="text-2xl font-semibold text-[#001f3f]">{stats.touring}</p>
              <p className="text-xs font-medium text-[#6b7280]">Touring</p>
            </div>
            <div className="rounded-lg bg-[#f5f5f5] px-4 py-3">
              <p className="text-2xl font-semibold text-[#001f3f]">{stats.applying}</p>
              <p className="text-xs font-medium text-[#6b7280]">Applying</p>
            </div>
            <div className="rounded-lg bg-[#f5f5f5] px-4 py-3">
              <p className="text-2xl font-semibold text-[#22c55e]">{stats.signed}</p>
              <p className="text-xs font-medium text-[#6b7280]">Signed</p>
            </div>
          </div>
          <Link
            href="/board"
            className="mt-4 inline-block text-sm font-medium text-[#001f3f] underline hover:no-underline"
          >
            View board →
          </Link>
        </section>
      </main>
    </div>
  );
}
