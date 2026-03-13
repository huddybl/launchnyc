"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import GuestModal from "@/components/GuestModal";

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  return ctx ?? {
    user: null,
    isGuest: false,
    openSignUpModal: () => {},
    openOnboardingModal: () => {},
    onCloseOnboarding: () => {},
    showWelcome: false,
    setShowWelcomeModal: () => {},
    handleDismissWelcome: () => {},
  };
}

export function AuthProvider({ children, user, isGuest, pathname }) {
  const [signUpModalOpen, setSignUpModalOpen] = useState(false);
  const [onboardingRequested, setOnboardingRequested] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(null);

  const openSignUpModal = useCallback(() => setSignUpModalOpen(true), []);
  const openOnboardingModal = useCallback(() => setOnboardingRequested(true), []);
  const onCloseOnboarding = useCallback(() => setOnboardingRequested(false), []);

  // On mount: query user_profiles for welcome_dismissed. Only show modal if row doesn't exist or welcome_dismissed is false.
  useEffect(() => {
    if (isGuest || !user?.id) {
      setWelcomeDismissed(isGuest ? false : null);
      return;
    }
    let cancelled = false;
    supabase
      .from("user_profiles")
      .select("welcome_dismissed")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn("[AuthContext] fetch welcome_dismissed failed", error);
          setWelcomeDismissed(false);
          return;
        }
        setWelcomeDismissed(data?.welcome_dismissed === true);
      });
    return () => { cancelled = true; };
  }, [user?.id, isGuest]);

  const handleDismissWelcome = useCallback(async () => {
    if (isGuest || !user?.id) return;
    try {
      const { data: existing } = await supabase
        .from("user_profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_profiles")
          .update({ welcome_dismissed: true })
          .eq("user_id", user.id);
        if (error) {
          console.error("[AuthContext] update welcome_dismissed failed", error);
          return;
        }
      } else {
        const { error } = await supabase
          .from("user_profiles")
          .insert({ user_id: user.id, welcome_dismissed: true });
        if (error) {
          console.error("[AuthContext] insert welcome_dismissed failed", error);
          return;
        }
      }
      setShowWelcomeModal(false);
      setWelcomeDismissed(true);
    } catch (err) {
      console.error("[AuthContext] handleDismissWelcome exception", err);
    }
  }, [user?.id, isGuest]);

  const showWelcome =
    showWelcomeModal ||
    (pathname === "/board" && (isGuest || welcomeDismissed === false));

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest: !!isGuest,
        openSignUpModal,
        openOnboardingModal,
        onCloseOnboarding,
        onboardingRequested: !!onboardingRequested,
        showWelcomeModal,
        setShowWelcomeModal,
        showWelcome,
        handleDismissWelcome,
      }}
    >
      {children}
      <GuestModal open={signUpModalOpen} onClose={() => setSignUpModalOpen(false)} />
    </AuthContext.Provider>
  );
}
