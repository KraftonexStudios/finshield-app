import { useUserStore } from '@/stores/useUserStore';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

export default function Index() {
  const { isAuthenticated, onboardingComplete, initializeStore, checkAuthenticationStatus, user } = useUserStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      await initializeStore();
      // Check if user has a valid session
      if (user) {
        await checkAuthenticationStatus();
      }
      setIsInitialized(true);
    };
    initialize();
  }, [initializeStore, checkAuthenticationStatus, user]);

  useEffect(() => {
    if (!isInitialized) return;

    // Redirect based on authentication and onboarding status
    if (isAuthenticated) {
      // User is logged in, go to dashboard
      router.replace('/(app)/dashboard');
    } else if (onboardingComplete) {
      // User has completed onboarding but not logged in, show welcome screen
      router.replace('/(auth)/welcome');
    } else {
      // New user, show onboarding
      router.replace('/(onboarding)/get-started');
    }
  }, [isAuthenticated, onboardingComplete, isInitialized]);

  return null; // This component just handles routing
}