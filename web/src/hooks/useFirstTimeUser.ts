import { useState, useEffect, useCallback } from 'react';

const FIRST_TIME_USER_KEY = 'orbitx_first_time_user';
const ONBOARDING_COMPLETED_KEY = 'orbitx_onboarding_completed';

interface OnboardingState {
  isFirstTimeUser: boolean;
  hasCompletedOnboarding: boolean;
  currentStep: number;
}

interface UseFirstTimeUserReturn extends OnboardingState {
  markOnboardingComplete: () => void;
  dismissOnboarding: () => void;
  resetOnboarding: () => void;
  setCurrentStep: (step: number) => void;
}

/**
 * Hook to detect first-time users and manage onboarding state
 *
 * @example
 * ```tsx
 * const { isFirstTimeUser, hasCompletedOnboarding, markOnboardingComplete } = useFirstTimeUser();
 *
 * if (isFirstTimeUser && !hasCompletedOnboarding) {
 *   return <WelcomeModal onComplete={markOnboardingComplete} />;
 * }
 * ```
 */
export function useFirstTimeUser(): UseFirstTimeUserReturn {
  const [state, setState] = useState<OnboardingState>(() => {
    // Check localStorage on initial render
    const hasVisited = localStorage.getItem(FIRST_TIME_USER_KEY);
    const hasCompleted = localStorage.getItem(ONBOARDING_COMPLETED_KEY);

    return {
      isFirstTimeUser: !hasVisited,
      hasCompletedOnboarding: hasCompleted === 'true',
      currentStep: 0,
    };
  });

  // Mark as visited on first render
  useEffect(() => {
    if (state.isFirstTimeUser) {
      localStorage.setItem(FIRST_TIME_USER_KEY, 'true');
    }
  }, [state.isFirstTimeUser]);

  const markOnboardingComplete = useCallback(() => {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    setState((prev) => ({
      ...prev,
      hasCompletedOnboarding: true,
    }));
  }, []);

  const dismissOnboarding = useCallback(() => {
    // Same as complete - user chose to skip
    markOnboardingComplete();
  }, [markOnboardingComplete]);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(FIRST_TIME_USER_KEY);
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
    setState({
      isFirstTimeUser: true,
      hasCompletedOnboarding: false,
      currentStep: 0,
    });
  }, []);

  const setCurrentStep = useCallback((step: number) => {
    setState((prev) => ({
      ...prev,
      currentStep: step,
    }));
  }, []);

  return {
    ...state,
    markOnboardingComplete,
    dismissOnboarding,
    resetOnboarding,
    setCurrentStep,
  };
}
