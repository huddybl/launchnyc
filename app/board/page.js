"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import GuestPreviewBanner from "@/components/GuestPreviewBanner";
import "./board.css";

function weeksToMoveIn(moveInDateStr) {
  if (!moveInDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const moveIn = new Date(moveInDateStr);
  moveIn.setHours(0, 0, 0, 0);
  const diffMs = moveIn - today;
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
}

const STATUS_OPTIONS = ["Saved", "Touring", "Applying", "Signed"];
const STATUS_TO_DB = { Saved: "saved", Touring: "touring", Applying: "applying", Signed: "signed" };
const DB_TO_STATUS = { saved: "Saved", touring: "Touring", applying: "Applying", signed: "Signed" };

const ADD_NEIGHBORHOOD_OPTIONS = [
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

function formatPrice(value) {
  if (value == null || value === "") return "";
  const str = String(value).replace(/[^0-9]/g, "");
  if (!str) return value;
  return `$${Number(str).toLocaleString()}`;
}

function Card({ apartment, onOpen, onDragStart, onDragEnd }) {
  const price = formatPrice(apartment.price);
  const specs = `${apartment.beds ?? "?"} bed · ${apartment.baths ?? "?"} bath`;
  const feeStr = (apartment.fee ?? "").trim().toLowerCase();
  const isNoFee = feeStr === "no fee" || feeStr === "nofee";
  const feeClass = feeStr ? (isNoFee ? "card-fee fee-no" : "card-fee fee-yes") : "card-fee";
  return (
    <div
      className="card"
      draggable
      onClick={() => onOpen(apartment)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen(apartment)}
      onDragStart={(e) => {
        e.dataTransfer.setData("application/json", JSON.stringify({ id: apartment.id }));
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(apartment.id);
      }}
      onDragEnd={() => onDragEnd?.()}
    >
      <div className="card-row1">
        <div className="card-price">{price} <span>/mo</span></div>
        <div className="pri-dot" />
      </div>
      <div className="card-hood">{apartment.neighborhood || ""}</div>
      <div className="card-row2">
        <div className="card-specs">{specs}</div>
        <div className={feeClass}>{apartment.fee ?? ""}</div>
      </div>
    </div>
  );
}

export default function BoardPage() {
  const searchParams = useSearchParams();
  const { user, isGuest, openSignUpModal, showWelcome, handleDismissWelcome } = useAuth();
  const renderCountRef = useRef(0);
  const [joinedMessage, setJoinedMessage] = useState(false);
  renderCountRef.current += 1;
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerApartment, setDrawerApartment] = useState(null);
  const [drawerEditMode, setDrawerEditMode] = useState(false);
  const [drawerEditForm, setDrawerEditForm] = useState({
    price: "",
    neighborhood: "",
    street: "",
    beds: "",
    baths: "",
    fee: "",
    listing_url: "",
  });
  const [selectedStatus, setSelectedStatus] = useState("Saved");
  const [notes, setNotes] = useState("");
  const [nudgeBarHidden, setNudgeBarHidden] = useState(false);
  const [dismissedNudges, setDismissedNudges] = useState(() => new Set());
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [exportPdfLoading, setExportPdfLoading] = useState(false);
  const [addForm, setAddForm] = useState({
    price: "",
    neighborhood: "",
    street: "",
    beds: "",
    baths: "",
    listing_url: "",
    notes: "",
  });
  const [filterSearch, setFilterSearch] = useState("");
  const [filterNeighborhood, setFilterNeighborhood] = useState("");
  const [filterFee, setFilterFee] = useState("all");
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");
  const [moveInDate, setMoveInDate] = useState(null);
  const [boardMode, setBoardMode] = useState("personal");
  const [userGroup, setUserGroup] = useState(null);
  const [pendingInvite, setPendingInvite] = useState(null);
  const [inviteActionLoading, setInviteActionLoading] = useState(false);
  const fetchUserGroup = useCallback(async () => {
    if (!user?.id) {
      setUserGroup(null);
      return;
    }
    const { data: membership } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership?.group_id) {
      setUserGroup(null);
      return;
    }
    const { data: group } = await supabase
      .from("search_groups")
      .select("id, name, invite_code")
      .eq("id", membership.group_id)
      .single();
    setUserGroup(group ?? null);
  }, [user?.id]);

  useEffect(() => {
    fetchUserGroup();
  }, [fetchUserGroup]);

  useEffect(() => {
    if (!userGroup?.id && boardMode === "group") {
      setBoardMode("personal");
    }
  }, [userGroup?.id, boardMode]);

  const fetchPendingInvite = useCallback(async () => {
    if (!user?.id || !user?.email || isGuest) {
      setPendingInvite(null);
      return;
    }
    const email = String(user.email).trim().toLowerCase();
    if (!email) {
      setPendingInvite(null);
      return;
    }
    const { data: invites } = await supabase
      .from("group_invites")
      .select("id, group_id, inviter_email")
      .eq("invited_email", email)
      .eq("status", "pending")
      .limit(1);
    const inv = invites?.[0];
    if (!inv) {
      setPendingInvite(null);
      return;
    }
    const { data: group } = await supabase
      .from("search_groups")
      .select("name")
      .eq("id", inv.group_id)
      .single();
    setPendingInvite({
      id: inv.id,
      group_id: inv.group_id,
      group_name: group?.name ?? "a group",
      inviter_email: inv.inviter_email || "A group member",
    });
  }, [user?.id, user?.email, isGuest]);

  useEffect(() => {
    fetchPendingInvite();
  }, [fetchPendingInvite]);

  async function handleAcceptInvite() {
    if (!pendingInvite?.id || !user?.id || !pendingInvite.group_id) return;
    setInviteActionLoading(true);
    try {
      const { error: memberError } = await supabase
        .from("group_members")
        .insert({ group_id: pendingInvite.group_id, user_id: user.id });
      if (memberError) {
        setError(memberError.message);
        setInviteActionLoading(false);
        return;
      }
      await supabase
        .from("group_invites")
        .update({ status: "accepted" })
        .eq("id", pendingInvite.id);
      setPendingInvite(null);
      await fetchUserGroup();
      await fetchApartments();
    } finally {
      setInviteActionLoading(false);
    }
  }

  async function handleDeclineInvite() {
    if (!pendingInvite?.id) return;
    setInviteActionLoading(true);
    try {
      await supabase
        .from("group_invites")
        .update({ status: "declined" })
        .eq("id", pendingInvite.id);
      setPendingInvite(null);
    } finally {
      setInviteActionLoading(false);
    }
  }

  useEffect(() => {
    if (searchParams.get("joined") === "1") {
      setJoinedMessage(true);
      window.history.replaceState(null, "", "/board");
    }
  }, [searchParams]);

  const fetchMoveInDate = useCallback(async () => {
    if (!user?.id) {
      setMoveInDate(null);
      return;
    }
    const { data } = await supabase
      .from("user_profiles")
      .select("move_in_date")
      .eq("user_id", user.id)
      .maybeSingle();
    setMoveInDate(data?.move_in_date ?? null);
  }, [user?.id]);

  useEffect(() => {
    fetchMoveInDate();
  }, [fetchMoveInDate]);

  const fetchApartments = useCallback(async () => {
    // #region agent log
    fetch("http://127.0.0.1:7556/ingest/d61c60a1-1868-49a7-9882-9199063191d5", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5bd27a" },
      body: JSON.stringify({
        sessionId: "5bd27a",
        location: "app/board/page.js:fetchApartments",
        message: "fetchApartments called",
        data: { ts: Date.now() },
        timestamp: Date.now(),
        hypothesisId: "B",
      }),
    }).catch(() => {});
    // #endregion
    setLoading(true);
    setError(null);
    if (!user?.id) {
      setApartments([]);
      setLoading(false);
      return;
    }
    try {
      if (boardMode === "group" && userGroup?.id) {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `/api/apartments?group_id=${encodeURIComponent(userGroup.id)}`,
          { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(json?.error ?? "Failed to load group apartments");
          setApartments([]);
        } else {
          setApartments(Array.isArray(json) ? json : []);
        }
      } else {
        const q = supabase
          .from("apartments")
          .select("*")
          .order("created_at", { ascending: false })
          .eq("user_id", user.id)
          .is("group_id", null);
        const { data, error: err } = await q;
        if (err) {
          setError(err.message);
          setApartments([]);
        } else {
          setApartments(Array.isArray(data) ? data : []);
        }
      }
    } catch (e) {
      setError(e?.message ?? "Failed to load apartments");
      setApartments([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, userGroup?.id, boardMode]);

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7556/ingest/d61c60a1-1868-49a7-9882-9199063191d5", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5bd27a" },
      body: JSON.stringify({
        sessionId: "5bd27a",
        location: "app/board/page.js:useEffect",
        message: "useEffect (mount) ran",
        data: { renderCount: renderCountRef.current, ts: Date.now() },
        timestamp: Date.now(),
        hypothesisId: "C",
      }),
    }).catch(() => {});
    // #endregion
    fetchApartments();
  }, [fetchApartments]);

  const uniqueNeighborhoods = useMemo(() => {
    const set = new Set();
    apartments.forEach((a) => {
      const n = (a.neighborhood || "").trim();
      if (n) set.add(n);
    });
    return ["", ...Array.from(set).sort()];
  }, [apartments]);

  const filteredApartments = useMemo(() => {
    return apartments.filter((a) => {
      const search = (filterSearch || "").trim().toLowerCase();
      if (search) {
        const hood = (a.neighborhood || "").toLowerCase();
        const street = (a.street || "").toLowerCase();
        if (!hood.includes(search) && !street.includes(search)) return false;
      }
      const hoodFilter = (filterNeighborhood || "").trim();
      if (hoodFilter && (a.neighborhood || "").trim() !== hoodFilter) return false;
      if (filterFee === "no fee") {
        const f = (a.fee || "").trim().toLowerCase();
        if (f !== "no fee" && f !== "nofee") return false;
      }
      if (filterFee === "fee") {
        const f = (a.fee || "").trim().toLowerCase();
        if (f === "no fee" || f === "nofee" || !f) return false;
      }
      const parsePrice = (v) => parseInt(String(v || "").replace(/\D/g, ""), 10) || 0;
      const minPrice = filterPriceMin.trim() ? parsePrice(filterPriceMin) : 0;
      const maxPrice = filterPriceMax.trim() ? (parseInt(String(filterPriceMax).replace(/\D/g, ""), 10) || Infinity) : Infinity;
      const apartmentPrice = parsePrice(a.price);
      if (apartmentPrice < minPrice || apartmentPrice > maxPrice) return false;
      return true;
    });
  }, [apartments, filterSearch, filterNeighborhood, filterFee, filterPriceMin, filterPriceMax]);

  const byStatus = (list, status) =>
    list.filter((a) => (a.status || "saved").toLowerCase() === status);

  const saved = byStatus(filteredApartments, "saved");
  const touring = byStatus(filteredApartments, "touring");
  const applying = byStatus(filteredApartments, "applying");
  const signed = byStatus(filteredApartments, "signed");

  const filtersActive =
    (filterSearch || "").trim() !== "" ||
    (filterNeighborhood || "").trim() !== "" ||
    filterFee !== "all" ||
    (filterPriceMin || "").trim() !== "" ||
    (filterPriceMax || "").trim() !== "";

  function clearFilters() {
    setFilterSearch("");
    setFilterNeighborhood("");
    setFilterFee("all");
    setFilterPriceMin("");
    setFilterPriceMax("");
  }

  // Progress: which steps are done (use full list, forward-only: later stages imply earlier complete)
  const savedAll = byStatus(apartments, "saved");
  const touringAll = byStatus(apartments, "touring");
  const applyingAll = byStatus(apartments, "applying");
  const signedAll = byStatus(apartments, "signed");
  const hasSigned = signedAll.length >= 1;
  const hasApplyingOrLater = applyingAll.length >= 1 || hasSigned;
  const hasTouringOrLater = touringAll.length >= 1 || hasApplyingOrLater;
  const steps = [
    { label: "Set Up", done: true },
    { label: "Saving", done: apartments.length >= 1 },
    { label: "Touring", done: hasTouringOrLater },
    { label: "Applying", done: hasApplyingOrLater },
    { label: "Signed", done: hasSigned },
  ];
  const currentStepIndex =
    steps.findIndex((s) => !s.done) >= 0 ? steps.findIndex((s) => !s.done) : 4;

  // Nudges: visibility and done from data; dismissed state in React (use full list, forward-only)
  const nudgeList = [
    {
      id: "save-first",
      label: "Save your first apartment",
      show: apartments.length === 0,
      done: false,
    },
    {
      id: "book-tour",
      label: "Book your first tour",
      show: true,
      done: hasTouringOrLater,
    },
    {
      id: "documents",
      label: "Get your documents ready",
      show: true,
      done: false,
    },
    {
      id: "guarantor",
      label: "Loop in your guarantor",
      show: true,
      done: false,
    },
    {
      id: "apply",
      label: "Apply to your top pick",
      show: hasTouringOrLater,
      done: hasApplyingOrLater,
    },
  ];
  const visibleNudges = nudgeList.filter(
    (n) => n.show && !dismissedNudges.has(n.id)
  );
  function dismissNudge(id) {
    setDismissedNudges((prev) => new Set(prev).add(id));
  }

  const dragIdRef = useRef(null);

  const guard = useCallback(
    (fn) =>
      (...args) => {
        if (isGuest) {
          openSignUpModal();
          return;
        }
        return typeof fn === "function" ? fn(...args) : undefined;
      },
    [isGuest, openSignUpModal]
  );

  function handleCardClick(apartment) {
    if (dragIdRef.current !== null) {
      dragIdRef.current = null;
      return;
    }
    openDrawer(apartment);
  }

  function handleCardDragStart(id) {
    dragIdRef.current = id;
  }

  function handleCardDragEnd() {
    dragIdRef.current = null;
  }

  async function handleColumnDrop(e, targetStatus) {
    e.preventDefault();
    e.currentTarget.classList.remove("col-body-drag-over");
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    let id;
    try {
      ({ id } = JSON.parse(raw));
    } catch {
      return;
    }
    if (!id || !targetStatus) return;
    try {
      const { error: err } = await supabase
        .from("apartments")
        .update({ status: targetStatus })
        .eq("id", id);
      if (!err) await fetchApartments();
      else setError(err.message);
    } catch (err) {
      setError(err?.message ?? "Failed to move card");
    }
  }

  function handleColumnDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    e.currentTarget.classList.add("col-body-drag-over");
  }

  function handleColumnDragLeave(e) {
    e.currentTarget.classList.remove("col-body-drag-over");
  }

  function openDrawer(apartment) {
    setDrawerApartment(apartment);
    setDrawerEditMode(false);
    setSelectedStatus(DB_TO_STATUS[(apartment.status || "saved").toLowerCase()] ?? "Saved");
    setNotes(apartment.notes ?? "");
    setDrawerOpen(true);
  }

  function startDrawerEdit() {
    if (isGuest) {
      openSignUpModal();
      return;
    }
    if (!drawerApartment) return;
    setDrawerEditForm({
      price: String(drawerApartment.price ?? ""),
      neighborhood: String(drawerApartment.neighborhood ?? ""),
      street: String(drawerApartment.street ?? ""),
      beds: String(drawerApartment.beds ?? ""),
      baths: String(drawerApartment.baths ?? ""),
      fee: String(drawerApartment.fee ?? ""),
      listing_url: String(drawerApartment.listing_url ?? ""),
    });
    setDrawerEditMode(true);
  }

  async function saveDrawerEdits() {
    if (isGuest) {
      openSignUpModal();
      return;
    }
    if (!drawerApartment?.id) return;
    const payload = {
      price: drawerEditForm.price.trim() || null,
      neighborhood: drawerEditForm.neighborhood.trim() || null,
      street: drawerEditForm.street.trim() || null,
      beds: drawerEditForm.beds.trim() || null,
      baths: drawerEditForm.baths.trim() || null,
      fee: drawerEditForm.fee.trim() || null,
      listing_url: drawerEditForm.listing_url.trim() || null,
    };
    try {
      const { error: err } = await supabase
        .from("apartments")
        .update(payload)
        .eq("id", drawerApartment.id);
      if (err) {
        setError(err.message);
        return;
      }
      setDrawerApartment((prev) => (prev ? { ...prev, ...payload } : null));
      setDrawerEditMode(false);
      await fetchApartments();
    } catch (e) {
      setError(e?.message ?? "Failed to save changes");
    }
  }

  async function deleteDrawerApartment() {
    if (isGuest) {
      openSignUpModal();
      return;
    }
    if (!drawerApartment?.id) return;
    try {
      const { error: err } = await supabase
        .from("apartments")
        .delete()
        .eq("id", drawerApartment.id);
      if (err) {
        setError(err.message);
        return;
      }
      closeDrawer();
      await fetchApartments();
    } catch (e) {
      setError(e?.message ?? "Failed to delete");
    }
  }

  async function closeDrawer() {
    if (drawerApartment?.id && notes !== (drawerApartment.notes ?? "")) {
      try {
        await supabase.from("apartments").update({ notes }).eq("id", drawerApartment.id);
        await fetchApartments();
      } catch (e) {
        setError(e?.message ?? "Failed to save notes");
      }
    }
    setDrawerOpen(false);
  }

  const DOCUMENT_PATH_KEYS = [
    "gov_id_path",
    "offer_letter_path",
    "pay_stubs_path",
    "bank_statements_path",
    "tax_return_path",
    "guarantor_docs_path",
    "credit_report_path",
    "reference_letter_path",
  ];
  const CHECKLIST_KEYS = [
    "government_id",
    "offer_letter",
    "pay_stubs",
    "bank_statements",
    "tax_return",
    "guarantor_docs",
    "credit_report",
    "reference_letter",
  ];

  async function handleExportPackage() {
    if (isGuest) {
      openSignUpModal();
      return;
    }
    if (!user?.id) return;
    setExportPdfLoading(true);
    setError(null);
    try {
      const { data: row, error: fetchErr } = await supabase
        .from("renter_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (fetchErr) throw new Error(fetchErr.message);
      const profile = row ? { ...row } : {};
      const checklist = {};
      CHECKLIST_KEYS.forEach((key, i) => {
        const pathCol = DOCUMENT_PATH_KEYS[i];
        checklist[key] = !!(row && row[pathCol]);
      });
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          checklist,
          apartment: drawerApartment || null,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || res.statusText || "Failed to generate PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "application-package.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.message ?? "Failed to generate PDF");
    } finally {
      setExportPdfLoading(false);
    }
  }

  async function handleDrawerStatusChange(newStatus) {
    if (isGuest) {
      openSignUpModal();
      return;
    }
    setSelectedStatus(newStatus);
    if (!drawerApartment?.id) return;
    const dbStatus = STATUS_TO_DB[newStatus];
    setSavingStatus(true);
    try {
      const { error: err } = await supabase
        .from("apartments")
        .update({ status: dbStatus })
        .eq("id", drawerApartment.id);
      if (!err) {
        setDrawerApartment((prev) => (prev ? { ...prev, status: dbStatus } : null));
        await fetchApartments();
      } else {
        setError(err.message);
      }
    } catch (e) {
      setError(e?.message ?? "Failed to update status");
    } finally {
      setSavingStatus(false);
    }
  }

  function openAddForm() {
    setAddForm({
      price: "",
      neighborhood: "",
      street: "",
      beds: "",
      baths: "",
      listing_url: "",
      notes: "",
    });
    setAddFormOpen(true);
  }

  async function handleAddSubmit(e) {
    e.preventDefault();
    if (!user?.id) return;
    const payload = {
      user_id: user.id,
      price: addForm.price.trim() || null,
      neighborhood: addForm.neighborhood.trim() || null,
      street: addForm.street.trim() || null,
      beds: addForm.beds.trim() || null,
      baths: addForm.baths.trim() || null,
      status: "saved",
      listing_url: addForm.listing_url.trim() || null,
      notes: addForm.notes.trim() || null,
    };
    if (boardMode === "group" && userGroup?.id) {
      payload.group_id = userGroup.id;
    } else {
      payload.group_id = null;
    }
    try {
      const { error: err } = await supabase.from("apartments").insert(payload);
      if (err) {
        setError(err.message);
        return;
      }
      setAddFormOpen(false);
      await fetchApartments();
    } catch (e) {
      setError(e?.message ?? "Failed to add apartment");
    }
  }

  return (
    <div className="board-page">
      {showWelcome && !isGuest && (
        <div
          className="board-welcome-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-title"
          onClick={handleDismissWelcome}
        >
          <div className="board-welcome-card" onClick={(e) => e.stopPropagation()}>
            <h2 id="welcome-title" className="board-welcome-title">Welcome to LaunchNYC</h2>
            <p className="board-welcome-text">
              Your search board is ready. Save apartments, track tours, and move through your pipeline.
            </p>
            <button
              type="button"
              onClick={handleDismissWelcome}
              className="board-welcome-dismiss"
            >
              Get started
            </button>
          </div>
        </div>
      )}
      {isGuest && <GuestPreviewBanner />}
      {joinedMessage && (
        <div className="board-joined-banner">
          <p>You joined the group!</p>
          <button type="button" onClick={() => setJoinedMessage(false)} aria-label="Dismiss">×</button>
        </div>
      )}
      {pendingInvite && !isGuest && (
        <div className="board-invite-banner">
          <p className="board-invite-banner-text">
            <strong>{pendingInvite.inviter_email}</strong> invited you to join <strong>{pendingInvite.group_name}</strong>
          </p>
          <div className="board-invite-banner-actions">
            <button
              type="button"
              onClick={handleAcceptInvite}
              disabled={inviteActionLoading}
              className="board-invite-banner-btn board-invite-banner-accept"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={handleDeclineInvite}
              disabled={inviteActionLoading}
              className="board-invite-banner-btn board-invite-banner-decline"
            >
              Decline
            </button>
          </div>
        </div>
      )}
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          <div className="page-title">Search Board</div>
          <div className="meta-pill">
            {loading ? "…" : `${apartments.length} apartment${apartments.length !== 1 ? "s" : ""}`}
          </div>
        </div>
        <div className="topbar-right">
          <select
            className="board-context-select"
            value={boardMode === "personal" ? "personal" : (userGroup?.id ?? "personal")}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "personal") {
                setApartments([]);
                setBoardMode("personal");
              } else if (userGroup?.id && v === userGroup.id) {
                setApartments([]);
                setBoardMode("group");
              }
            }}
            aria-label="Board context"
          >
            <option value="personal">My Search</option>
            {userGroup?.id && (
              <option value={userGroup.id}>{userGroup.name || "Unnamed group"}</option>
            )}
          </select>
          <span className="topbar-weeks-desktop">
            {moveInDate != null ? (
              (() => {
                const weeks = weeksToMoveIn(moveInDate);
                const label =
                  weeks < 0 ? "Move-in passed" : `${weeks} week${weeks !== 1 ? "s" : ""} to move-in`;
                return <div className="weeks-pill">{label}</div>;
              })()
            ) : (
              <Link href="/account" className="weeks-pill weeks-pill-link">
                Set move-in date
              </Link>
            )}
          </span>
          <button
            type="button"
            className="btn-outline"
            onClick={guard(openAddForm)}
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M8 3v10M3 8h10" />
            </svg>
            Add Apartment
          </button>
        </div>
        <div className="topbar-mobile-second-row">
          {moveInDate != null ? (
            (() => {
              const weeks = weeksToMoveIn(moveInDate);
              const label =
                weeks < 0 ? "Move-in passed" : `${weeks} week${weeks !== 1 ? "s" : ""} to move-in`;
              return <div className="weeks-pill">{label}</div>;
            })()
          ) : (
            <Link href="/account" className="weeks-pill weeks-pill-link">
              Set move-in date
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="topbar" style={{ background: "#fef2f2", color: "#b91c1c", fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* Nudge bar */}
      {!nudgeBarHidden && visibleNudges.length > 0 && (
        <div className="nudge-bar">
          <div className="nudge-title">TO-DO</div>
          <div className="nudges">
            {visibleNudges.map((n) => (
              <div
                key={n.id}
                className={`nudge${n.done ? " done" : ""}`}
              >
                <div className="nudge-dot" />
                <span>{n.label}</span>
                <button
                  type="button"
                  className="nudge-close"
                  onClick={guard((e) => {
                    e.stopPropagation();
                    dismissNudge(n.id);
                  })}
                  aria-label={`Dismiss ${n.label}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="nudge-dismiss" onClick={guard(() => setNudgeBarHidden(true))} aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      {/* Quick filter bar */}
      <div className="filter-bar">
        <input
          type="text"
          className="filter-search"
          placeholder="Search by neighborhood or street..."
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          aria-label="Search by neighborhood or street"
        />
        <select
          className="filter-neighborhood"
          value={filterNeighborhood}
          onChange={(e) => setFilterNeighborhood(e.target.value)}
          aria-label="Filter by neighborhood"
        >
          <option value="">All Neighborhoods</option>
          {uniqueNeighborhoods.filter(Boolean).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <div className="filter-fee-pills">
          {["all", "no fee", "fee"].map((f) => (
            <button
              key={f}
              type="button"
              className={`filter-fee-pill ${filterFee === f ? "active" : ""}`}
              onClick={() => setFilterFee(f)}
            >
              {f === "all" ? "All" : f === "no fee" ? "No Fee" : "Fee"}
            </button>
          ))}
        </div>
        <div className="filter-price-wrap">
          <input
            type="text"
            className="filter-price-input"
            placeholder="Min $"
            value={filterPriceMin}
            onChange={(e) => setFilterPriceMin(e.target.value)}
            aria-label="Minimum price"
          />
          <span className="filter-price-sep" style={{ color: "var(--muted)", fontSize: 12 }}>–</span>
          <input
            type="text"
            className="filter-price-input"
            placeholder="Max $"
            value={filterPriceMax}
            onChange={(e) => setFilterPriceMax(e.target.value)}
            aria-label="Maximum price"
          />
        </div>
        {filtersActive && (
          <button type="button" className="filter-clear" onClick={guard(clearFilters)}>
            Clear filters
          </button>
        )}
      </div>

      {/* Progress bar (timeline-style stepper) */}
      <div className="prog-bar">
        {steps.map((step, i) => (
          <div key={step.label} className="prog-step">
            {i > 0 && (
              <div className={`prog-line ${steps[i - 1].done ? "done" : ""}`} />
            )}
            <div className="prog-node">
              <div
                className={`prog-dot${step.done ? " done" : ""}${currentStepIndex === i && !step.done ? " now" : ""}`}
              >
                {step.done ? (
                  <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <div
                className={`prog-lbl${step.done ? " done" : ""}${currentStepIndex === i && !step.done ? " now" : ""}`}
              >
                {step.label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className={`prog-line ${step.done ? "done" : ""}`} />
            )}
          </div>
        ))}
      </div>

      {/* Board */}
      <div className="board-wrap">
        <div className="board">
          <div className="col col-saved">
            <div className="col-head">
              <div className="col-left">
                <div className="col-pip" />
                <div className="col-name">Saved</div>
              </div>
              <div className="col-n">{saved.length}</div>
            </div>
            <div
              className="col-body"
              onDragOver={guard(handleColumnDragOver)}
              onDragLeave={guard(handleColumnDragLeave)}
              onDrop={guard((e) => handleColumnDrop(e, "saved"))}
            >
              {saved.length === 0 ? (
                <div className="col-empty">
                  <div className="col-empty-icon">📌</div>
                  <div className="col-empty-text">Save listings here as you search</div>
                </div>
              ) : (
                saved.map((apt) => (
                  <Card
                    key={apt.id}
                    apartment={apt}
                    onOpen={guard(handleCardClick)}
                    onDragStart={guard(handleCardDragStart)}
                    onDragEnd={guard(handleCardDragEnd)}
                  />
                ))
              )}
              <button
                type="button"
                className="col-add-card"
                onClick={guard(openAddForm)}
              >
                <span className="col-add-card-icon">+</span>
                Add apartment
              </button>
            </div>
          </div>
          <div className="col col-touring">
            <div className="col-head">
              <div className="col-left">
                <div className="col-pip" />
                <div className="col-name">Touring</div>
              </div>
              <div className="col-n">{touring.length}</div>
            </div>
            <div
              className="col-body"
              onDragOver={guard(handleColumnDragOver)}
              onDragLeave={guard(handleColumnDragLeave)}
              onDrop={guard((e) => handleColumnDrop(e, "touring"))}
            >
              {touring.length === 0 ? (
                <div className="col-empty">
                  <div className="col-empty-icon">📅</div>
                  <div className="col-empty-text">Move here when you book a tour</div>
                </div>
              ) : (
                touring.map((apt) => (
                  <Card
                    key={apt.id}
                    apartment={apt}
                    onOpen={guard(handleCardClick)}
                    onDragStart={guard(handleCardDragStart)}
                    onDragEnd={guard(handleCardDragEnd)}
                  />
                ))
              )}
              <button
                type="button"
                className="col-add-card"
                onClick={guard(openAddForm)}
              >
                <span className="col-add-card-icon">+</span>
                Add apartment
              </button>
            </div>
          </div>
          <div className="col col-applying">
            <div className="col-head">
              <div className="col-left">
                <div className="col-pip" />
                <div className="col-name">Applying</div>
              </div>
              <div className="col-n">{applying.length}</div>
            </div>
            <div
              className="col-body"
              onDragOver={guard(handleColumnDragOver)}
              onDragLeave={guard(handleColumnDragLeave)}
              onDrop={guard((e) => handleColumnDrop(e, "applying"))}
            >
              {applying.length === 0 ? (
                <div className="col-empty">
                  <div className="col-empty-icon">📋</div>
                  <div className="col-empty-text">Move here when you apply</div>
                </div>
              ) : (
                applying.map((apt) => (
                  <Card
                    key={apt.id}
                    apartment={apt}
                    onOpen={guard(handleCardClick)}
                    onDragStart={guard(handleCardDragStart)}
                    onDragEnd={guard(handleCardDragEnd)}
                  />
                ))
              )}
              <button
                type="button"
                className="col-add-card"
                onClick={guard(openAddForm)}
              >
                <span className="col-add-card-icon">+</span>
                Add apartment
              </button>
            </div>
          </div>
          <div className="col col-signed">
            <div className="col-head">
              <div className="col-left">
                <div className="col-pip" />
                <div className="col-name">Signed</div>
              </div>
              <div className="col-n">{signed.length}</div>
            </div>
            <div
              className="col-body"
              onDragOver={guard(handleColumnDragOver)}
              onDragLeave={guard(handleColumnDragLeave)}
              onDrop={guard((e) => handleColumnDrop(e, "signed"))}
            >
              {signed.length === 0 ? (
                <div className="col-empty">
                  <div className="col-empty-icon">🗝️</div>
                  <div className="col-empty-text">Your new home ends up here</div>
                </div>
              ) : (
                signed.map((apt) => (
                  <Card
                    key={apt.id}
                    apartment={apt}
                    onOpen={guard(handleCardClick)}
                    onDragStart={guard(handleCardDragStart)}
                    onDragEnd={guard(handleCardDragEnd)}
                  />
                ))
              )}
              <button
                type="button"
                className="col-add-card"
                onClick={guard(openAddForm)}
              >
                <span className="col-add-card-icon">+</span>
                Add apartment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add apartment modal */}
      {addFormOpen && (
        <div className="modal-overlay" onClick={guard(() => setAddFormOpen(false))}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Add apartment</h2>
            <form className="modal-form" onSubmit={(e) => { if (isGuest) { e.preventDefault(); openSignUpModal(); return; } handleAddSubmit(e); }}>
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Price</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 3600"
                    value={addForm.price}
                    onChange={(e) => setAddForm((f) => ({ ...f, price: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Neighborhood</label>
                  <select
                    className="form-input"
                    value={addForm.neighborhood}
                    onChange={(e) => setAddForm((f) => ({ ...f, neighborhood: e.target.value }))}
                    aria-label="Neighborhood"
                  >
                    <option value="">Select neighborhood</option>
                    {ADD_NEIGHBORHOOD_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-field full">
                <label className="form-label">Street address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 240 Kent Ave"
                  value={addForm.street}
                  onChange={(e) => setAddForm((f) => ({ ...f, street: e.target.value }))}
                />
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Beds</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 3"
                    value={addForm.beds}
                    onChange={(e) => setAddForm((f) => ({ ...f, beds: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Baths</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 2"
                    value={addForm.baths}
                    onChange={(e) => setAddForm((f) => ({ ...f, baths: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-field full">
                <label className="form-label">Listing URL (optional)</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={addForm.listing_url}
                  onChange={(e) => setAddForm((f) => ({ ...f, listing_url: e.target.value }))}
                />
              </div>
              <div className="form-field full">
                <label className="form-label">Notes (optional)</label>
                <textarea
                  className="form-input min-h-[80px] resize-y"
                  placeholder="e.g. No fee, available June 1"
                  value={addForm.notes}
                  onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-ghost" onClick={guard(() => setAddFormOpen(false))}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save apartment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer overlay */}
      <div
        className={`drawer-overlay ${drawerOpen ? "show" : ""}`}
        onClick={guard(closeDrawer)}
        onKeyDown={(e) => e.key === "Escape" && guard(closeDrawer)()}
        role="button"
        tabIndex={-1}
        aria-hidden={!drawerOpen}
      />

      {/* Drawer */}
      <div className={`drawer ${drawerOpen ? "open" : ""}`} role="dialog" aria-label="Apartment details">
        {drawerApartment && (
          <>
            <div className="drawer-head">
              <div>
                <div className="drawer-price">
                  {formatPrice(drawerApartment.price)} <span>/mo</span>
                </div>
                <div className="drawer-hood">{drawerApartment.neighborhood || ""}</div>
              </div>
              <button type="button" className="x-btn" onClick={guard(closeDrawer)} aria-label="Close">✕</button>
            </div>
            <div className="drawer-body">
              {drawerEditMode ? (
                <div className="drawer-edit-fields">
                  <div className="d-label">Details</div>
                  <div className="drawer-edit-grid">
                    <div className="d-field">
                      <div className="d-key">Price</div>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 3600"
                        value={drawerEditForm.price}
                        onChange={(e) => setDrawerEditForm((f) => ({ ...f, price: e.target.value }))}
                      />
                    </div>
                    <div className="d-field">
                      <div className="d-key">Neighborhood</div>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Williamsburg, Brooklyn"
                        value={drawerEditForm.neighborhood}
                        onChange={(e) => setDrawerEditForm((f) => ({ ...f, neighborhood: e.target.value }))}
                      />
                    </div>
                    <div className="d-field full">
                      <div className="d-key">Street</div>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 240 Kent Ave"
                        value={drawerEditForm.street}
                        onChange={(e) => setDrawerEditForm((f) => ({ ...f, street: e.target.value }))}
                      />
                    </div>
                    <div className="d-field">
                      <div className="d-key">Beds</div>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 3"
                        value={drawerEditForm.beds}
                        onChange={(e) => setDrawerEditForm((f) => ({ ...f, beds: e.target.value }))}
                      />
                    </div>
                    <div className="d-field">
                      <div className="d-key">Baths</div>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 2"
                        value={drawerEditForm.baths}
                        onChange={(e) => setDrawerEditForm((f) => ({ ...f, baths: e.target.value }))}
                      />
                    </div>
                    <div className="d-field">
                      <div className="d-key">Fee</div>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="No fee / Broker fee"
                        value={drawerEditForm.fee}
                        onChange={(e) => setDrawerEditForm((f) => ({ ...f, fee: e.target.value }))}
                      />
                    </div>
                    <div className="d-field full">
                      <div className="d-key">Listing URL</div>
                      <input
                        type="url"
                        className="form-input"
                        placeholder="https://..."
                        value={drawerEditForm.listing_url}
                        onChange={(e) => setDrawerEditForm((f) => ({ ...f, listing_url: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <div className="d-label">Details</div>
                    <div className="d-grid">
                      <div className="d-field">
                        <div className="d-key">Street</div>
                        <div className="d-val">{drawerApartment.street || "—"}</div>
                      </div>
                      <div className="d-field">
                        <div className="d-key">Beds / Baths</div>
                        <div className="d-val">
                          {drawerApartment.beds ?? "?"} bed · {drawerApartment.baths ?? "?"} bath
                        </div>
                      </div>
                      <div className="d-field">
                        <div className="d-key">Fee</div>
                        <div className="d-val">{drawerApartment.fee ?? "—"}</div>
                      </div>
                      <div className="d-field">
                        <div className="d-key">Available</div>
                        <div className="d-val">July 1, 2025</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="d-label">Move to stage</div>
                    <div className="status-row">
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`status-opt ${selectedStatus === opt ? "sel" : ""}`}
                          onClick={guard(() => handleDrawerStatusChange(opt))}
                          disabled={savingStatus}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="d-label">Notes</div>
                    <textarea
                      className="d-notes"
                      placeholder="What you liked, questions to ask, red flags..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  {drawerApartment.listing_url?.trim() ? (
                    <a
                      href={drawerApartment.listing_url.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="d-ext-link"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M7 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V9" />
                        <path d="M10 2h4v4M8 8l6-6" />
                      </svg>
                      Open original listing
                    </a>
                  ) : null}
                </>
              )}
            </div>
            <div className="drawer-footer">
              {drawerEditMode ? (
                <>
                  <button type="button" className="btn-primary" onClick={guard(saveDrawerEdits)}>
                    Save Changes
                  </button>
                  <button type="button" className="btn-ghost" onClick={guard(() => setDrawerEditMode(false))}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={guard(deleteDrawerApartment)}
                    style={{ color: "#b91c1c", borderColor: "#fecaca" }}
                  >
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn-ghost" onClick={guard(startDrawerEdit)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-export"
                    onClick={guard(handleExportPackage)}
                    disabled={exportPdfLoading}
                  >
                    {exportPdfLoading ? (
                      <>
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                        Generating…
                      </>
                    ) : (
                      <>
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M8 2v8M5 7l3 3 3-3" />
                          <path d="M3 12h10" />
                        </svg>
                        Export Application Package
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={guard(deleteDrawerApartment)}
                    style={{ color: "#b91c1c", borderColor: "#fecaca" }}
                  >
                    Delete
                  </button>
                  <button type="button" className="btn-ghost" onClick={guard(closeDrawer)}>
                    Close
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
