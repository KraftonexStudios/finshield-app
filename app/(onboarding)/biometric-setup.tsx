import { useUserStore } from '@/stores/useUserStore';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, Text, View } from 'react-native';

// Import LocalAuthentication for native Android
let LocalAuthentication: any = null;
try {
  LocalAuthentication = require('expo-local-authentication');
} catch (error) {
  console.warn('expo-local-authentication not available:', error);
}

type BiometricType = 'face' | 'fingerprint' | null;

interface BiometricOption {
  type: BiometricType;
  title: string;
  description: string;
  icon: string;
  available: boolean;
}

export default function BiometricSetupScreen() {
  const { setupBiometric, isLoading, error, onboardingStep } = useUserStore();
  const [biometricOptions, setBiometricOptions] = useState<BiometricOption[]>([
    {
      type: 'face',
      title: 'Face ID',
      description: 'Use your face to unlock the app quickly and securely',
      icon: '👤',
      available: false,
    },
    {
      type: 'fingerprint',
      title: 'Fingerprint',
      description: 'Use your fingerprint to unlock the app quickly and securely',
      icon: '👆',
      available: false,
    },
  ]);
  const [selectedType, setSelectedType] = useState<BiometricType>(null);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      if (!LocalAuthentication) {
        console.log('LocalAuthentication not available on this platform');
        return;
      }

      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      if (!isAvailable) {
        console.log('Biometric hardware not available');
        return;
      }

      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      setBiometricOptions(prev => prev.map(option => {
        if (option.type === 'face') {
          return {
            ...option,
            available: supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
          };
        }
        if (option.type === 'fingerprint') {
          return {
            ...option,
            available: supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
          };
        }
        return option;
      }));
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  };

  const handleBiometricSetup = async (type: BiometricType) => {
    if (!type) return;

    if (!LocalAuthentication) {
      Alert.alert(
        'Not Available',
        'Biometric authentication is not available on this platform.',
        [{ text: 'Skip', onPress: () => handleSkipBiometric() }]
      );
      return;
    }

    try {
      // Check if biometric is enrolled
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert(
          'Biometric Not Set Up',
          `Please set up ${type === 'face' ? 'Face ID' : 'fingerprint'} in your device settings first.`,
          [
            { text: 'Skip', onPress: () => handleSkipBiometric() },
            { text: 'OK' }
          ]
        );
        return;
      }

      // Test biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Set up ${type === 'face' ? 'Face ID' : 'fingerprint'} for BanKitka`,
        fallbackLabel: 'Use PIN instead',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        await setupBiometric(type);
        // Navigation will be handled by the store based on user setup status
      } else {
        Alert.alert(
          'Authentication Failed',
          'Biometric authentication failed. You can set this up later in settings.',
          [
            { text: 'Try Again', onPress: () => handleBiometricSetup(type) },
            { text: 'Skip', onPress: () => handleSkipBiometric() }
          ]
        );
      }
    } catch (error) {
      console.error('Biometric setup error:', error);
      Alert.alert('Error', 'Failed to set up biometric authentication.');
    }
  };

  const handleSkipBiometric = async () => {
    try {
      router.push('/(onboarding)/security-questions');
    } catch (error) {
      Alert.alert('Error', 'Failed to navigate to security questions.');
    }
  };

  // Navigate based on onboarding step changes
  useEffect(() => {
    if (onboardingStep === 'completed') {
      router.replace('/(app)/dashboard');
    }
  }, [onboardingStep]);

  const availableOptions = biometricOptions.filter(option => option.available);
  const hasAvailableOptions = availableOptions.length > 0;

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      className="flex-1"
    >
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 px-8 py-8">
          {/* Header */}
          <View className="mb-12">
            <Pressable
              onPress={() => router.back()}
              className="w-12 h-12 rounded-full bg-white/10 items-center justify-center mb-8"
            >
              <Text className="text-white text-xl">←</Text>
            </Pressable>

            <Text className="text-3xl font-bold text-white mb-3">
              Secure Your Account
            </Text>
            <Text className="text-white/70 text-lg leading-6">
              {hasAvailableOptions
                ? 'Choose your preferred biometric authentication method'
                : 'Biometric authentication is not available on this device'
              }
            </Text>
          </View>

          {/* Biometric Options */}
          {hasAvailableOptions ? (
            <View className="flex-1">
              <Text className="text-white text-xl font-semibold mb-6">
                Choose Authentication Method
              </Text>

              {availableOptions.map((option) => (
                <Pressable
                  key={option.type}
                  onPress={() => {
                    setSelectedType(option.type);
                    handleBiometricSetup(option.type);
                  }}
                  className={`bg-white/5 rounded-2xl p-6 mb-4 border ${selectedType === option.type ? 'border-white/40 bg-white/10' : 'border-white/10'
                    }`}
                  disabled={isLoading}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <View className="flex-row items-center">
                    <Text className="text-4xl mr-4">{option.icon}</Text>
                    <View className="flex-1">
                      <Text className="text-xl font-semibold text-white mb-1">
                        {option.title}
                      </Text>
                      <Text className="text-white/70 text-sm">
                        {option.description}
                      </Text>
                    </View>
                    <View className="w-6 h-6 rounded-full border-2 border-white/30 items-center justify-center">
                      {selectedType === option.type && (
                        <View className="w-3 h-3 rounded-full bg-white" />
                      )}
                    </View>
                  </View>
                </Pressable>
              ))}

              {/* Benefits Section */}
              <View className="bg-white/5 rounded-2xl p-5 mt-6 border border-white/10">
                <Text className="text-white text-sm font-semibold mb-2">
                  ✨ Benefits of Biometric Authentication
                </Text>
                <Text className="text-white/70 text-sm leading-5">
                  • Faster and more convenient login{"\n"}
                  • Enhanced security for your account{"\n"}
                  • No need to remember your PIN every time{"\n"}
                  • Works even when offline
                </Text>
              </View>
            </View>
          ) : (
            <View className="flex-1 justify-center items-center">
              <Text className="text-6xl mb-6">🔒</Text>
              <Text className="text-xl font-semibold text-white mb-2 text-center">
                Biometric Not Available
              </Text>
              <Text className="text-white/70 text-center mb-8 leading-6">
                Your device doesn't support biometric authentication or it's not set up.
                You can still use your PIN to access the app securely.
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View className="mt-8">
            {hasAvailableOptions && (
              <Pressable
                onPress={() => handleSkipBiometric()}
                className="bg-white/10 rounded-2xl py-4 px-6 mb-4 border border-white/20"
                disabled={isLoading}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text className="text-center text-lg font-semibold text-white">
                  {isLoading ? 'Setting up...' : 'Skip for Now'}
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => handleSkipBiometric()}
              className="bg-white rounded-2xl py-4 px-6"
              disabled={isLoading}
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text className="text-center text-lg font-semibold text-gray-900">
                {hasAvailableOptions ? 'Continue with PIN Only' : 'Continue'}
              </Text>
            </Pressable>

            <Text className="text-white/50 text-xs text-center mt-4">
              You can change these settings anytime in the app
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}