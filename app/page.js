"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

function PeopleIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 1 .41-1.412A9.957 9.957 0 0 1 10 13c2.31 0 4.438.784 6.131 2.08.43.332.52.957.09 1.387a1.23 1.23 0 0 1-1.412.41A7.957 7.957 0 0 0 10 15c-2.43 0-4.653.783-6.364 2.08a1.23 1.23 0 0 1-1.171-.587Z" />
    </svg>
  );
}

const NEIGHBORHOODS = [
  "West Village",
  "East Village",
  "Lower East Side",
  "SoHo",
  "Tribeca",
  "Nolita",
  "Greenwich Village",
  "Chelsea",
  "Gramercy",
  "Murray Hill",
  "Upper East Side",
  "Upper West Side",
  "Harlem",
  "Washington Heights",
  "Williamsburg",
  "Greenpoint",
  "DUMBO",
  "Brooklyn Heights",
  "Cobble Hill",
  "Carroll Gardens",
  "Park Slope",
  "Crown Heights",
  "Bed-Stuy",
  "Bushwick",
  "Ridgewood",
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

export default function MySearchPage() {
  const { user, isGuest, openOnboardingModal, openSignUpModal } = useAuth();
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
    roommates: [],
  });
  const [roommatesEditing, setRoommatesEditing] = useState(false);
  const [roommatesForm, setRoommatesForm] = useState([""]);
  const [roommatesSaving, setRoommatesSaving] = useState(false);
  const [invites, setInvites] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setProfile(data ?? null);
    if (data) {
      setForm({
        budget_max: data.budget_max != null ? String(data.budget_max) : "",
        move_in_date: data.move_in_date ?? "",
        bedrooms: data.bedrooms ?? null,
        num_people: data.num_people ?? null,
        neighborhoods: Array.isArray(data.neighborhoods) ? data.neighborhoods : [],
        roommates: Array.isArray(data.roommates) ? data.roommates : [],
      });
      const r = Array.isArray(data.roommates) ? data.roommates : [];
      setRoommatesForm(r.length > 0 ? [...r, ""] : [""]);
    }
  }, [user?.id]);

  const fetchApartments = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("apartments")
      .select("id, status")
      .eq("user_id", user.id);
    setApartments(Array.isArray(data) ? data : []);
  }, [user?.id]);

  const fetchInvites = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("search_invites")
      .select("id, invitee_email, status, created_at")
      .eq("inviter_id", user.id)
      .order("created_at", { ascending: false });
    setInvites(Array.isArray(data) ? data : []);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || isGuest) {
      setLoading(false);
      return;
    }
    Promise.all([fetchProfile(), fetchApartments(), fetchInvites()]).finally(
      () => setLoading(false)
    );
  }, [user?.id, isGuest, fetchProfile, fetchApartments, fetchInvites]);

  useEffect(() => {
    const handler = () => {
      fetchProfile();
    };
    window.addEventListener("onboarding-complete", handler);
    return () => window.removeEventListener("onboarding-complete", handler);
  }, [fetchProfile]);

  async function handleSave() {
    if (!user?.id || !profile) return;
    setSaving(true);
    try {
      const payload = {
        budget_max: form.budget_max ? Number(form.budget_max) : null,
        move_in_date: form.move_in_date || null,
        bedrooms: form.bedrooms,
        num_people: form.num_people,
        neighborhoods:
          form.neighborhoods.length > 0 ? form.neighborhoods : null,
        roommates: form.roommates.length > 0 ? form.roommates : null,
      };
      const { error } = await supabase
        .from("user_profiles")
        .update(payload)
        .eq("user_id", user.id);
      if (!error) {
        setProfile((prev) => (prev ? { ...prev, ...payload } : null));
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

  async function handleSaveRoommates() {
    if (!user?.id) return;
    setRoommatesSaving(true);
    const names = roommatesForm.map((s) => String(s).trim()).filter(Boolean);
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ roommates: names.length > 0 ? names : null })
        .eq("user_id", user.id);
      if (!error) {
        setForm((f) => ({ ...f, roommates: names }));
        setProfile((p) => (p ? { ...p, roommates: names } : null));
        setRoommatesForm(names.length > 0 ? [...names, ""] : [""]);
        setRoommatesEditing(false);
      }
    } finally {
      setRoommatesSaving(false);
    }
  }

  function startRoommatesEdit() {
    const r = form.roommates.length ? [...form.roommates, ""] : [""];
    setRoommatesForm(r);
    setRoommatesEditing(true);
  }

  async function handleSendInvite(e) {
    e.preventDefault();
    const email = inviteEmail?.trim();
    if (!user?.id || !email) return;
    setSendingInvite(true);
    try {
      const { error } = await supabase.from("search_invites").insert({
        inviter_id: user.id,
        invitee_email: email,
        status: "pending",
      });
      if (!error) {
        setInviteEmail("");
        await fetchInvites();
      }
    } finally {
      setSendingInvite(false);
    }
  }

  const byStatus = (status) =>
    apartments.filter((a) => (a.status || "saved").toLowerCase() === status);
  const saved = byStatus("saved");
  const touring = byStatus("touring");
  const applying = byStatus("applying");
  const signed = byStatus("signed");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6f9]">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (isGuest) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f6f9] px-6 py-12">
        <p className="mb-6 max-w-sm text-center text-sm text-zinc-600">
          Sign up to save your search profile, track apartments, and get AI advice tailored to you.
        </p>
        <button
          type="button"
          onClick={openSignUpModal}
          className="rounded-xl bg-[#001f3f] px-8 py-4 text-base font-semibold text-white transition-opacity hover:opacity-90"
        >
          Create Your Free Account
        </button>
      </div>
    );
  }

  const accountTier = profile?.tier === "pro" ? "pro" : "free";

  return (
    <div className="min-h-screen bg-[#f4f6f9] px-6 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-xl font-semibold text-[#001f3f]">
          My Account
        </h1>

        <div className="rounded-xl border border-[#dde2ea] bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-[#001f3f]">Account</h2>
          <p className="mt-2 text-sm text-zinc-600">
            {user?.email ?? "—"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                accountTier === "pro"
                  ? "bg-amber-400/30 text-[#001f3f] border border-amber-500/50"
                  : "bg-zinc-100 text-zinc-600 border border-zinc-200"
              }`}
            >
              {accountTier === "pro" ? "Pro" : "Free Plan"}
            </span>
            {accountTier === "free" && (
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                <Link
                  href="/account#billing"
                  className="rounded-lg bg-[#001f3f] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 no-underline"
                >
                  Upgrade to Pro →
                </Link>
                <span className="text-xs text-zinc-500">
                  Unlock unlimited AI, daily listing alerts, and PDF exports
                </span>
              </div>
            )}
          </div>
        </div>

        {!profile ? (
          <div className="rounded-xl border border-[#dde2ea] bg-white p-8 text-center shadow-sm">
            <p className="text-zinc-600">You haven&apos;t set up your search yet.</p>
            <button
              type="button"
              onClick={openOnboardingModal}
              className="mt-4 rounded-lg bg-[#001f3f] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Set Up Now
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-[#dde2ea] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#001f3f]">
                  Search preferences
                </h2>
                {!editing ? (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="rounded-lg bg-[#001f3f] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {!editing ? (
                <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium text-zinc-500">
                      Monthly budget
                    </dt>
                    <dd className="mt-0.5 text-sm text-[#001f3f]">
                      {profile.budget_max != null
                        ? `$${Number(profile.budget_max).toLocaleString()}/mo`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-zinc-500">
                      Move-in date
                    </dt>
                    <dd className="mt-0.5 text-sm text-[#001f3f]">
                      {formatDate(profile.move_in_date)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-zinc-500">
                      Bedrooms
                    </dt>
                    <dd className="mt-0.5 text-sm text-[#001f3f]">
                      {profile.bedrooms != null
                        ? profile.bedrooms >= 4
                          ? "4+"
                          : profile.bedrooms
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-zinc-500">
                      Number of people
                    </dt>
                    <dd className="mt-0.5 text-sm text-[#001f3f]">
                      {profile.num_people != null
                        ? profile.num_people >= 4
                          ? "4+"
                          : profile.num_people
                        : "—"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-zinc-500">
                      Target neighborhoods
                    </dt>
                    <dd className="mt-1.5 flex flex-wrap gap-2">
                      {Array.isArray(profile.neighborhoods) &&
                      profile.neighborhoods.length > 0 ? (
                        profile.neighborhoods.map((n) => (
                          <span
                            key={n}
                            className="inline-flex rounded-full bg-[#eef2f9] px-3 py-1 text-xs font-medium text-[#001f3f]"
                          >
                            {n}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-zinc-400">—</span>
                      )}
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="mt-6 space-y-4">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-zinc-600">
                      Monthly budget ($/mo)
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={form.budget_max}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, budget_max: e.target.value }))
                      }
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-[#001f3f] focus:border-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#001f3f]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-zinc-600">
                      Move-in date
                    </span>
                    <input
                      type="date"
                      value={form.move_in_date}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, move_in_date: e.target.value }))
                      }
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-[#001f3f] focus:border-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#001f3f]"
                    />
                  </label>
                  <div>
                    <span className="mb-2 block text-xs font-medium text-zinc-600">
                      Bedrooms
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, "4+"].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              bedrooms: n === "4+" ? 4 : n,
                            }))
                          }
                          className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                            form.bedrooms === (n === "4+" ? 4 : n)
                              ? "border-[#001f3f] bg-[#001f3f] text-white"
                              : "border-zinc-300 text-zinc-700 hover:border-zinc-400"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="mb-2 block text-xs font-medium text-zinc-600">
                      People (including you)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, "4+"].map((n) => {
                        const val = n === "4+" ? 4 : n;
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() =>
                              setForm((f) => ({ ...f, num_people: val }))
                            }
                            className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                              form.num_people === val
                                ? "border-[#001f3f] bg-[#001f3f] text-white"
                                : "border-zinc-300 text-zinc-700 hover:border-zinc-400"
                            }`}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <span className="mb-2 block text-xs font-medium text-zinc-600">
                      Neighborhoods
                    </span>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {NEIGHBORHOODS.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => toggleNeighborhood(name)}
                          className={`rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                            form.neighborhoods.includes(name)
                              ? "border-[#001f3f] bg-[#001f3f] text-white"
                              : "border-zinc-300 text-zinc-700 hover:border-zinc-400"
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[#dde2ea] bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-[#001f3f]">
                Your roommates
              </h2>
              {!roommatesEditing ? (
                <>
                  {form.roommates.length > 0 ? (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {form.roommates.map((name, i) => (
                        <li
                          key={i}
                          className="inline-flex rounded-full bg-[#eef2f9] px-3 py-1 text-sm font-medium text-[#001f3f]"
                        >
                          {name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-500">
                      No roommates added yet
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={startRoommatesEdit}
                    className="mt-3 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    {form.roommates.length > 0 ? "Edit roommates" : "Add roommates"}
                  </button>
                </>
              ) : (
                <div className="mt-4 space-y-2">
                  {roommatesForm.map((name, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) =>
                          setRoommatesForm((prev) =>
                            prev.map((n, j) => (j === i ? e.target.value : n))
                          )
                        }
                        placeholder="First name"
                        className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-[#001f3f] placeholder-zinc-400 focus:border-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#001f3f]"
                      />
                      {i === roommatesForm.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => setRoommatesForm((p) => [...p, ""])}
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50"
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
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50"
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
                      className="rounded-lg bg-[#001f3f] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {roommatesSaving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRoommatesEditing(false);
                        setRoommatesForm(
                          form.roommates.length > 0 ? [...form.roommates, ""] : [""]
                        );
                      }}
                      className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[#dde2ea] bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-[#001f3f]">
                Your board
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-[#f4f6f9] p-4">
                  <div className="text-2xl font-semibold text-[#001f3f]">
                    {apartments.length}
                  </div>
                  <div className="text-xs text-zinc-500">Total saved</div>
                </div>
                <div className="rounded-lg bg-[#f4f6f9] p-4">
                  <div className="text-2xl font-semibold text-[#001f3f]">
                    {saved.length}
                  </div>
                  <div className="text-xs text-zinc-500">Saved</div>
                </div>
                <div className="rounded-lg bg-[#f4f6f9] p-4">
                  <div className="text-2xl font-semibold text-[#001f3f]">
                    {touring.length}
                  </div>
                  <div className="text-xs text-zinc-500">Touring</div>
                </div>
                <div className="rounded-lg bg-[#f4f6f9] p-4">
                  <div className="text-2xl font-semibold text-[#001f3f]">
                    {applying.length}
                  </div>
                  <div className="text-xs text-zinc-500">Applying</div>
                </div>
                <div className="rounded-lg bg-[#f4f6f9] p-4 sm:col-span-2 sm:col-start-2">
                  <div className="text-2xl font-semibold text-[#001f3f]">
                    {signed.length}
                  </div>
                  <div className="text-xs text-zinc-500">Signed</div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="rounded-xl border border-[#dde2ea] bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#001f3f]">
            <PeopleIcon className="h-4 w-4 text-zinc-500" />
            Search Collaborators
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Searching with friends? Add them to share your board
          </p>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-[#dde2ea] bg-[#f4f6f9] px-4 py-3">
              <span className="text-sm text-[#001f3f]">{user?.email ?? "—"}</span>
              <span className="rounded-full bg-[#001f3f] px-2.5 py-0.5 text-xs font-medium text-white">
                You
              </span>
            </div>
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-lg border border-[#dde2ea] px-4 py-3"
              >
                <span className="text-sm text-zinc-700">{inv.invitee_email}</span>
                <span className="text-xs text-zinc-500 capitalize">{inv.status}</span>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendInvite} className="mt-4 flex gap-2">
            <input
              type="email"
              placeholder="Invite a collaborator"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-[#001f3f] placeholder:text-zinc-400 focus:border-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#001f3f]"
            />
            <button
              type="submit"
              disabled={sendingInvite || !inviteEmail?.trim()}
              className="rounded-lg bg-[#001f3f] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {sendingInvite ? "Sending…" : "Send Invite"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
