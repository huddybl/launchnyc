"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import GuestPreviewBanner from "@/components/GuestPreviewBanner";
import "./documents.css";

const CHECKLIST_ITEMS = [
  { key: "government_id", label: "Government-issued ID", helperText: "Passport or driver's license" },
  { key: "offer_letter", label: "Signed offer letter", helperText: "Proves your income source to landlords" },
  { key: "pay_stubs", label: "Last 2 pay stubs", helperText: "Shows consistent income" },
  { key: "bank_statements", label: "Last 2 bank statements", helperText: "Confirms savings and spending" },
  { key: "tax_return", label: "Most recent tax return", helperText: "Full year income verification" },
  { key: "guarantor_docs", label: "Guarantor tax return + income proof", helperText: "Required if using a guarantor" },
  { key: "credit_report", label: "Credit report", helperText: "Landlords will pull this — know your score first" },
  { key: "reference_letter", label: "Reference letter from previous landlord", helperText: "Strongest trust signal you can provide" },
];

const DOCUMENT_PATH_COLUMNS = {
  government_id: "gov_id_path",
  offer_letter: "offer_letter_path",
  pay_stubs: "pay_stubs_path",
  bank_statements: "bank_statements_path",
  tax_return: "tax_return_path",
  guarantor_docs: "guarantor_docs_path",
  credit_report: "credit_report_path",
  reference_letter: "reference_letter_path",
};

const BUCKET_NAME = "renter-documents";

const defaultProfile = {
  full_name: "",
  date_of_birth: "",
  email: "",
  phone: "",
  current_address: "",
  apt_suite: "",
  city: "",
  state: "",
  zip_code: "",
  years_at_address: "",
  current_landlord_name: "",
  current_monthly_rent: "",
  reason_for_leaving: "",
  employer_name: "",
  employer_address: "",
  employer_city: "",
  employer_state: "",
  employer_zip: "",
  employer_phone: "",
  job_title: "",
  annual_salary: "",
  start_date: "",
  supervisor_name: "",
  previous_address: "",
  previous_city: "",
  previous_state: "",
  previous_zip: "",
  previous_landlord_name: "",
  previous_landlord_phone: "",
  guarantor_name: "",
  guarantor_relationship: "",
  guarantor_email: "",
  guarantor_phone: "",
  guarantor_income: "",
  guarantor_address: "",
  guarantor_city: "",
  guarantor_state: "",
  guarantor_zip: "",
  reference_name: "",
  reference_phone: "",
  emergency_name: "",
  emergency_phone: "",
};

const defaultChecklist = {
  government_id: false,
  offer_letter: false,
  pay_stubs: false,
  bank_statements: false,
  tax_return: false,
  guarantor_docs: false,
  credit_report: false,
  reference_letter: false,
};

const defaultFileNames = {};

const TAB_IDS = ["personal", "employment", "previous_guarantor", "references", "documents"];
const TAB_LABELS = {
  personal: "Personal",
  employment: "Employment",
  previous_guarantor: "Prev & Guarantor",
  references: "References",
  documents: "Documents",
};

const YEARS_AT_ADDRESS_OPTIONS = [
  "Less than 1 year",
  "1 year",
  "2 years",
  "3 years",
  "4 years",
  "5 years",
  "6 years",
  "7 years",
  "8 years",
  "9 years",
  "10 years",
  "11 years",
  "12 years",
  "13 years",
  "14 years",
  "15 years",
  "16 years",
  "17 years",
  "18 years",
  "19 years",
  "20+ years",
];

const REASON_FOR_LEAVING_OPTIONS = [
  "Graduating / starting new job",
  "Lease ending",
  "Relocating to NYC",
  "Upgrading to larger space",
  "Downsizing",
  "Moving in with partner",
  "Too expensive",
  "Building issues",
  "Neighborhood change",
  "Other (please specify)",
];

function formatPhone(value) {
  const digits = (String(value || "")).replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function formatSalaryDisplay(value) {
  const digits = (String(value || "")).replace(/\D/g, "");
  if (!digits) return "";
  return "$" + Number(digits).toLocaleString();
}

function parseSalaryToDigits(value) {
  return (String(value || "")).replace(/\D/g, "");
}

function parsePhoneToDigits(value) {
  return (String(value || "")).replace(/\D/g, "").slice(0, 10);
}

function phoneDigitCount(value) {
  return (String(value || "")).replace(/\D/g, "").length;
}

function filled(str) {
  if (str == null) return false;
  if (typeof str === "number" && !Number.isNaN(str)) return true;
  return typeof str === "string" && str.trim() !== "";
}

function sectionStatus(fields) {
  const keys = Object.keys(fields);
  const count = keys.filter((k) => filled(fields[k])).length;
  if (count === 0) return "Missing";
  if (count === keys.length) return "Complete";
  return "Partial";
}

export default function DocumentsPage() {
  const { user, isGuest, openSignUpModal } = useAuth();
  const [profile, setProfile] = useState(defaultProfile);
  const [checklist, setChecklist] = useState(defaultChecklist);
  const [fileNames, setFileNames] = useState(defaultFileNames);
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState(null);
  const [uploadingKey, setUploadingKey] = useState(null);
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  const [exportPdfLoading, setExportPdfLoading] = useState(false);
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("personal");
  const fileInputRefs = useRef({});

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

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    const [
      { data: p, error: profileError },
      { data: dcRow, error: checklistError },
    ] = await Promise.all([
      supabase.from("renter_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("document_checklist").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    if (profileError) {
      console.error("[Documents] fetchData renter_profiles error:", profileError);
      return;
    }
    if (checklistError) {
      console.error("[Documents] fetchData document_checklist error:", checklistError);
    }
    const nextChecklist = {};
    CHECKLIST_ITEMS.forEach(({ key }) => {
      nextChecklist[key] = dcRow && dcRow[key] === true;
    });
    setChecklist(nextChecklist);

    if (p) {
      setProfile({
        full_name: p.full_name ?? "",
        date_of_birth: p.date_of_birth ?? "",
        email: p.email ?? "",
        phone: p.phone ? formatPhone(p.phone) : "",
        current_address: p.current_address ?? "",
        apt_suite: p.apt_suite ?? "",
        city: p.city ?? "",
        state: p.state ?? "",
        zip_code: p.zip_code ?? "",
        years_at_address: p.years_at_address ?? "",
        current_landlord_name: p.current_landlord_name ?? "",
        current_monthly_rent: p.current_monthly_rent ?? "",
        reason_for_leaving: p.reason_for_leaving ?? "",
        employer_name: p.employer_name ?? "",
        employer_address: p.employer_address ?? "",
        employer_city: p.employer_city ?? "",
        employer_state: p.employer_state ?? "",
        employer_zip: p.employer_zip ?? "",
        employer_phone: p.employer_phone ? formatPhone(p.employer_phone) : "",
        job_title: p.job_title ?? "",
        annual_salary: p.annual_salary ?? "",
        start_date: p.start_date ?? "",
        supervisor_name: p.supervisor_name ?? "",
        previous_address: p.previous_address ?? "",
        previous_city: p.previous_city ?? "",
        previous_state: p.previous_state ?? "",
        previous_zip: p.previous_zip ?? "",
        previous_landlord_name: p.previous_landlord_name ?? "",
        previous_landlord_phone: p.previous_landlord_phone ? formatPhone(p.previous_landlord_phone) : "",
        guarantor_name: p.guarantor_name ?? "",
        guarantor_relationship: p.guarantor_relationship ?? "",
        guarantor_email: p.guarantor_email ?? "",
        guarantor_phone: p.guarantor_phone ? formatPhone(p.guarantor_phone) : "",
        guarantor_income: p.guarantor_income ?? "",
        guarantor_address: p.guarantor_address ?? "",
        guarantor_city: p.guarantor_city ?? "",
        guarantor_state: p.guarantor_state ?? "",
        guarantor_zip: p.guarantor_zip ?? "",
        reference_name: p.reference_name ?? "",
        reference_phone: p.reference_phone ? formatPhone(p.reference_phone) : "",
        emergency_name: p.emergency_name ?? "",
        emergency_phone: p.emergency_phone ? formatPhone(p.emergency_phone) : "",
      });
      const nextFileNames = {};
      CHECKLIST_ITEMS.forEach(({ key }) => {
        const pathCol = DOCUMENT_PATH_COLUMNS[key];
        const path = p[pathCol];
        nextFileNames[key] = path ? (path.split("/").pop() || `${key}.pdf`) : "";
      });
      setFileNames(nextFileNames);
    } else {
      setProfile(defaultProfile);
      setFileNames(defaultFileNames);
    }
  }, [user?.id]);

  async function toggleChecklistItem(key, checked) {
    if (isGuest) {
      openSignUpModal();
      return;
    }
    if (!user?.id) return;
    const nextChecklist = { ...checklist, [key]: checked };
    setChecklist(nextChecklist);

    const { data: existing } = await supabase
      .from("document_checklist")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("document_checklist")
        .update({ [key]: checked })
        .eq("user_id", user.id));
    } else {
      ({ error } = await supabase
        .from("document_checklist")
        .insert({ user_id: user.id, [key]: checked }));
    }
    if (error) {
      console.error("[Documents] document_checklist error:", JSON.stringify(error));
      setChecklist((prev) => ({ ...prev, [key]: !checked }));
    }
  }

  useEffect(() => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    if (!user?.id) {
      return;
    }
    fetchData().finally(() => setLoading(false));
  }, [user?.id, isGuest, fetchData]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "5") {
      setActiveTab("documents");
    }
  }, [searchParams]);

  function updateProfile(updates) {
    setProfile((prev) => ({ ...prev, ...updates }));
  }

  function handleBlurSave() {
    if (isGuest) {
      openSignUpModal();
      return;
    }
    saveAllProfile();
  }

  async function handleExportPackage() {
    if (!user?.id) return;
    setExportPdfLoading(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          checklist,
          apartment: null,
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
      setSaveMessage({ type: "success", text: "Download started." });
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (e) {
      console.error("[Documents] Export PDF failed:", e);
      setSaveMessage({ type: "error", text: e?.message ?? "Failed to generate PDF" });
    } finally {
      setExportPdfLoading(false);
    }
  }

  async function saveAllProfile(overrides = null) {
    if (isGuest) {
      openSignUpModal();
      return;
    }
    const uid = user?.id;
    if (!uid) {
      console.error("[Documents] saveAllProfile: no user.id from auth session", { user: user ?? null });
      setSaveMessage({ type: "error", text: "Not signed in. Please refresh and try again." });
      return;
    }
    const p = overrides ? { ...profileRef.current, ...overrides } : profileRef.current;
    setSaveMessage(null);
    try {
      const salaryDigits = parseSalaryToDigits(p.annual_salary);
      const guarantorIncomeDigits = parseSalaryToDigits(p.guarantor_income);
      const payload = {
        user_id: uid,
        full_name: (p.full_name ?? "").trim() || null,
        date_of_birth: p.date_of_birth || null,
        email: (p.email ?? "").trim() || null,
        phone: parsePhoneToDigits(p.phone) || null,
        current_address: (p.current_address ?? "").trim() || null,
        apt_suite: (p.apt_suite ?? "").trim() || null,
        city: (p.city ?? "").trim() || null,
        state: (p.state ?? "").trim() || null,
        zip_code: (p.zip_code ?? "").trim() || null,
        years_at_address: (p.years_at_address ?? "").trim() || null,
        current_landlord_name: (p.current_landlord_name ?? "").trim() || null,
        current_monthly_rent: parseSalaryToDigits(p.current_monthly_rent) || null,
        reason_for_leaving: (p.reason_for_leaving ?? "").trim() || null,
        employer_name: (p.employer_name ?? "").trim() || null,
        employer_address: (p.employer_address ?? "").trim() || null,
        employer_city: (p.employer_city ?? "").trim() || null,
        employer_state: (p.employer_state ?? "").trim() || null,
        employer_zip: (p.employer_zip ?? "").trim() || null,
        employer_phone: parsePhoneToDigits(p.employer_phone) || null,
        job_title: (p.job_title ?? "").trim() || null,
        annual_salary: salaryDigits || null,
        start_date: p.start_date || null,
        supervisor_name: (p.supervisor_name ?? "").trim() || null,
        previous_address: (p.previous_address ?? "").trim() || null,
        previous_city: (p.previous_city ?? "").trim() || null,
        previous_state: (p.previous_state ?? "").trim() || null,
        previous_zip: (p.previous_zip ?? "").trim() || null,
        previous_landlord_name: (p.previous_landlord_name ?? "").trim() || null,
        previous_landlord_phone: parsePhoneToDigits(p.previous_landlord_phone) || null,
        guarantor_name: (p.guarantor_name ?? "").trim() || null,
        guarantor_relationship: (p.guarantor_relationship ?? "").trim() || null,
        guarantor_email: (p.guarantor_email ?? "").trim() || null,
        guarantor_phone: parsePhoneToDigits(p.guarantor_phone) || null,
        guarantor_income: guarantorIncomeDigits || null,
        guarantor_address: (p.guarantor_address ?? "").trim() || null,
        guarantor_city: (p.guarantor_city ?? "").trim() || null,
        guarantor_state: (p.guarantor_state ?? "").trim() || null,
        guarantor_zip: (p.guarantor_zip ?? "").trim() || null,
        reference_name: (p.reference_name ?? "").trim() || null,
        reference_phone: parsePhoneToDigits(p.reference_phone) || null,
        emergency_name: (p.emergency_name ?? "").trim() || null,
        emergency_phone: parsePhoneToDigits(p.emergency_phone) || null,
      };
      const { error } = await supabase
        .from("renter_profiles")
        .upsert(payload, { onConflict: "user_id" });
      if (error) {
        console.error("[Documents] saveAllProfile: upsert failed", error);
        setSaveMessage({ type: "error", text: error.message || "Failed to save. Check console for details." });
        return;
      }
      setSaveMessage({ type: "success", text: "Saved" });
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (err) {
      console.error("[Documents] saveAllProfile: exception", err);
      setSaveMessage({ type: "error", text: err?.message || "Failed to save. Please try again." });
    }
  }

  async function handleDocumentUpload(key, file) {
    if (!file || !file.name?.toLowerCase().endsWith(".pdf") || !user?.id) return;
    const pathCol = DOCUMENT_PATH_COLUMNS[key];
    const storagePath = `${user.id}/${key}.pdf`;
    setUploadingKey(key);
    try {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, file, { upsert: true, contentType: "application/pdf" });
      if (uploadError) throw uploadError;
      const { data: updated } = await supabase
        .from("renter_profiles")
        .update({ [pathCol]: storagePath })
        .eq("user_id", user.id)
        .select();
      if (!updated?.length) {
        await supabase
          .from("renter_profiles")
          .upsert({ user_id: user.id, [pathCol]: storagePath }, { onConflict: "user_id" });
      }
      setChecklist((prev) => ({ ...prev, [key]: true }));
      setFileNames((prev) => ({ ...prev, [key]: file.name }));
    } catch (err) {
      console.error("[Documents] Upload failed:", err);
    } finally {
      setUploadingKey(null);
    }
  }

  async function clearDocument(key) {
    if (!user?.id) return;
    const pathCol = DOCUMENT_PATH_COLUMNS[key];
    try {
      await supabase
        .from("renter_profiles")
        .update({ [pathCol]: null })
        .eq("user_id", user.id);
      setChecklist((prev) => ({ ...prev, [key]: false }));
      setFileNames((prev) => ({ ...prev, [key]: undefined }));
    } catch (err) {
      console.error("[Documents] clearDocument failed:", err);
    }
  }

  const stepStatus = useMemo(() => {
    const personalRequiredFields = {
      full_name: profile.full_name,
      date_of_birth: profile.date_of_birth,
      email: profile.email,
      phone: profile.phone,
      current_address: profile.current_address,
      city: profile.city,
      state: profile.state,
      zip_code: profile.zip_code,
      years_at_address: profile.years_at_address,
    };
    const addressRequiredFilled =
      filled(profile.current_address) &&
      filled(profile.city) &&
      filled(profile.state) &&
      filled(profile.zip_code);
    const basePersonalStatus = sectionStatus(personalRequiredFields);
    const personalStatus =
      basePersonalStatus === "Complete" && !addressRequiredFilled
        ? "Partial"
        : basePersonalStatus;
    const employmentRequiredFields = [
      "employer_name",
      "employer_address",
      "employer_phone",
      "job_title",
      "annual_salary",
      "start_date",
      "supervisor_name",
    ];
    const employmentFieldsObj = Object.fromEntries(
      employmentRequiredFields.map((key) => [key, profile[key]])
    );
    const employmentStatus = sectionStatus(employmentFieldsObj);
    const previousStatus = sectionStatus({
      previous_address: profile.previous_address,
      previous_city: profile.previous_city,
      previous_state: profile.previous_state,
      previous_zip: profile.previous_zip,
      previous_landlord_name: profile.previous_landlord_name,
      previous_landlord_phone: profile.previous_landlord_phone,
    });
    const guarantorStatus = sectionStatus({
      guarantor_name: profile.guarantor_name,
      guarantor_relationship: profile.guarantor_relationship,
      guarantor_email: profile.guarantor_email,
      guarantor_phone: profile.guarantor_phone,
      guarantor_income: profile.guarantor_income,
      guarantor_address: profile.guarantor_address,
    });
    const referencesStatus = sectionStatus({
      reference_name: profile.reference_name,
      reference_phone: profile.reference_phone,
      emergency_name: profile.emergency_name,
      emergency_phone: profile.emergency_phone,
    });

    const previousGuarantorStatus =
      previousStatus === "Complete" && guarantorStatus === "Complete"
        ? "Complete"
        : previousStatus === "Missing" && guarantorStatus === "Missing"
          ? "Missing"
          : "Partial";

    const checklistCheckedCount = Object.values(checklist).filter(Boolean).length;
    const documentsStatus =
      checklistCheckedCount === CHECKLIST_ITEMS.length
        ? "Complete"
        : checklistCheckedCount === 0
          ? "Missing"
          : "Partial";

    const tabStatus = {
      personal: personalStatus,
      employment: employmentStatus,
      previous_guarantor: previousGuarantorStatus,
      references: referencesStatus,
      documents: documentsStatus,
    };

    const profileSectionsComplete = [
      personalStatus,
      employmentStatus,
      previousStatus,
      guarantorStatus,
      referencesStatus,
    ].filter((s) => s === "Complete").length;
    const profilePct = Math.round((profileSectionsComplete / 5) * 100);
    const documentsPct = Math.round((checklistCheckedCount / CHECKLIST_ITEMS.length) * 100);
    const combinedPct = Math.round((profilePct + documentsPct) / 2);

    return {
      tabStatus,
      profilePct,
      documentsPct,
      combinedPct,
    };
  }, [profile, checklist]);

  const { tabStatus, profilePct, documentsPct, combinedPct } = stepStatus;
  const inputBase =
    "w-full rounded-lg border border-gray-200 bg-[#f4f6f9] px-3 py-2.5 text-sm text-[#0f1826] outline-none transition-colors focus:border-[#001f3f] focus:bg-white";
  const inputPhoneInvalid = "border-red-500 focus:border-red-500";
  const labelBase = "mb-1 block text-xs font-medium text-[#6b7a8d]";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  const activeIndex = TAB_IDS.indexOf(activeTab);

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-[#0f1826]">
      {isGuest && <GuestPreviewBanner />}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          {/* Main content: full width of first column */}
          <div className="min-w-0 space-y-6">
            {/* Hero banner */}
            <header className="rounded-2xl bg-[#001f3f] px-8 py-8 text-white shadow-lg">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Your Application Profile
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/95">
                Every NYC apartment application asks for the same information. Fill it out once here, and you're done forever. One profile, instantly exported for every application you send — so you can move faster than everyone else.
              </p>
            </header>

            {/* Fixed-position save toast so it never pushes content or causes scroll jump */}
            {saveMessage && (
              <div
                role="alert"
                aria-live="polite"
                className={`fixed left-1/2 top-6 z-50 -translate-x-1/2 inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium shadow-md saved-toast-brief ${
                  saveMessage.type === "success"
                    ? "border border-[#a8d5bc] bg-[#eef7f2] text-[#1a6640]"
                    : "rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3"
                }`}
              >
                {saveMessage.text}
              </div>
            )}

            {/* Horizontal stepper: even distribution — step, line, step, line, ... with lines flexing equally */}
            <nav className="w-full min-w-0 overflow-hidden rounded-2xl border border-[#e8ecf2] bg-white px-2 py-4 shadow-sm sm:px-4 sm:py-5 md:px-6" aria-label="Application steps">
              <div className="flex w-full items-start">
                {TAB_IDS.map((tabId, index) => {
                  const isActive = activeTab === tabId;
                  const isCompleted = tabStatus[tabId] === "Complete";
                  const segmentGreen = index < activeIndex;
                  return (
                    <span key={tabId} className="contents">
                      <div className="flex flex-shrink-0 flex-col items-center">
                        <button
                          type="button"
                          onClick={guard(() => setActiveTab(tabId))}
                          className="flex flex-col items-center gap-1.5"
                        >
                          <span
                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors ${
                              isActive
                                ? "border-[#001f3f] bg-[#001f3f] text-white"
                                : isCompleted
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : "border-[#d1d5db] bg-white text-[#9ca3af]"
                            }`}
                            style={{ height: 40, width: 40 }}
                          >
                            {isCompleted && !isActive ? (
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            ) : (
                              index + 1
                            )}
                          </span>
                          <span
                            className={`hidden truncate text-center text-[11px] leading-tight whitespace-nowrap min-[600px]:block max-w-full ${
                              isActive ? "font-semibold text-[#001f3f]" : isCompleted ? "text-[#6b7a8d]" : "text-[#9ca3af]"
                            }`}
                          >
                            {TAB_LABELS[tabId]}
                          </span>
                        </button>
                      </div>
                      {index < TAB_IDS.length - 1 && (
                        <div
                          className={`h-0.5 min-w-2 flex-1 self-center ${segmentGreen ? "bg-emerald-500" : "bg-[#e8ecf2]"}`}
                          style={{ marginTop: 20 }}
                          aria-hidden
                        />
                      )}
                    </span>
                  );
                })}
              </div>
            </nav>

            {/* Single visible section based on active tab */}
            <div className="w-full min-w-0 max-w-full rounded-2xl border border-[#e8ecf2] bg-white p-6 shadow-sm">
              {activeTab === "personal" && (
                <>
                  <div className="mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7a8d]">
                      Personal Info
                    </span>
                  </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label className={labelBase}>Full name</label>
                    <input
                      className={inputBase}
                      value={profile.full_name || ""}
                      onChange={(e) => updateProfile({ full_name: e.target.value })}
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className={labelBase}>Date of birth</label>
                    <input
                      type="date"
                      className={inputBase}
                      value={profile.date_of_birth || ""}
                      onChange={(e) => updateProfile({ date_of_birth: e.target.value })}
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className={labelBase}>Email</label>
                    <input
                      type="email"
                      className={inputBase}
                      value={profile.email || ""}
                      onChange={(e) => updateProfile({ email: e.target.value })}
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className={labelBase}>Phone</label>
                    <input
                      type="tel"
                      className={`${inputBase} ${phoneDigitCount(profile.phone) > 0 && phoneDigitCount(profile.phone) < 10 ? inputPhoneInvalid : ""}`}
                      value={profile.phone || ""}
                      onChange={(e) =>
                        updateProfile({ phone: formatPhone(e.target.value) })
                      }
                      onBlur={handleBlurSave}
                      placeholder="(555) 123-4567"
                      maxLength={14}
                    />
                  </div>
                  <div className="col-span-2 min-w-0">
                    <label className={labelBase}>Street address</label>
                    <input
                      type="text"
                      className={inputBase}
                      placeholder="Enter street address"
                      value={profile.current_address || ""}
                      onChange={(e) => updateProfile({ current_address: e.target.value })}
                      onBlur={handleBlurSave}
                      aria-label="Street address"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className={labelBase}>Apt / Suite</label>
                    <input
                      className={inputBase}
                      value={profile.apt_suite || ""}
                      onChange={(e) =>
                        updateProfile({ apt_suite: e.target.value })
                      }
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className={labelBase}>City</label>
                    <input
                      className={inputBase}
                      value={profile.city || ""}
                      onChange={(e) => updateProfile({ city: e.target.value })}
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className={labelBase}>State</label>
                    <input
                      className={inputBase}
                      value={profile.state || ""}
                      onChange={(e) => updateProfile({ state: e.target.value })}
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className={labelBase}>Zip code</label>
                    <input
                      className={inputBase}
                      value={profile.zip_code || ""}
                      onChange={(e) =>
                        updateProfile({ zip_code: e.target.value.replace(/\D/g, "").slice(0, 10) })
                      }
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className={labelBase}>Years at current address</label>
                    <select
                      className={inputBase}
                      value={profile.years_at_address || ""}
                      onChange={(e) => updateProfile({ years_at_address: e.target.value })}
                      onBlur={handleBlurSave}
                    >
                      <option value="">Select…</option>
                      {YEARS_AT_ADDRESS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label className={labelBase}>Current landlord name</label>
                    <input
                      className={inputBase}
                      value={profile.current_landlord_name || ""}
                      onChange={(e) => updateProfile({ current_landlord_name: e.target.value })}
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className={labelBase}>Monthly rent at current address</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className={inputBase}
                      value={formatSalaryDisplay(profile.current_monthly_rent) || ""}
                      onChange={(e) =>
                        updateProfile({
                          current_monthly_rent: parseSalaryToDigits(e.target.value),
                        })
                      }
                      onBlur={handleBlurSave}
                      placeholder="$0"
                    />
                  </div>
                  <div className="col-span-2 min-w-0">
                    <label className={labelBase}>Reason for leaving</label>
                    <select
                      className={inputBase}
                      value={
                        REASON_FOR_LEAVING_OPTIONS.includes(profile.reason_for_leaving || "")
                          ? (profile.reason_for_leaving || "")
                          : "Other (please specify)"
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "Other (please specify)") {
                          updateProfile({
                            reason_for_leaving: profile.reason_for_leaving && !REASON_FOR_LEAVING_OPTIONS.includes(profile.reason_for_leaving)
                              ? profile.reason_for_leaving
                              : "",
                          });
                        } else {
                          updateProfile({ reason_for_leaving: v });
                        }
                      }}
                      onBlur={handleBlurSave}
                    >
                      <option value="">Select…</option>
                      {REASON_FOR_LEAVING_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {!REASON_FOR_LEAVING_OPTIONS.includes(profile.reason_for_leaving || "") && (
                      <div className="mt-2">
                        <label className={labelBase}>Please specify</label>
                        <input
                          className={inputBase}
                          value={profile.reason_for_leaving || ""}
                          onChange={(e) => updateProfile({ reason_for_leaving: e.target.value })}
                          onBlur={handleBlurSave}
                          placeholder="Your reason"
                        />
                      </div>
                    )}
                  </div>
                </div>
                  <div className="mt-6 flex border-t border-[#e8ecf2] pt-6">
                    <button
                      type="button"
                      onClick={guard(() => { saveAllProfile(); setActiveTab("employment"); })}
                      className="w-full rounded-lg bg-[#001f3f] px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
                    >
                      Save & Continue →
                    </button>
                  </div>
                </>
              )}

              {activeTab === "employment" && (
                <>
                  <div className="mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7a8d]">
                      Employment
                    </span>
                  </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={labelBase}>Employer name</label>
                    <input
                      className={inputBase}
                      value={profile.employer_name || ""}
                      onChange={(e) => updateProfile({ employer_name: e.target.value })}
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={labelBase}>Employer address</label>
                    <input
                      type="text"
                      className={inputBase}
                      placeholder="Enter employer address"
                      value={profile.employer_address || ""}
                      onChange={(e) => updateProfile({ employer_address: e.target.value })}
                      onBlur={handleBlurSave}
                      aria-label="Employer address"
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Employer city</label>
                    <input
                      className={inputBase}
                      value={profile.employer_city || ""}
                      onChange={(e) => updateProfile({ employer_city: e.target.value })}
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Employer state</label>
                    <input
                      className={inputBase}
                      value={profile.employer_state || ""}
                      onChange={(e) => updateProfile({ employer_state: e.target.value })}
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Employer zip</label>
                    <input
                      className={inputBase}
                      value={profile.employer_zip || ""}
                      onChange={(e) =>
                        updateProfile({ employer_zip: e.target.value.replace(/\D/g, "").slice(0, 10) })
                      }
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Employer phone</label>
                    <input
                      type="tel"
                      className={`${inputBase} ${phoneDigitCount(profile.employer_phone) > 0 && phoneDigitCount(profile.employer_phone) < 10 ? inputPhoneInvalid : ""}`}
                      value={profile.employer_phone || ""}
                      onChange={(e) =>
                        updateProfile({
                          employer_phone: formatPhone(e.target.value),
                        })
                      }
                      onBlur={handleBlurSave}
                      placeholder="(555) 123-4567"
                      maxLength={14}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Job title</label>
                    <input
                      className={inputBase}
                      value={profile.job_title || ""}
                      onChange={(e) => updateProfile({ job_title: e.target.value })}
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Annual salary</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className={inputBase}
                      value={formatSalaryDisplay(profile.annual_salary) || ""}
                      onChange={(e) =>
                        updateProfile({
                          annual_salary: parseSalaryToDigits(e.target.value),
                        })
                      }
                      onBlur={handleBlurSave}
                      placeholder="$0"
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Start date</label>
                    <input
                      type="date"
                      className={inputBase}
                      value={profile.start_date || ""}
                      onChange={(e) => updateProfile({ start_date: e.target.value })}
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={labelBase}>Supervisor name</label>
                    <input
                      className={inputBase}
                      value={profile.supervisor_name || ""}
                      onChange={(e) => updateProfile({ supervisor_name: e.target.value })}
                      onBlur={handleBlurSave}
                    />
                  </div>
                </div>
                  <div className="mt-6 flex border-t border-[#e8ecf2] pt-6">
                    <button
                      type="button"
                      onClick={guard(() => { saveAllProfile(); setActiveTab("previous_guarantor"); })}
                      className="w-full rounded-lg bg-[#001f3f] px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
                    >
                      Save & Continue →
                    </button>
                  </div>
                </>
              )}

              {activeTab === "previous_guarantor" && (
                <>
                  <div className="mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7a8d]">
                      Previous Address
                    </span>
                  </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={labelBase}>Previous address</label>
                    <input
                      type="text"
                      className={inputBase}
                      placeholder="Enter previous address"
                      value={profile.previous_address || ""}
                      onChange={(e) => updateProfile({ previous_address: e.target.value })}
                      onBlur={handleBlurSave}
                      aria-label="Previous address"
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Previous city</label>
                    <input
                      className={inputBase}
                      value={profile.previous_city || ""}
                      onChange={(e) => updateProfile({ previous_city: e.target.value })}
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Previous state</label>
                    <input
                      className={inputBase}
                      value={profile.previous_state || ""}
                      onChange={(e) => updateProfile({ previous_state: e.target.value })}
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Previous zip</label>
                    <input
                      className={inputBase}
                      value={profile.previous_zip || ""}
                      onChange={(e) =>
                        updateProfile({ previous_zip: e.target.value.replace(/\D/g, "").slice(0, 10) })
                      }
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Previous landlord name</label>
                    <input
                      className={inputBase}
                      value={profile.previous_landlord_name || ""}
                      onChange={(e) =>
                        updateProfile({ previous_landlord_name: e.target.value })
                      }
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Previous landlord phone</label>
                    <input
                      type="tel"
                      className={`${inputBase} ${phoneDigitCount(profile.previous_landlord_phone) > 0 && phoneDigitCount(profile.previous_landlord_phone) < 10 ? inputPhoneInvalid : ""}`}
                      value={profile.previous_landlord_phone || ""}
                      onChange={(e) =>
                        updateProfile({ previous_landlord_phone: formatPhone(e.target.value) })
                      }
                      onBlur={handleBlurSave}
                      placeholder="(555) 123-4567"
                      maxLength={14}
                    />
                  </div>
                </div>
                  <div className="mt-6 mb-6 border-t border-[#e8ecf2] pt-6">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7a8d]">
                      Guarantor
                    </span>
                  </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelBase}>Name</label>
                    <input
                      className={inputBase}
                      value={profile.guarantor_name || ""}
                      onChange={(e) => updateProfile({ guarantor_name: e.target.value })}
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Relationship</label>
                    <input
                      className={inputBase}
                      value={profile.guarantor_relationship || ""}
                      onChange={(e) =>
                        updateProfile({ guarantor_relationship: e.target.value })
                      }
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Email</label>
                    <input
                      type="email"
                      className={inputBase}
                      value={profile.guarantor_email || ""}
                      onChange={(e) => updateProfile({ guarantor_email: e.target.value })}
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Phone</label>
                    <input
                      type="tel"
                      className={`${inputBase} ${phoneDigitCount(profile.guarantor_phone) > 0 && phoneDigitCount(profile.guarantor_phone) < 10 ? inputPhoneInvalid : ""}`}
                      value={profile.guarantor_phone || ""}
                      onChange={(e) => updateProfile({ guarantor_phone: formatPhone(e.target.value) })}
                      onBlur={handleBlurSave}
                      placeholder="(555) 123-4567"
                      maxLength={14}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Annual income</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className={inputBase}
                      value={formatSalaryDisplay(profile.guarantor_income) || ""}
                      onChange={(e) =>
                        updateProfile({ guarantor_income: parseSalaryToDigits(e.target.value) })
                      }
                      onBlur={handleBlurSave}
                      placeholder="$0"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={labelBase}>Address</label>
                    <input
                      type="text"
                      className={inputBase}
                      placeholder="Enter guarantor address"
                      value={profile.guarantor_address || ""}
                      onChange={(e) => updateProfile({ guarantor_address: e.target.value })}
                      onBlur={handleBlurSave}
                      aria-label="Guarantor address"
                    />
                  </div>
                  <div>
                    <label className={labelBase}>City</label>
                    <input
                      className={inputBase}
                      value={profile.guarantor_city || ""}
                      onChange={(e) => updateProfile({ guarantor_city: e.target.value })}
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>State</label>
                    <input
                      className={inputBase}
                      value={profile.guarantor_state || ""}
                      onChange={(e) => updateProfile({ guarantor_state: e.target.value })}
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Zip code</label>
                    <input
                      className={inputBase}
                      value={profile.guarantor_zip || ""}
                      onChange={(e) =>
                        updateProfile({ guarantor_zip: e.target.value.replace(/\D/g, "").slice(0, 10) })
                      }
                      onBlur={handleBlurSave}
                    />
                  </div>
                </div>
                  <div className="mt-6 flex border-t border-[#e8ecf2] pt-6">
                    <button
                      type="button"
                      onClick={guard(() => { saveAllProfile(); setActiveTab("references"); })}
                      className="w-full rounded-lg bg-[#001f3f] px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
                    >
                      Save & Continue →
                    </button>
                  </div>
                </>
              )}

              {activeTab === "references" && (
                <>
                  <div className="mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7a8d]">
                      References & Emergency
                    </span>
                  </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelBase}>Personal reference name</label>
                    <input
                      className={inputBase}
                      value={profile.reference_name || ""}
                      onChange={(e) => updateProfile({ reference_name: e.target.value })}
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Personal reference phone</label>
                    <input
                      type="tel"
                      className={`${inputBase} ${phoneDigitCount(profile.reference_phone) > 0 && phoneDigitCount(profile.reference_phone) < 10 ? inputPhoneInvalid : ""}`}
                      value={profile.reference_phone || ""}
                      onChange={(e) => updateProfile({ reference_phone: formatPhone(e.target.value) })}
                      onBlur={handleBlurSave}
                      placeholder="(555) 123-4567"
                      maxLength={14}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Emergency contact name</label>
                    <input
                      className={inputBase}
                      value={profile.emergency_name || ""}
                      onChange={(e) => updateProfile({ emergency_name: e.target.value })}
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Emergency contact phone</label>
                    <input
                      type="tel"
                      className={`${inputBase} ${phoneDigitCount(profile.emergency_phone) > 0 && phoneDigitCount(profile.emergency_phone) < 10 ? inputPhoneInvalid : ""}`}
                      value={profile.emergency_phone || ""}
                      onChange={(e) => updateProfile({ emergency_phone: formatPhone(e.target.value) })}
                      onBlur={handleBlurSave}
                      placeholder="(555) 123-4567"
                      maxLength={14}
                    />
                  </div>
                </div>
                  <div className="mt-6 flex border-t border-[#e8ecf2] pt-6">
                    <button
                      type="button"
                      onClick={guard(() => { saveAllProfile(); setActiveTab("documents"); })}
                      className="w-full rounded-lg bg-[#001f3f] px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
                    >
                      Save & Continue →
                    </button>
                  </div>
                </>
              )}

              {activeTab === "documents" && (
                <>
                  <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[#001f3f] px-4 py-3 text-white">
                    <span className="text-sm">
                      ⚡ Pro members can upload and store documents, then export everything as one professional PDF package.
                    </span>
                    <Link
                      href="/account#billing"
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#001f3f] hover:opacity-90 whitespace-nowrap no-underline"
                    >
                      Upgrade to Pro →
                    </Link>
                  </div>
                  <div>
                    <h2 className="font-semibold text-[#001f3f] text-base">
                      Document Checklist
                    </h2>
                    <p className="mt-1 text-sm text-[#6b7a8d]">
                      These are the documents every NYC landlord will ask for. Track what you have ready — check each one off once you&apos;ve compiled it. You&apos;ll need all of these before you can apply.
                    </p>
                  </div>
                  <div className="mt-4 space-y-3">
                    {CHECKLIST_ITEMS.map(({ key, label, helperText }) => (
                      <div
                        key={key}
                        className="flex items-center gap-3 rounded-xl border border-[#e8ecf2] bg-[#f4f6f9]/50 px-4 py-3.5"
                      >
                        <button
                          type="button"
                          onClick={guard(() => toggleChecklistItem(key, !checklist[key]))}
                          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#001f3f] focus:ring-offset-2"
                          aria-checked={!!checklist[key]}
                          role="checkbox"
                        >
                          {checklist[key] ? (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#16a34a]">
                              <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            </span>
                          ) : (
                            <span className="h-5 w-5 rounded-full border-2 border-[#d1d5db] bg-white" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <span className={`text-sm font-medium ${checklist[key] ? "text-[#9ca3af] line-through" : "text-[#0f1826]"}`}>
                            {label}
                          </span>
                          <p className="mt-0.5 text-xs text-[#6b7a8d]">
                            {helperText}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex border-t border-[#e8ecf2] pt-6">
                    <button
                      type="button"
                      onClick={guard(saveAllProfile)}
                      className="w-full rounded-lg bg-[#001f3f] px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
                    >
                      Save
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sticky sidebar: Application Readiness + Document Checklist + Export */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6 space-y-6">
              <div className="rounded-2xl border border-[#e8ecf2] bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-[#001f3f]">
                  Application Readiness
                </h2>
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs text-[#6b7a8d]">
                    <span>Overall</span>
                    <span className="font-semibold text-[#001f3f]">{combinedPct}%</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-[#e8ecf2] shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${combinedPct >= 80 ? "bg-[#16a34a] shadow-[0_0_12px_rgba(22,163,74,0.4)]" : "bg-[#16a34a]"}`}
                      style={{ width: `${combinedPct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-[#6b7a8d]">
                    Profile: {profilePct}% | Documents: {documentsPct}%
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-[#e8ecf2] bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-[#001f3f]">
                  Document Checklist
                </h2>
                <ul className="mt-3 space-y-2">
                  {CHECKLIST_ITEMS.map(({ key, label }) => (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={guard(() => toggleChecklistItem(key, !checklist[key]))}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-lg py-1.5 pr-2 text-left transition-colors hover:bg-[#f4f6f9]"
                      >
                        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors">
                          {checklist[key] ? (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#16a34a]">
                              <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            </span>
                          ) : (
                            <span className="h-5 w-5 rounded-full border-2 border-[#d1d5db] bg-white" />
                          )}
                        </span>
                        <span className={`text-sm ${checklist[key] ? "text-[#9ca3af] line-through" : "text-[#0f1826]"}`}>
                          {label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={guard(handleExportPackage)}
                disabled={exportPdfLoading}
                className="w-full rounded-lg bg-[#001f3f] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {exportPdfLoading ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                    Generating…
                  </>
                ) : (
                  "Export Application Package"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
