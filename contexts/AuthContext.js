"use client";

import { createContext, useContext, useState, useCallback } from "react";
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
  };
}

export function AuthProvider({ children, user, isGuest }) {
  const [signUpModalOpen, setSignUpModalOpen] = useState(false);
  const [onboardingRequested, setOnboardingRequested] = useState(false);
  const openSignUpModal = useCallback(() => setSignUpModalOpen(true), []);
  const openOnboardingModal = useCallback(() => setOnboardingRequested(true), []);
  const onCloseOnboarding = useCallback(() => setOnboardingRequested(false), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest: !!isGuest,
        openSignUpModal,
        openOnboardingModal,
        onCloseOnboarding,
        onboardingRequested: !!onboardingRequested,
      }}
    >
      {children}
      <GuestModal open={signUpModalOpen} onClose={() => setSignUpModalOpen(false)} />
    </AuthContext.Provider>
  );
}
