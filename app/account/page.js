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
  const [roommatesEditing, setRoommatesEditing] = useState(false);
  const [roommatesForm, setRoommatesForm] = useState([""]);
  const [roommatesSaving, setRoommatesSaving] = useState(false);

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
      const emails = Array.isArray(data.roommate_emails) ? data.roommate_emails : [];
      setRoommatesForm(emails.length > 0 ? [...emails, ""] : [""]);
    } else {
      setForm({
        budget_max: "",
        move_in_date: "",
        bedrooms: null,
        num_people: null,
        neighborhoods: [],
      });
      setRoommatesForm([""]);
    }
  }, [user?.id, isGuest]);

  async function handleSaveRoommates() {
    if (!user?.id) return;
    setRoommatesSaving(true);
    const emails = roommatesForm.map((s) => String(s).trim()).filter(Boolean);
    try {
      const { error } = await supabase
        .from("user_profiles")
        .upsert(
          { user_id: user.id, roommate_emails: emails.length > 0 ? emails : null },
          { onConflict: "user_id" }
        )
        .select();
      if (!error) {
        setProfile((p) => (p ? { ...p, roommate_emails: emails } : { user_id: user.id, roommate_emails: emails }));
        setRoommatesForm(emails.length > 0 ? [...emails, ""] : [""]);
        setRoommatesEditing(false);
      }
    } finally {
      setRoommatesSaving(false);
    }
  }

  function startRoommatesEdit() {
    const emails = Array.isArray(profile?.roommate_emails) ? profile.roommate_emails : [];
    setRoommatesForm(emails.length > 0 ? [...emails, ""] : [""]);
    setRoommatesEditing(true);
  }

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

        {/* My Search Profile */}
        <section className={`mt-8 ${cardClass}`}>
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

        {/* Your Roommates */}
        <section className={`mt-6 ${cardClass}`}>
          <h2 className="text-base font-semibold text-[#001f3f]">Your Roommates</h2>
          {!roommatesEditing ? (
            <>
              {Array.isArray(profile?.roommate_emails) && profile.roommate_emails.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {profile.roommate_emails.map((email, i) => (
                    <li
                      key={i}
                      className="inline-flex rounded-full bg-[#f0f4f8] px-2.5 py-0.5 text-xs font-medium text-[#001f3f]"
                    >
                      {email}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-[#6b7280]">No roommates added yet</p>
              )}
              <button
                type="button"
                onClick={startRoommatesEdit}
                className="mt-3 rounded-lg border border-[#d1d5db] px-3 py-1.5 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
              >
                Edit
              </button>
            </>
          ) : (
            <div className="mt-4 space-y-2">
              {roommatesForm.map((email, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setRoommatesForm((prev) =>
                        prev.map((em, j) => (j === i ? e.target.value : em))
                      )
                    }
                    placeholder="roommate@email.com"
                    className="flex-1 rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#001f3f] placeholder-[#9ca3af] focus:border-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#001f3f]"
                  />
                  {i === roommatesForm.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setRoommatesForm((p) => [...p, ""])}
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[#d1d5db] text-[#6b7280] hover:bg-[#f9fafb]"
                      aria-label="Add another"
                    >
                      +
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setRoommatesForm((p) => p.filter((_, j) => j !== i))
                      }
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[#d1d5db] text-[#6b7280] hover:bg-[#f9fafb]"
                      aria-label="Remove"
                    >
                      −
                    </button>
                  )}
                </div>
              ))}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveRoommates}
                  disabled={roommatesSaving}
                  className="rounded-lg bg-[#001f3f] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {roommatesSaving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRoommatesEditing(false);
                    const emails = Array.isArray(profile?.roommate_emails) ? profile.roommate_emails : [];
                    setRoommatesForm(emails.length > 0 ? [...emails, ""] : [""]);
                  }}
                  className="rounded-lg border border-[#d1d5db] px-3 py-1.5 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
                >
                  Cancel
                </button>
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
