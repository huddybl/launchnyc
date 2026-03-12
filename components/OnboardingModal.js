"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

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

export default function OnboardingModal({ onComplete }) {
  const { user, isGuest, onboardingRequested, onCloseOnboarding } = useAuth();
  const [profileMissing, setProfileMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    budget_per_person: "",
    move_in_date: "",
    bedrooms: null,
    num_people: null,
    neighborhoods: [],
    roommate_emails: [""],
  });

  const checkProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        setProfileMissing(false);
        return;
      }
      setProfileMissing(!data);
    } catch {
      setProfileMissing(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || isGuest) {
      setLoading(false);
      setProfileMissing(false);
      return;
    }
    checkProfile();
  }, [user?.id, isGuest, checkProfile]);

  const visible = profileMissing || onboardingRequested;
  const prevVisibleRef = useRef(false);

  // When modal first opens, start at step 1 so all 4 steps run in order
  useEffect(() => {
    if (visible && !prevVisibleRef.current) setStep(1);
    prevVisibleRef.current = !!visible;
  }, [visible]);

  async function handleFinish() {
    if (!user?.id) {
      console.warn("[OnboardingModal] handleFinish: no user.id, skipping insert", { user: user ?? null });
      return;
    }
    setSaving(true);
    const budgetPerPerson = form.budget_per_person ? Number(form.budget_per_person) : null;
    const numPeople = form.num_people || 1;
    const totalBudget = budgetPerPerson != null ? budgetPerPerson * numPeople : null;
    const emails = form.roommate_emails.filter((s) => String(s).trim());
    const payload = {
      user_id: user.id,
      budget_per_person: budgetPerPerson,
      total_budget: totalBudget,
      budget_max: totalBudget,
      move_in_date: form.move_in_date || null,
      bedrooms: form.bedrooms,
      num_people: form.num_people,
      neighborhoods: form.neighborhoods.length > 0 ? form.neighborhoods : null,
      roommate_emails: emails.length > 0 ? emails : null,
    };
    console.log("[OnboardingModal] handleFinish: before insert", { user_id: user.id, payload });
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .upsert(payload, { onConflict: "user_id" })
        .select();
      console.log("[OnboardingModal] handleFinish: after upsert", { data, error: error ?? null, message: error?.message });
      if (error) {
        console.error("[OnboardingModal] handleFinish: upsert failed", error);
        return;
      }
      setProfileMissing(false);
      onCloseOnboarding();
      onComplete?.();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("onboarding-complete"));
        window.location.reload();
      }
    } catch (err) {
      console.error("[OnboardingModal] handleFinish: exception", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    if (!user?.id) {
      console.warn("[OnboardingModal] handleSkip: no user.id", { user: user ?? null });
      return;
    }
    setSaving(true);
    console.log("[OnboardingModal] handleSkip: before insert", { user_id: user.id });
    try {
      const { error } = await supabase
        .from("user_profiles")
        .upsert({ user_id: user.id }, { onConflict: "user_id" })
        .select();
      console.log("[OnboardingModal] handleSkip: after upsert", { error: error ?? null });
      if (error) {
        console.error("[OnboardingModal] handleSkip: upsert failed", error);
        return;
      }
      setProfileMissing(false);
      onCloseOnboarding();
      onComplete?.();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("onboarding-complete"));
      }
    } catch (err) {
      console.error("[OnboardingModal] handleSkip: exception", err);
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

  if ((loading && !onboardingRequested) || !visible) return null;

  const isStep1 = step === 1;
  const isStep4 = step === 4;
  const progressPercent = step * 25;

  return (
    <div
      className="fixed inset-0 z-[90] flex min-h-screen items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-[#dde2ea] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="px-8 pt-6">
          <div className="flex items-center justify-between gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-[#001f3f] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-medium text-zinc-500 tabular-nums">
              {progressPercent}%
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {step === 1 && (
            <>
              <h2
                id="onboarding-title"
                className="text-xl font-semibold text-[#001f3f]"
              >
                You&apos;re 4 questions away from your personalized search
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                Takes less than 60 seconds. We&apos;ll build your search timeline and match you to the right neighborhoods.
              </p>
              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-lg bg-[#001f3f] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Get Started
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-xl font-semibold text-[#001f3f]">
                Budget & Move-in
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                We&apos;ll use this to tailor your search.
              </p>
              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-zinc-600">
                    What&apos;s your budget per person per month?
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={form.budget_per_person}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, budget_per_person: e.target.value }))
                    }
                    placeholder="e.g. 1200"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-[#001f3f] placeholder-zinc-400 focus:border-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#001f3f]"
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
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-xl font-semibold text-[#001f3f]">
                Size & Roommates
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                How many bedrooms and how many people?
              </p>
              <div className="mt-6 space-y-5">
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
                          setForm((f) => ({ ...f, bedrooms: n === "4+" ? 4 : n }))
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
                  {form.budget_per_person && form.num_people && (
                    <p className="mt-2 text-sm font-medium text-[#001f3f]">
                      Total apartment budget: ${((Number(form.budget_per_person) || 0) * (form.num_people || 1)).toLocaleString()}/mo
                    </p>
                  )}
                </div>
                <div>
                  <span className="mb-2 block text-xs font-medium text-zinc-600">
                    Add your roommates by email (optional)
                  </span>
                  <div className="space-y-2">
                    {form.roommate_emails.map((email, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              roommate_emails: f.roommate_emails.map((em, j) => (j === i ? e.target.value : em)),
                            }))
                          }
                          placeholder="roommate@email.com"
                          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-[#001f3f] placeholder-zinc-400 focus:border-[#001f3f] focus:outline-none focus:ring-1 focus:ring-[#001f3f]"
                        />
                        {i === form.roommate_emails.length - 1 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setForm((f) => ({ ...f, roommate_emails: [...f.roommate_emails, ""] }))
                            }
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50"
                            aria-label="Add another roommate"
                          >
                            +
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                roommate_emails: f.roommate_emails.filter((_, j) => j !== i),
                              }))
                            }
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50"
                            aria-label="Remove roommate"
                          >
                            −
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="text-xl font-semibold text-[#001f3f]">
                Neighborhoods
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                Select any neighborhoods you&apos;re interested in.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
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
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200 px-8 py-4">
          <div>
            {!isStep1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isStep4 ? (
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="rounded-lg bg-[#001f3f] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Finish Setup"}
              </button>
            ) : (
              !isStep1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  className="rounded-lg bg-[#001f3f] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Next
                </button>
              )
            )}
            <button
              type="button"
              onClick={handleSkip}
              disabled={saving}
              className="text-sm text-zinc-500 hover:text-zinc-700 disabled:opacity-60"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
