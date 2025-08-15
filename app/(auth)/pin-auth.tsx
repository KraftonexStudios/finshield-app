import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, Text, Vibration, View } from 'react-native';
import { useDataCollectionStore } from '../../stores/useDataCollectionStore';
import { useUserStore } from '../../stores/useUserStore';

// Import LocalAuthentication for native Android
let LocalAuthentication: any = null;
try {
  LocalAuthentication = require('expo-local-authentication');
} catch (error) {
    // expo-local-authentication not available
}

export default function PinAuthScreen() {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const { loginWithPin, loginWithBiometric, user } = useUserStore();
  const { sendDataAndWaitForResponse, stopDataCollection, startDataCollection, startSession, collectionScenario } = useDataCollectionStore();

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
      setBiometricAvailable(hasHardware && isEnrolled);
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
        // Check if this is a re-registration scenario
        if (collectionScenario === 're-registration') {
          try {
            // Send data to check endpoint and wait for response
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
            const responseSuccess = await sendDataAndWaitForResponse(`${apiUrl}/api/data/check`);

            if (responseSuccess) {
              await stopDataCollection();
              router.replace('/(app)/dashboard');
            } else {
              Alert.alert('Verification Failed', 'Please try again later.');
              setPin('');
            }
          } catch (error) {
            // Failed to send re-registration data
            // Continue to dashboard even if data sending fails
            await stopDataCollection();
            router.replace('/(app)/dashboard');
          }
        } else {
          // Regular login - start data collection session for login scenario
          try {
            await startSession(user.uid);
            await startDataCollection('login');
          } catch (dataCollectionError) {
            // Failed to start data collection
            // Don't block login flow if data collection fails
          }
          
          router.replace('/(app)/dashboard');
        }
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

  const renderPinDots = () => {
    return (
      <View className="flex-row justify-center items-center mb-12">
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            className={`w-4 h-4 rounded-full mx-3 ${pin.length > index ? 'bg-green-400' : 'bg-gray-700'
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
                    <Text className={`text-2xl ${pin.length === 0 ? 'text-gray-600' : 'text-white'
                      }`}>⌫</Text>
                  </Pressable>
                );
              }

              return (
                <Pressable
                  key={keyIndex}
                  onPress={() => handlePinInput(key)}
                  disabled={isLoading}
                  className="w-20 h-20 mx-4 bg-gray-800 rounded-full items-center justify-center"
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text className="text-white text-2xl font-medium">{key}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 px-6 py-8">
        {/* Header */}
        <View className="items-center mb-12 mt-8">
          <LinearGradient
            colors={['#10B981', '#059669']}
            className="w-20 h-20 rounded-full items-center justify-center mb-6"
          >
            <Text className="text-white text-3xl">🔒</Text>
          </LinearGradient>
          <Text className="text-white text-3xl font-bold mb-2">Enter Your PIN</Text>
          <Text className="text-gray-400 text-base text-center">
            Please enter your 4-digit PIN to continue
          </Text>
        </View>

        {renderPinDots()}
        {renderKeypad()}

        {biometricAvailable && (
          <Pressable
            onPress={handleBiometricAuth}
            disabled={isLoading}
            className="items-center mt-8"
          >
            <View className="w-16 h-16 bg-gray-800 rounded-full items-center justify-center mb-2">
              <Text className="text-green-400 text-2xl">👆</Text>
            </View>
            <Text className="text-gray-400 text-sm">Use Biometric</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}