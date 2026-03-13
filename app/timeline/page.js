"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import GuestPreviewBanner from "@/components/GuestPreviewBanner";
import "./timeline.css";

const TASK_HREF = {
  "first-apt": "/board",
  "search-profile": "/",
  "move-in": "/",
  "set-budget": "/",
  "choose-neighborhoods": "/",
  "five-apt": "/board",
  "research-hood": "/neighborhoods",
  "renter-complete": "/documents",
  "compile-docs": "/documents?tab=5",
  "export-pro": "/documents",
  "first-tour": "/board",
  "tour-3": "/board",
  "first-apply": "/board",
  "send-package-pro": "/documents",
  "sign-lease": "/board",
  "insurance": "/board",
  "get-keys": "/board",
};

const DOCUMENT_CHECKLIST_KEYS = [
  "government_id",
  "offer_letter",
  "pay_stubs",
  "bank_statements",
  "tax_return",
  "guarantor_docs",
  "credit_report",
  "reference_letter",
];

const RENTER_PROFILE_FIELDS = [
  "full_name", "date_of_birth", "email", "phone", "current_address", "apt_suite",
  "city", "state", "zip_code", "years_at_address", "current_landlord_name",
  "current_monthly_rent", "reason_for_leaving", "employer_name", "employer_address",
  "employer_city", "employer_state", "employer_zip", "employer_phone", "job_title",
  "annual_salary", "start_date", "supervisor_name", "previous_address", "previous_city",
  "previous_state", "previous_zip", "previous_landlord_name", "previous_landlord_phone",
  "guarantor_name", "guarantor_relationship", "guarantor_email", "guarantor_phone",
  "guarantor_income", "guarantor_address", "guarantor_city", "guarantor_state", "guarantor_zip",
  "reference_name", "reference_phone", "emergency_name", "emergency_phone",
];

function filled(val) {
  if (val == null) return false;
  if (typeof val === "number" && !Number.isNaN(val)) return true;
  return typeof val === "string" && val.trim() !== "";
}

export default function TimelinePage() {
  const { user, isGuest, openOnboardingModal, openSignUpModal } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [apartments, setApartments] = useState([]);
  const [apartmentCounts, setApartmentCounts] = useState({ total: 0, saved: 0, touring: 0, applying: 0, signed: 0 });
  const [renterProfile, setRenterProfile] = useState(null);
  const [renterCompletePct, setRenterCompletePct] = useState(0);
  const [docChecklistAllDone, setDocChecklistAllDone] = useState(false);
  const [weeksOut, setWeeksOut] = useState(null);
  const [drawerPhase, setDrawerPhase] = useState(null);

  const fetchData = useCallback(async () => {
    if (!user?.id || isGuest) return;
    const [upRes, aptRes, rpRes, dcRes] = await Promise.all([
      supabase.from("user_profiles").select("move_in_date, budget_max, neighborhoods").eq("user_id", user.id).maybeSingle(),
      supabase.from("apartments").select("id, status").eq("user_id", user.id),
      supabase.from("renter_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("document_checklist").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    setUserProfile(upRes.data ?? null);
    const aptList = Array.isArray(aptRes.data) ? aptRes.data : [];
    setApartments(aptList);
    const statuses = aptList.map((a) => (a.status || "saved").toLowerCase());
    setApartmentCounts({
      total: aptList.length,
      saved: statuses.filter((s) => s === "saved").length,
      touring: statuses.filter((s) => s === "touring").length,
      applying: statuses.filter((s) => s === "applying").length,
      signed: statuses.filter((s) => s === "signed").length,
    });
    setRenterProfile(rpRes.data ?? null);
    const rp = rpRes.data;
    if (rp) {
      const filledCount = RENTER_PROFILE_FIELDS.filter((k) => filled(rp[k])).length;
      setRenterCompletePct(Math.round((filledCount / RENTER_PROFILE_FIELDS.length) * 100));
    } else {
      setRenterCompletePct(0);
    }
    const dc = dcRes.data;
    const allDone = dc && DOCUMENT_CHECKLIST_KEYS.every((k) => dc[k] === true);
    setDocChecklistAllDone(!!allDone);
    const moveIn = upRes.data?.move_in_date;
    if (moveIn) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const moveInDate = new Date(moveIn);
      moveInDate.setHours(0, 0, 0, 0);
      const diffMs = moveInDate - today;
      setWeeksOut(Math.max(0, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000))));
    } else {
      setWeeksOut(null);
    }
  }, [user?.id, isGuest]);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const hasBudgetAndNeighborhoods =
    userProfile?.budget_max != null ||
    (Array.isArray(userProfile?.neighborhoods) && userProfile.neighborhoods.length > 0);
  const hasBudget = userProfile?.budget_max != null;
  const hasNeighborhoods = Array.isArray(userProfile?.neighborhoods) && userProfile.neighborhoods.length > 0;
  // Only treat move_in_date as set when it's a real value (not null/undefined/empty)
  const moveInDateRaw = userProfile?.move_in_date;
  const hasMoveInDate =
    moveInDateRaw != null &&
    String(moveInDateRaw).trim() !== "";
  const hasRenterStart = renterProfile && filled(renterProfile.full_name) && filled(renterProfile.email);
  const hasGuarantor = renterProfile && filled(renterProfile.guarantor_name);
  const { touring: touringCount, applying: applyingCount, signed: signedCount } = apartmentCounts;
  const hasSigned = signedCount >= 1;
  const hasApplyingOrLater = applyingCount >= 1 || hasSigned;
  const hasTouringOrLater = touringCount >= 1 || hasApplyingOrLater;
  const hasTouring3OrLater = touringCount >= 3 || hasApplyingOrLater;

  const tasks = [
    { phase: 1, phaseLabel: "Set Up Your Search", weekRange: "8+ weeks out", tasks: [
      { id: "move-in", title: "Set your move-in date", done: hasMoveInDate },
      { id: "set-budget", title: "Set budget", done: hasBudget },
      { id: "choose-neighborhoods", title: "Choose neighborhoods", done: hasNeighborhoods },
    ]},
    { phase: 2, phaseLabel: "Build Your List", weekRange: "6–8 weeks out", tasks: [
      { id: "first-apt", title: "Save your first apartment", done: apartments.length >= 1 },
      { id: "five-apt", title: "Save at least 5 apartments", done: apartments.length >= 5 },
      { id: "research-hood", title: "Research your target neighborhoods", done: hasBudgetAndNeighborhoods },
    ]},
    { phase: 3, phaseLabel: "Get Document Ready", weekRange: "4–6 weeks out", tasks: [
      { id: "renter-complete", title: "Complete your renter profile", done: renterCompletePct >= 80 },
      { id: "compile-docs", title: "Check off documents", subtitle: "Check off each document in your War Chest once you have it ready.", done: docChecklistAllDone },
      { id: "export-pro", title: "Export your application package", subtitle: "Export a professional PDF package brokers love." },
    ]},
    { phase: 4, phaseLabel: "Start Touring", weekRange: "3–4 weeks out", tasks: [
      { id: "first-tour", title: "Book your first tour", done: hasTouringOrLater },
      { id: "tour-3", title: "Tour at least 3 apartments", done: hasTouring3OrLater },
    ]},
    { phase: 5, phaseLabel: "Apply", weekRange: "1–3 weeks out", tasks: [
      { id: "first-apply", title: "Submit your first application", done: hasApplyingOrLater },
      { id: "send-package-pro", title: "Send your LaunchNYC application package", subtitle: "Stand out with a professional single-file application." },
    ]},
    { phase: 6, phaseLabel: "Sign & Move In", weekRange: "0–1 weeks out", tasks: [
      { id: "sign-lease", title: "Sign your lease", done: hasSigned },
      { id: "insurance", title: "Set up renters insurance", subtitle: "Required by most NYC leases" },
      { id: "get-keys", title: "Get keys" },
    ]},
  ];

  const allTasks = tasks.flatMap((p) => p.tasks);
  const unlockedTasks = allTasks.filter((t) => !t.locked && !t.banner);
  const doneCount = unlockedTasks.filter((t) => t.done).length;
  const totalUnlocked = unlockedTasks.length;

  const profileSetUp = hasBudgetAndNeighborhoods && hasMoveInDate;
  const progressMilestones = [
    profileSetUp,
    apartments.length >= 3,
    touringCount >= 1,
    applyingCount >= 1,
    signedCount >= 1,
  ];
  const milestonesDone = progressMilestones.filter(Boolean).length;
  const progressRealPct =
    (profileSetUp ? 20 : 0) +
    (apartments.length >= 3 ? 20 : 0) +
    (touringCount >= 1 ? 20 : 0) +
    (applyingCount >= 1 ? 20 : 0) +
    (signedCount >= 1 ? 20 : 0);
  const mainFillPct = signedCount >= 1 ? 100 : (progressMilestones.slice(0, 4).filter(Boolean).length / 4) * 95;

  const progressCaption =
    progressRealPct < 40
      ? null
      : progressRealPct < 80
        ? "Keep going — you're making progress!"
        : progressRealPct < 100
          ? "Almost there — sign your lease!"
          : "You did it! 🎉";

  const getPhaseForWeeks = (w) => {
    if (w == null) return null;
    if (w >= 8) return 1;
    if (w >= 6) return 2;
    if (w >= 4) return 3;
    if (w >= 3) return 4;
    if (w >= 1) return 5;
    return 6;
  };
  const currentPhase = getPhaseForWeeks(weeksOut);

  const phaseStats = tasks.map((p) => {
    const unlockable = p.tasks.filter((t) => !t.locked && !t.banner);
    const doneInPhase = unlockable.filter((t) => t.done).length;
    const pct = unlockable.length > 0 ? Math.round((doneInPhase / unlockable.length) * 100) : 0;
    const nextIncomplete = unlockable.find((t) => !t.done);
    return { total: unlockable.length, done: doneInPhase, allDone: doneInPhase === unlockable.length, pct, nextIncomplete };
  });

  const youAreHerePhase = (() => {
    const firstIncomplete = tasks.find((p) => !phaseStats[p.phase - 1]?.allDone);
    return firstIncomplete ? firstIncomplete.phase : null;
  })();

  const nextTask = (() => {
    for (const phase of tasks) {
      for (const t of phase.tasks) {
        if (!t.locked && !t.banner && !t.done) return { task: t, phase: phase.phase };
      }
    }
    return null;
  })();

  function openDrawer(phaseNum) {
    setDrawerPhase(phaseNum);
  }

  function closeDrawer() {
    setDrawerPhase(null);
  }

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

  if (loading) {
    return (
      <div className="timeline-page">
        <div className="timeline-content-wrap">
          <p className="timeline-loading">Loading timeline…</p>
        </div>
      </div>
    );
  }

  if (!hasMoveInDate) {
    return (
      <div className="timeline-page">
        <div className="timeline-content-wrap">
          {isGuest && <GuestPreviewBanner />}
          <div className="timeline-header">
            <h1 className="timeline-title">Search HQ</h1>
            <Link
              href="/board"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                marginTop: "12px",
                padding: "10px 20px",
                backgroundColor: "#001f3f",
                color: "white",
                fontWeight: 600,
                borderRadius: "9999px",
                textDecoration: "none",
                fontSize: "0.9375rem",
              }}
              onClick={(e) => {
                if (isGuest) {
                  e.preventDefault();
                  openSignUpModal();
                }
              }}
            >
              View My Board →
            </Link>
          </div>
          <div className="timeline-set-date-card">
            <p className="timeline-set-date-text">Set your move-in date to see your personalized timeline and task list.</p>
            <button type="button" className="timeline-set-date-btn" onClick={guard(openOnboardingModal)}>
              Set move-in date
            </button>
          </div>
        </div>
      </div>
    );
  }

  const drawerPhaseData = drawerPhase != null ? tasks.find((p) => p.phase === drawerPhase) : null;

  // Guest static preview: 3 phases with fake progress
  if (isGuest) {
    const guestPhases = [
      { phase: 1, phaseLabel: "Set Up Your Search", weekRange: "8+ weeks out", pct: 100, done: 4, total: 4, nextLine: "✓ All tasks complete" },
      { phase: 2, phaseLabel: "Save Listings", weekRange: "6–8 weeks out", pct: 60, done: 2, total: 4, nextLine: "→ Next: Save at least 5 apartments" },
      { phase: 3, phaseLabel: "Get Document Ready", weekRange: "4–6 weeks out", pct: 0, done: 0, total: 3, nextLine: null },
    ];
    return (
      <div className="timeline-page">
        <div className="timeline-content-wrap">
          {isGuest && <GuestPreviewBanner />}
          <div className="timeline-header">
            <h1 className="timeline-title">Search HQ</h1>
            <p className="timeline-subtitle">
              <span>9 weeks until move-in</span>
            </p>
            <Link
              href="/board"
              className="timeline-board-cta"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                marginTop: "12px",
                padding: "10px 20px",
                backgroundColor: "#001f3f",
                color: "white",
                fontWeight: 600,
                borderRadius: "9999px",
                textDecoration: "none",
                fontSize: "0.9375rem",
              }}
              onClick={(e) => {
                e.preventDefault();
                openSignUpModal();
              }}
            >
              View My Board →
            </Link>
          </div>
          <div className="timeline-progress-card">
            <div className="timeline-progress-top">
              <div className="timeline-progress-header">
                <span className="timeline-progress-label">Overall progress</span>
                <span className="timeline-progress-pct">53%</span>
              </div>
              <button type="button" className="timeline-next-up" onClick={guard(() => {})}>
                Next up: Save at least 5 apartments
              </button>
            </div>
            <div className="timeline-progress-track">
              <div className="timeline-progress-fill" style={{ width: "53%" }} />
            </div>
            <p className="timeline-progress-caption">6 of 11 tasks complete</p>
          </div>
          <div className="timeline-grid">
            {guestPhases.map((phase, idx) => (
              <button
                key={phase.phase}
                type="button"
                className={`timeline-phase-card ${idx === 1 ? "timeline-phase-card-active" : ""}`}
                onClick={guard(() => {})}
              >
                {idx === 1 && (
                  <div className="timeline-phase-card-you-are-here">
                    <span className="timeline-pulse-dot" />
                    <span>You are here</span>
                  </div>
                )}
                <div className={`timeline-phase-card-check ${phase.pct === 100 ? "timeline-phase-card-check-done" : ""}`}>
                  {phase.pct === 100 ? (
                    <span className="timeline-phase-card-check-inner">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  ) : (
                    <span className="timeline-phase-card-check-empty" />
                  )}
                </div>
                <h2 className="timeline-phase-card-title">{phase.phaseLabel}</h2>
                <span className="timeline-phase-card-pill">{phase.weekRange}</span>
                <div className="timeline-phase-card-bar-wrap">
                  <div className="timeline-phase-card-bar" style={{ width: `${phase.pct}%` }} />
                </div>
                <p className="timeline-phase-card-count">{phase.done} of {phase.total} tasks</p>
                {phase.nextLine && (
                  <p className={`timeline-phase-card-next ${phase.pct === 100 ? "timeline-phase-card-next-done" : ""}`}>
                    {phase.nextLine}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-page">
      <div className="timeline-content-wrap">
        <div className="timeline-header">
          <h1 className="timeline-title">Search HQ</h1>
          <p className="timeline-subtitle">
            {weeksOut !== null && <span>{weeksOut} weeks until move-in</span>}
          </p>
          <Link
            href="/board"
            className="timeline-board-cta"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              marginTop: "12px",
              padding: "10px 20px",
              backgroundColor: "#001f3f",
              color: "white",
              fontWeight: 600,
              borderRadius: "9999px",
              textDecoration: "none",
              fontSize: "0.9375rem",
            }}
            onClick={(e) => {
              if (isGuest) {
                e.preventDefault();
                openSignUpModal();
              }
            }}
          >
            View My Board →
          </Link>
        </div>

        <div className="timeline-progress-card">
          <div className="timeline-progress-top">
            <div className="timeline-progress-header">
              <span className="timeline-progress-label">Overall progress</span>
              <span className="timeline-progress-pct" aria-label={`${progressRealPct} percent`}>{progressRealPct}%</span>
            </div>
            {nextTask && (
              <button
                type="button"
                className="timeline-next-up"
                onClick={guard(() => openDrawer(nextTask.phase))}
              >
                Next up: {nextTask.task.title}
              </button>
            )}
          </div>
          <div className="timeline-progress-track">
            <div className="timeline-progress-fill" style={{ width: `${mainFillPct}%` }} />
            {progressRealPct >= 80 && progressRealPct < 100 && (
              <div className="timeline-progress-final-segment" aria-hidden>
                <span className="timeline-progress-final-label">Almost there — sign your lease!</span>
              </div>
            )}
          </div>
          {progressCaption && (
            <p className="timeline-progress-caption timeline-progress-caption-final">{progressCaption}</p>
          )}
          <p className="timeline-progress-caption">{milestonesDone} of 5 milestones</p>
        </div>

        <div className="timeline-grid">
          {tasks.map((phase) => {
            const isActive = youAreHerePhase === phase.phase;
            const stat = phaseStats[phase.phase - 1];
            const nextLine = stat?.allDone
              ? "✓ All tasks complete"
              : stat?.nextIncomplete
                ? `→ Next: ${stat.nextIncomplete.title}`
                : null;
            return (
              <button
                key={phase.phase}
                type="button"
                className={`timeline-phase-card ${isActive ? "timeline-phase-card-active" : ""}`}
                onClick={guard(() => openDrawer(phase.phase))}
              >
                {isActive && (
                  <div className="timeline-phase-card-you-are-here">
                    <span className="timeline-pulse-dot" />
                    <span>You are here</span>
                  </div>
                )}
                <div className={`timeline-phase-card-check ${stat?.allDone ? "timeline-phase-card-check-done" : ""}`}>
                  {stat?.allDone ? (
                    <span className="timeline-phase-card-check-inner">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  ) : (
                    <span className="timeline-phase-card-check-empty" />
                  )}
                </div>
                <h2 className="timeline-phase-card-title">{phase.phaseLabel}</h2>
                <span className="timeline-phase-card-pill">{phase.weekRange}</span>
                <div className="timeline-phase-card-bar-wrap">
                  <div className="timeline-phase-card-bar" style={{ width: `${stat?.pct ?? 0}%` }} />
                </div>
                <p className="timeline-phase-card-count">{stat ? `${stat.done} of ${stat.total} tasks` : "0 tasks"}</p>
                {nextLine && (
                  <p className={`timeline-phase-card-next ${stat?.allDone ? "timeline-phase-card-next-done" : ""}`}>
                    {nextLine}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Drawer overlay */}
      <div
        className={`timeline-drawer-overlay ${drawerPhase != null ? "show" : ""}`}
        onClick={guard(closeDrawer)}
        onKeyDown={(e) => e.key === "Escape" && guard(closeDrawer)()}
        role="button"
        tabIndex={-1}
        aria-hidden={drawerPhase == null}
      />

      {/* Drawer */}
      <div className={`timeline-drawer ${drawerPhase != null ? "open" : ""}`} role="dialog" aria-label="Phase tasks">
        {drawerPhaseData && (
          <>
            <div className="timeline-drawer-head">
              <h2 className="timeline-drawer-title">{drawerPhaseData.phaseLabel}</h2>
              <button type="button" className="timeline-drawer-close" onClick={guard(closeDrawer)} aria-label="Close">✕</button>
            </div>
            <div className="timeline-drawer-body">
              {drawerPhaseData.tasks.map((task) => {
                if (task.banner) {
                  return (
                    <div key={task.id || "banner"} className="timeline-drawer-task timeline-drawer-banner">
                      <p>{task.text}</p>
                    </div>
                  );
                }
                const isCurrentPhase = currentPhase === drawerPhaseData.phase;
                const status = task.locked ? "locked" : task.done ? "done" : (isCurrentPhase ? "in_progress" : "upcoming");
                const href = TASK_HREF[task.id];
                const content = (
                  <>
                    <div className="timeline-drawer-task-icon">
                      {task.locked ? (
                        <span className="timeline-icon-lock" aria-hidden>🔒</span>
                      ) : task.done ? (
                        <span className="timeline-icon-done-circle" aria-hidden>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </span>
                      ) : status === "in_progress" ? (
                        <span className="timeline-icon-progress" aria-hidden />
                      ) : (
                        <span className="timeline-icon-upcoming" aria-hidden />
                      )}
                    </div>
                    <div className="timeline-drawer-task-body">
                      <div className="timeline-drawer-task-title">{task.title}</div>
                      {task.subtitle && <p className="timeline-drawer-task-subtitle">{task.subtitle}</p>}
                    </div>
                    {!task.done && !task.locked && href && <span className="timeline-drawer-task-arrow">→</span>}
                  </>
                );
                return (
                  <div key={task.id} className={`timeline-drawer-task timeline-drawer-task-${status} ${task.locked ? "timeline-drawer-task-locked" : ""}`}>
                    {href && !task.done ? (
                      <Link
                        href={href}
                        className="timeline-drawer-task-link"
                        onClick={(e) => {
                          if (isGuest) {
                            e.preventDefault();
                            openSignUpModal();
                            return;
                          }
                          closeDrawer();
                        }}
                      >
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
