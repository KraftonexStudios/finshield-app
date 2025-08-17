import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
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
  const [error, setError] = useState<string | null>(null);

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
        let endpoint: string;
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
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center px-6">
          <View className="bg-red-50 p-6 rounded-2xl mb-8 w-full">
            <Text className="text-red-600 text-center text-lg font-semibold mb-2">
              Setup Failed
            </Text>
            <Text className="text-red-500 text-center mb-4">
              {error}
            </Text>
            <View className="bg-white p-4 rounded-xl">
              <Text
                className="text-blue-600 text-center font-semibold text-lg"
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
    <SafeAreaView className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100">
      <View className="flex-1 justify-center items-center px-6">
        {/* Logo or App Icon */}
        <View className="mb-12">
          <View className="w-20 h-20 bg-blue-600 rounded-full items-center justify-center mb-4">
            <Text className="text-white text-2xl font-bold">B</Text>
          </View>
          <Text className="text-gray-700 text-center text-lg font-semibold">
            Banking App
          </Text>
        </View>

        {/* Loading Animation */}
        <View className="mb-8">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>

        {/* Dynamic Loading Message */}
        <View className="bg-white p-6 rounded-2xl shadow-sm mb-8 w-full">
          <Text className="text-gray-800 text-center text-lg font-medium">
            {LOADING_MESSAGES[currentMessageIndex]}
          </Text>
        </View>

        {/* Progress Indicator */}
        <View className="w-full px-4">
          <View className="flex-row justify-between mb-2">
            {LOADING_MESSAGES.map((_, index) => (
              <View
                key={index}
                className={`h-2 flex-1 mx-1 rounded-full ${index <= currentMessageIndex ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
              />
            ))}
          </View>
          <Text className="text-gray-500 text-center text-sm">
            Please wait while we set up your secure banking experience
          </Text>
        </View>

        {/* Security Notice */}
        <View className="mt-8 px-4">
          <Text className="text-gray-400 text-center text-xs">
            🔒 Your data is being processed securely
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}