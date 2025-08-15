import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, Text, Vibration, View } from 'react-native';
import { useUserStore } from '../../stores/useUserStore';
import { useDataCollectionStore } from '../../stores/useDataCollectionStore';

// Import LocalAuthentication for native Android
let LocalAuthentication: any = null;
try {
  LocalAuthentication = require('expo-local-authentication');
} catch (error) {
    // expo-local-authentication not available
  }

export default function LoginPinScreen() {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const { loginWithPin, loginWithBiometric, user } = useUserStore();
  const { startSession, startDataCollection } = useDataCollectionStore();

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    if (!LocalAuthentication) {
      setBiometricAvailable(false);
      return;
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && isEnrolled && user?.biometricEnabled);
    } catch (error) {
      // Error checking biometric availability
      setBiometricAvailable(false);
    }
  };

  const handleBiometricAuth = async () => {
    try {
      setIsLoading(true);
      const success = await loginWithBiometric();

      if (success && user) {
        // Start data collection session after successful biometric verification
        try {
          await startSession(user.uid);
          await startDataCollection('login');
        } catch (dataCollectionError) {
          // Failed to start data collection
          // Don't block login flow if data collection fails
        }
        
        router.replace('/(app)/dashboard');
      } else {
        Alert.alert('Authentication Failed', 'Please try using your PIN instead.');
      }
    } catch (error) {
      Alert.alert('Authentication Error', 'Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);

      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const verifyPin = async (enteredPin: string) => {
    setIsLoading(true);

    try {
      const success = await loginWithPin(enteredPin);
      if (success && user) {
        // Start data collection session after successful PIN verification
        try {
          await startSession(user.uid);
          await startDataCollection('login');
        } catch (dataCollectionError) {
          // Failed to start data collection
          // Don't block login flow if data collection fails
        }
        
        router.replace('/(app)/dashboard');
      } else {
        Vibration.vibrate(500);
        Alert.alert('Incorrect PIN', 'Please try again');
        setPin('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify PIN. Please try again.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const handleForgotPin = () => {
    Alert.alert(
      'Forgot PIN?',
      'You will need to verify your identity with OTP to reset your PIN.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset PIN',
          onPress: () => router.replace('/(onboarding)/mobile-input')
        }
      ]
    );
  };

  const renderPinDots = () => {
    return (
      <View className="flex-row justify-center items-center mb-12">
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            className={`w-5 h-5 rounded-full mx-3 border-2 ${pin.length > index
                ? 'bg-emerald-500 border-emerald-500'
                : 'bg-transparent border-emerald-200'
              }`}
          />
        ))}
      </View>
    );
  };

  const renderKeypad = () => {
    const keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'delete'],
    ];

    return (
      <View className="flex-1 justify-center">
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row justify-center mb-4">
            {row.map((key, keyIndex) => {
              if (key === '') {
                return <View key={keyIndex} className="w-20 h-20 mx-4" />;
              }

              if (key === 'delete') {
                return (
                  <Pressable
                    key={keyIndex}
                    onPress={handleDelete}
                    disabled={pin.length === 0}
                    className="w-20 h-20 mx-4 items-center justify-center"
                  >
                    <Text className={`text-2xl ${pin.length === 0 ? 'text-gray-400' : 'text-emerald-600'
                      }`}>⌫</Text>
                  </Pressable>
                );
              }

              return (
                <Pressable
                  key={keyIndex}
                  onPress={() => handlePinInput(key)}
                  disabled={isLoading}
                  className="w-20 h-20 mx-4 bg-white rounded-full items-center justify-center shadow-lg border border-emerald-100"
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  })}
                >
                  <Text className="text-emerald-800 text-2xl font-semibold">{key}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#f0fdf4', '#dcfce7', '#bbf7d0']}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        <View className="flex-1 px-6 py-8">
          {/* Header */}
          <View className="items-center mb-12 mt-8">
            <View className="w-24 h-24 bg-emerald-500 rounded-full items-center justify-center mb-6 shadow-lg">
              <Text className="text-white text-4xl">🔐</Text>
            </View>
            <Text className="text-emerald-900 text-3xl font-bold mb-2">Welcome Back</Text>
            <Text className="text-emerald-700 text-base text-center">
              Enter your 4-digit PIN to access your account
            </Text>
            {user?.fullName && (
              <Text className="text-emerald-600 text-sm mt-2 font-medium">
                Hi, {user.fullName.split(' ')[0]}!
              </Text>
            )}
          </View>

          {renderPinDots()}
          {renderKeypad()}

          {/* Biometric Option */}
          {biometricAvailable && (
            <View className="items-center mt-8">
              <Pressable
                onPress={handleBiometricAuth}
                disabled={isLoading}
                className="items-center"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View className="w-16 h-16 bg-emerald-100 rounded-full items-center justify-center mb-2 border-2 border-emerald-200">
                  <Text className="text-emerald-600 text-2xl">👆</Text>
                </View>
                <Text className="text-emerald-600 text-sm font-medium">Use Biometric</Text>
              </Pressable>
            </View>
          )}

          {/* Forgot PIN */}
          <View className="items-center mt-6">
            <Pressable
              onPress={handleForgotPin}
              className="py-3 px-6"
            >
              <Text className="text-emerald-600 text-base font-medium underline">
                Forgot PIN?
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}