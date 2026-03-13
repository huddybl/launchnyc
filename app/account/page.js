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
  const [myGroup, setMyGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [createGroupName, setCreateGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [createGroupLoading, setCreateGroupLoading] = useState(false);
  const [joinGroupLoading, setJoinGroupLoading] = useState(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [groupError, setGroupError] = useState(null);
  const [groupNameEditing, setGroupNameEditing] = useState(false);
  const [groupNameEditValue, setGroupNameEditValue] = useState("");
  const [copyLinkFeedback, setCopyLinkFeedback] = useState(false);
  const [leaveGroupLoading, setLeaveGroupLoading] = useState(false);
  const [removingUserId, setRemovingUserId] = useState(null);
  const [groupNameSaving, setGroupNameSaving] = useState(false);
  const [groupInvites, setGroupInvites] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id || isGuest) return;
    if (user.email) {
      await supabase.from("user_profiles").upsert(
        { user_id: user.id, email: user.email },
        { onConflict: "user_id" }
      );
    }
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

  const fetchMyGroup = useCallback(async () => {
    if (!user?.id || isGuest) {
      setMyGroup(null);
      setGroupMembers([]);
      return;
    }
    const { data: membership } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership?.group_id) {
      setMyGroup(null);
      setGroupMembers([]);
      setGroupInvites([]);
      return;
    }
    const { data: group } = await supabase
      .from("search_groups")
      .select("id, name, invite_code, created_by")
      .eq("id", membership.group_id)
      .single();
    setMyGroup(group ?? null);
    if (!group) {
      setGroupMembers([]);
      setGroupInvites([]);
      return;
    }
    const { data: members } = await supabase
      .from("group_members")
      .select("user_id, joined_at")
      .eq("group_id", group.id)
      .order("joined_at", { ascending: true });
    const memberList = members ?? [];
    if (memberList.length === 0) {
      setGroupMembers([]);
      return;
    }
    const userIds = memberList.map((m) => m.user_id).filter(Boolean);
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);
    const byId = {};
    (profiles ?? []).forEach((p) => { byId[p.user_id] = p; });
    setGroupMembers(
      memberList.map((m) => ({
        user_id: m.user_id,
        joined_at: m.joined_at,
        full_name: byId[m.user_id]?.full_name ?? null,
        email: byId[m.user_id]?.email ?? null,
      }))
    );
    const { data: invites } = await supabase
      .from("group_invites")
      .select("id, invited_email, status, created_at")
      .eq("group_id", group.id)
      .order("created_at", { ascending: false });
    setGroupInvites(invites ?? []);
  }, [user?.id, isGuest]);

  useEffect(() => {
    fetchMyGroup();
  }, [fetchMyGroup]);

  async function handleSendInvite(e) {
    e.preventDefault();
    if (!myGroup?.id || !user?.id || !inviteEmail.trim()) return;
    setGroupError(null);
    setInviteSuccess(false);
    setSendingInvite(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const body = {
        invited_email: inviteEmail.trim(),
        group_id: myGroup.id,
        group_name: myGroup.name ?? "Unnamed group",
        inviter_email: user.email ?? "",
      };
      console.log("[Send Invite] calling POST /api/invite", body);
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      console.log("[Send Invite] response", res.status, data);
      if (!res.ok) {
        setGroupError(data?.error ?? "Failed to send invite");
        return;
      }
      setInviteEmail("");
      setInviteSuccess(true);
      await fetchMyGroup();
    } finally {
      setSendingInvite(false);
    }
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    if (!user?.id || !createGroupName.trim()) return;
    setGroupError(null);
    setCreateGroupLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ name: createGroupName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGroupError(data?.error ?? "Failed to create group");
        return;
      }
      setCreateGroupName("");
      setShowCreateInput(false);
      await fetchMyGroup();
    } finally {
      setCreateGroupLoading(false);
    }
  }

  async function handleJoinGroup(e) {
    e.preventDefault();
    if (!user?.id || !joinCode.trim()) return;
    setGroupError(null);
    setJoinGroupLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ invite_code: joinCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGroupError(data?.error ?? "Failed to join group");
        return;
      }
      setJoinCode("");
      setShowJoinInput(false);
      await fetchMyGroup();
    } finally {
      setJoinGroupLoading(false);
    }
  }

  const isGroupCreator = myGroup?.created_by === user?.id;

  async function handleUpdateGroupName(e) {
    e.preventDefault();
    if (!myGroup?.id || !user?.id || myGroup.created_by !== user.id) return;
    const name = groupNameEditValue.trim();
    if (!name) return;
    setGroupError(null);
    setGroupNameSaving(true);
    try {
      const { error } = await supabase
        .from("search_groups")
        .update({ name })
        .eq("id", myGroup.id)
        .eq("created_by", user.id);
      if (error) {
        setGroupError(error.message);
        return;
      }
      setMyGroup((g) => (g ? { ...g, name } : null));
      setGroupNameEditing(false);
    } finally {
      setGroupNameSaving(false);
    }
  }

  function handleCopyInviteLink() {
    if (!myGroup?.invite_code) return;
    const url = `https://launchnyc.vercel.app/join/${myGroup.invite_code}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopyLinkFeedback(true);
      setTimeout(() => setCopyLinkFeedback(false), 2000);
    });
  }

  async function handleRemoveMember(memberUserId) {
    if (!myGroup?.id || myGroup.created_by !== user?.id || memberUserId === user.id) return;
    setGroupError(null);
    setRemovingUserId(memberUserId);
    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", myGroup.id)
        .eq("user_id", memberUserId);
      if (error) {
        setGroupError(error.message);
        return;
      }
      await fetchMyGroup();
    } finally {
      setRemovingUserId(null);
    }
  }

  async function handleLeaveGroup() {
    if (!myGroup?.id || !user?.id) return;
    const otherMembers = groupMembers.filter((m) => m.user_id !== user.id);
    if (isGroupCreator && otherMembers.length > 0) {
      setGroupError("You'll need to assign a new owner or remove all members first.");
      return;
    }
    setGroupError(null);
    setLeaveGroupLoading(true);
    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", myGroup.id)
        .eq("user_id", user.id);
      if (error) {
        setGroupError(error.message);
        return;
      }
      setMyGroup(null);
      setGroupMembers([]);
    } finally {
      setLeaveGroupLoading(false);
    }
  }

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

        {/* Your Group */}
        <section className={`mt-6 ${cardClass}`}>
          <h2 className="text-base font-semibold text-[#001f3f]">Your Group</h2>
          {groupError && (
            <p className="mt-2 text-sm text-red-600">{groupError}</p>
          )}
          {myGroup ? (
            <>
              <div className="mt-3 flex items-center gap-2">
                {groupNameEditing ? (
                  <form onSubmit={handleUpdateGroupName} className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={groupNameEditValue}
                      onChange={(e) => setGroupNameEditValue(e.target.value)}
                      className="flex-1 rounded-lg border border-[#d1d5db] px-3 py-1.5 text-lg font-bold text-[#001f3f] focus:border-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#001f3f]"
                      placeholder="Group name"
                    />
                    <button
                      type="submit"
                      disabled={groupNameSaving || !groupNameEditValue.trim()}
                      className="rounded-lg bg-[#001f3f] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {groupNameSaving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setGroupNameEditing(false); setGroupNameEditValue(myGroup.name || ""); setGroupError(null); }}
                      className="rounded-lg border border-[#d1d5db] px-3 py-1.5 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-[#001f3f]">{myGroup.name || "Unnamed group"}</h3>
                    {isGroupCreator && (
                      <button
                        type="button"
                        onClick={() => { setGroupNameEditValue(myGroup.name || ""); setGroupNameEditing(true); setGroupError(null); }}
                        className="rounded-lg border border-[#d1d5db] px-2.5 py-1 text-xs font-medium text-[#374151] hover:bg-[#f9fafb]"
                      >
                        Edit name
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="mt-4">
                <p className="text-xs font-medium text-[#6b7280]">Invite a roommate</p>
                <form onSubmit={handleSendInvite} className="mt-1 flex flex-wrap items-center gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => { setInviteEmail(e.target.value); setInviteSuccess(false); setGroupError(null); }}
                    placeholder="roommate@email.com"
                    className="rounded-lg border border-[#d1d5db] px-3 py-1.5 text-sm text-[#001f3f] placeholder-[#9ca3af] focus:border-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#001f3f]"
                  />
                  <button
                    type="submit"
                    disabled={sendingInvite || !inviteEmail.trim()}
                    className="rounded-lg bg-[#001f3f] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {sendingInvite ? "Sending…" : "Send Invite"}
                  </button>
                </form>
                {inviteSuccess && (
                  <p className="mt-2 text-sm font-medium text-green-600">Invite sent!</p>
                )}
                {groupError && (
                  <p className="mt-2 text-sm text-red-600">{groupError}</p>
                )}
              </div>

              {groupInvites.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-[#6b7280]">Pending invites</p>
                  <ul className="mt-2 space-y-1.5">
                    {groupInvites.map((inv) => (
                      <li
                        key={inv.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-3 py-2"
                      >
                        <span className="text-sm text-[#001f3f]">{inv.invited_email}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            inv.status === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : inv.status === "accepted"
                                ? "bg-green-100 text-green-800"
                                : "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4">
                <p className="text-xs font-medium text-[#6b7280]">Invite link</p>
                <p className="mt-0.5 text-xs text-[#6b7280]">
                  Share this link with roommates who don&apos;t have an account yet.
                </p>
                <p className="mt-0.5 break-all font-mono text-sm text-[#001f3f]">
                  https://launchnyc.vercel.app/join/{myGroup.invite_code}
                </p>
                <button
                  type="button"
                  onClick={handleCopyInviteLink}
                  className="mt-2 rounded-lg border border-[#001f3f] bg-white px-3 py-1.5 text-sm font-medium text-[#001f3f] hover:bg-[#f0f4f8]"
                >
                  {copyLinkFeedback ? "Copied!" : "Copy Link"}
                </button>
              </div>

              {groupMembers.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-[#6b7280]">Members</p>
                  <ul className="mt-2 space-y-2">
                    {groupMembers.map((m) => {
                      const email = m.email || (m.user_id === user?.id ? user?.email : null);
                      const joinedDate = m.joined_at ? formatDate(m.joined_at) : "—";
                      return (
                        <li
                          key={m.user_id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-[#001f3f]">{email || "—"}</p>
                            <p className="text-xs text-[#6b7280]">Joined {joinedDate}</p>
                          </div>
                          {isGroupCreator && m.user_id !== user?.id && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m.user_id)}
                              disabled={removingUserId === m.user_id}
                              className="rounded border border-red-500 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              {removingUserId === m.user_id ? "Removing…" : "Remove"}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-[#e5e7eb]">
                {isGroupCreator && groupMembers.length > 1 && (
                  <p className="mb-2 text-sm text-amber-700">
                    You&apos;ll need to assign a new owner or remove all members first.
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleLeaveGroup}
                  disabled={leaveGroupLoading || (isGroupCreator && groupMembers.length > 1)}
                  className="rounded-lg border-2 border-red-500 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:hover:bg-white"
                >
                  {leaveGroupLoading ? "Leaving…" : "Leave Group"}
                </button>
              </div>
            </>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-[#6b7280]">Search together with your roommates on a shared board</p>
              {!showCreateInput && !showJoinInput && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowCreateInput(true); setShowJoinInput(false); setGroupError(null); }}
                    className="rounded-lg bg-[#001f3f] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Create a Group
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowJoinInput(true); setShowCreateInput(false); setGroupError(null); }}
                    className="rounded-lg border border-[#001f3f] px-4 py-2.5 text-sm font-semibold text-[#001f3f] hover:bg-[#f0f4f8]"
                  >
                    Join a Group
                  </button>
                </div>
              )}
              {showCreateInput && (
                <form onSubmit={handleCreateGroup} className="space-y-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[#6b7280]">Group name</span>
                    <input
                      type="text"
                      value={createGroupName}
                      onChange={(e) => setCreateGroupName(e.target.value)}
                      placeholder="e.g. NYC Search Squad"
                      className="w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#001f3f] placeholder-[#9ca3af] focus:border-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#001f3f]"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={createGroupLoading || !createGroupName.trim()}
                      className="rounded-lg bg-[#001f3f] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {createGroupLoading ? "Creating…" : "Create"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowCreateInput(false); setCreateGroupName(""); setGroupError(null); }}
                      className="rounded-lg border border-[#d1d5db] px-3 py-1.5 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
              {showJoinInput && (
                <form onSubmit={handleJoinGroup} className="space-y-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[#6b7280]">Invite code</span>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="Paste invite code"
                      className="w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#001f3f] placeholder-[#9ca3af] focus:border-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#001f3f]"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={joinGroupLoading || !joinCode.trim()}
                      className="rounded-lg bg-[#001f3f] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {joinGroupLoading ? "Joining…" : "Join"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowJoinInput(false); setJoinCode(""); setGroupError(null); }}
                      className="rounded-lg border border-[#d1d5db] px-3 py-1.5 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
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
