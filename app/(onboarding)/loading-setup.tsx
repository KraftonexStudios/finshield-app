import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_ENDPOINTS } from '../../constants/API_ENDPOINTS';
import { useDataCollectionStore } from '../../stores/useDataCollectionStore';
import { useUserStore } from '../../stores/useUserStore';

const LOADING_MESSAGES = [
  'Setting up your dashboard...',
  'Performing security checks...',
  'Initializing fraud detection...',
  'Finalizing your account...',
];

export default function LoadingSetupScreen() {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState(null);

  const { user } = useUserStore();
  const {
    collectionScenario,
    isCollecting
  } = useDataCollectionStore();

  useEffect(() => {
    // Cycle through loading messages
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);

    return () => clearInterval(messageInterval);
  }, []);

  useEffect(() => {
    const processSetup = async () => {
      try {
        if (!user?.uid) {
          throw new Error('User not authenticated');
        }

        // Wait for initial loading messages to show
        await new Promise(resolve => setTimeout(resolve, 6000));

        // Determine endpoint based on scenario
        let endpoint;
        if (collectionScenario === 'first-time-registration') {
          endpoint = API_ENDPOINTS.DATA.REGULAR;
        } else if (collectionScenario === 're-registration') {
          endpoint = API_ENDPOINTS.DATA.CHECK;
        } else {
          throw new Error('Invalid collection scenario');
        }

        console.log(`Sending data to ${endpoint} for scenario: ${collectionScenario}`);

        // Update user ID in the current session before sending data
        const { endSessionAndSendData, startDataCollection, setUserId, currentSession, startSession } = useDataCollectionStore.getState();

        // Debug: Check if we have a current session
        console.log('🔍 Session state before sending data:', {
          hasCurrentSession: !!currentSession,
          sessionId: currentSession?.sessionId,
          currentUserId: currentSession?.userId,
          newUserId: user.uid,
          collectionScenario
        });

        // If no session exists, start one before proceeding
        if (!currentSession) {
          console.log('⚠️ No current session found, starting new session before sending data');
          await startSession(user.uid);
          await startDataCollection(collectionScenario === 'first-time-registration' ? 'first-time-registration' : 're-registration');
        } else {
          // Update the existing session with the authenticated user ID
          setUserId(user.uid);
        }

        // End current session and send data using the new method
        const result = await endSessionAndSendData(endpoint);

        if (result.success) {
          console.log(`Data sent successfully to ${endpoint}`);
          console.log('API Response:', result.data);

          // Handle response based on scenario and API response
          if (collectionScenario === 'first-time-registration') {
            // For new users, start new session for app usage and go to dashboard
            await startDataCollection('login');
            router.replace('../(app)/dashboard');
          } else if (collectionScenario === 're-registration') {
            // Parse API response to determine if security questions are needed
            if (result.data?.requiresSecurityQuestions === true) {
              console.log('🔒 Suspicious activity detected, showing security questions');
              router.replace('./security-questions-verification');
            } else {
              console.log('✅ Normal activity detected, proceeding to dashboard');
              await startDataCollection('login');
              router.replace('../(app)/dashboard');
            }
          }
        } else {
          // Handle actual failure case (this shouldn't happen with current bypass logic)
          console.error('Failed to send data, but this should not happen with bypass logic');

          // Fallback to security questions for re-registration
          if (collectionScenario === 're-registration') {
            router.replace('./security-questions-verification');
          } else {
            await startDataCollection('login');
            router.replace('../(app)/dashboard');
          }
        }

      } catch (error) {
        console.error('Setup processing error:', error);
        // TODO: NEEDS WORK - Bypass all setup errors for now during development
        // This should be removed once session management and API are stable
        console.warn('Bypassing setup error, continuing with flow');

        // Continue with flow despite errors
        const { collectionScenario } = useDataCollectionStore.getState();
        if (collectionScenario === 'first-time-registration') {
          router.replace('../(app)/dashboard');
        } else if (collectionScenario === 're-registration') {
          router.replace('./security-questions-verification');
        } else {
          // Fallback to dashboard
          router.replace('../(app)/dashboard');
        }

        // Original error handling (commented out for bypass):
        /*
        setError(error instanceof Error ? error.message : 'Setup failed');
        setIsProcessing(false);
        */
      }
    };

    // Start processing after component mounts
    const timer = setTimeout(processSetup, 1000);
    return () => clearTimeout(timer);
  }, [user?.uid, collectionScenario]);

  const handleRetry = () => {
    setError(null);
    setIsProcessing(true);
    router.replace('./loading-setup');
  };

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: '#7F1D1D', padding: 24, borderRadius: 16, marginBottom: 32, width: '100%' }}>
            <Text style={{ color: '#DC2626', textAlign: 'center', fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
              Setup Failed
            </Text>
            <Text style={{ color: '#EF4444', textAlign: 'center', marginBottom: 16 }}>
              {error}
            </Text>
            <View style={{ backgroundColor: 'black', padding: 16, borderRadius: 12 }}>
              <Text
                style={{ color: '#10B981', textAlign: 'center', fontWeight: '600', fontSize: 18 }}
                onPress={handleRetry}
              >
                Try Again
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>

        {/* Dynamic Loading Message */}
        <View style={{ marginBottom: 64, height: 32, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#D1D5DB', textAlign: 'center', fontSize: 18, fontWeight: '500', letterSpacing: 0.5 }}>
            {LOADING_MESSAGES[currentMessageIndex]}
          </Text>
        </View>

        {/* Progress Indicator */}
        <View style={{ width: '100%', maxWidth: 288, alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
            {LOADING_MESSAGES.map((_, index) => (
              <View
                key={index}
                style={{
                  height: 4,
                  flex: 1,
                  borderRadius: 2,
                  backgroundColor: index <= currentMessageIndex ? '#10B981' : '#374151',
                  shadowColor: index <= currentMessageIndex ? '#10B981' : 'transparent',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.5,
                  shadowRadius: 2,
                }}
              />
            ))}
          </View>
          <Text style={{ color: '#9CA3AF', textAlign: 'center', fontSize: 14, fontWeight: '300' }}>
            Please wait while we set up your secure banking experience
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}