import { useDataCollectionStore } from '@/stores/useDataCollectionStore';
import { useUserStore } from '@/stores/useUserStore';
import * as Contacts from 'expo-contacts';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
// Removed LocalAuthentication import as biometric permissions are handled automatically
import { requireNativeModule } from 'expo-modules-core';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

// Import native module for usage stats
let BehavioralDataCollectorModule: any = null;
try {
  BehavioralDataCollectorModule = requireNativeModule('DataCollection');
} catch (error) {
    // BehavioralDataCollector native module not available
}

interface Permission {
  id: string;
  title: string;
  description: string;
  icon: string;
  granted: boolean;
  required: boolean;
}

export default function PermissionsScreen() {
  const setOnboardingStep = useUserStore((state) => state.setOnboardingStep);
  const { startDataCollection, requestPermissions } = useDataCollectionStore();

  // Check existing permissions on component mount
  useEffect(() => {
    checkAllPermissions();
  }, []);

  const checkAllPermissions = async () => {
    try {
      // Check location permission
      const locationStatus = await Location.getForegroundPermissionsAsync();

      // Check notification permission
      const notificationStatus = await Notifications.getPermissionsAsync();

      // Check contacts permission
      const contactsStatus = await Contacts.getPermissionsAsync();

      // Update permissions state
      setPermissions(prev => prev.map(permission => {
        switch (permission.id) {
          case 'location':
            return { ...permission, granted: locationStatus.status === 'granted' };
          case 'notifications':
            return { ...permission, granted: notificationStatus.status === 'granted' };
          case 'contacts':
            return { ...permission, granted: contactsStatus.status === 'granted' };
          default:
            return permission;
        }
      }));
    } catch (error) {
      // Failed to check permissions
    }
  };
  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: 'location',
      title: 'Location Access',
      description: 'To find nearby ATMs and branches',
      icon: '📍',
      granted: false,
      required: true,
    },
    {
      id: 'notifications',
      title: 'Push Notifications',
      description: 'For transaction alerts and security updates',
      icon: '🔔',
      granted: false,
      required: true,
    },
    {
      id: 'contacts',
      title: 'Contacts Access',
      description: 'To send money to your contacts easily',
      icon: '👥',
      granted: false,
      required: false,
    },
  ]);

  const requestPermission = async (permissionId: string) => {
    try {
      let granted = false;

      switch (permissionId) {
        case 'location':
          const locationResult = await Location.requestForegroundPermissionsAsync();
          granted = locationResult.status === 'granted';
          break;
        case 'notifications':
          const notificationResult = await Notifications.requestPermissionsAsync();
          granted = notificationResult.status === 'granted';
          break;
        case 'contacts':
          const contactsResult = await Contacts.requestPermissionsAsync();
          granted = contactsResult.status === 'granted';
          break;
      }

      setPermissions(prev =>
        prev.map(p =>
          p.id === permissionId ? { ...p, granted } : p
        )
      );

      if (!granted) {
        Alert.alert(
          'Permission Denied',
          'You can enable this permission later in your device settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
        // Permission request failed
    }
  };

  const handleContinue = async () => {
    const requiredPermissions = permissions.filter(p => p.required);
    const grantedRequired = requiredPermissions.filter(p => p.granted);

    if (grantedRequired.length < requiredPermissions.length) {
      Alert.alert(
        'Required Permissions',
        'Please grant all required permissions to continue.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // Request data collection permissions and start collecting
      await requestPermissions();
      await startDataCollection('first-time-registration');

      setOnboardingStep('mobile-input');
      router.push('/(onboarding)/mobile-input');
    } catch (error) {
        // Failed to start data collection
      // Continue with onboarding even if data collection fails
      setOnboardingStep('mobile-input');
      router.push('/(onboarding)/mobile-input');
    }
  };

  const allRequiredGranted = permissions
    .filter(p => p.required)
    .every(p => p.granted);

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        <View className="flex-1 px-6">
          {/* Header */}
          <View className="pt-6 pb-4">
            <Text className="text-3xl font-bold text-white mb-3">
              Security Permissions
            </Text>
            <Text className="text-white/70 text-base leading-6">
              We need these permissions to provide secure banking services and protect against fraud.
            </Text>
          </View>

          {/* Scrollable Permissions List */}
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {permissions.map((permission) => (
              <View
                key={permission.id}
                className="bg-white/5 rounded-2xl p-4 mb-4 border border-white/10"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1 mr-4">
                    <Text className="text-2xl mr-3">{permission.icon}</Text>
                    <View className="flex-1">
                      <View className="flex-row items-center flex-wrap">
                        <Text className="text-base font-semibold text-white">
                          {permission.title}
                        </Text>
                        {permission.required && (
                          <Text className="text-red-400 text-xs ml-2 font-medium">*Required</Text>
                        )}
                      </View>
                      <Text className="text-white/70 text-sm mt-1 leading-5">
                        {permission.description}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => requestPermission(permission.id)}
                    className={`px-3 py-2 rounded-full min-w-[80px] ${permission.granted
                      ? 'bg-green-500/20 border border-green-500/30'
                      : 'bg-white border border-white/20'
                      }`}
                    disabled={permission.granted}
                  >
                    <Text
                      className={`text-xs font-semibold text-center ${permission.granted
                        ? 'text-green-400'
                        : 'text-gray-900'
                        }`}
                    >
                      {permission.granted ? '✓ Granted' : 'Allow'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}

            {/* Info Text */}
            <Text className="text-white/50 text-sm text-center leading-5 mt-4 mb-6">
              These permissions help us detect suspicious activity and protect your account from fraud. Your privacy is important to us.
            </Text>
          </ScrollView>

          {/* Fixed Action Buttons */}
          <View className="pb-6 pt-4 space-y-3">
            {/* Refresh Button */}
            <Pressable
              onPress={checkAllPermissions}
              className="rounded-2xl py-3 px-6 bg-white/10 border border-white/20"
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text className="text-center text-sm font-medium text-white">
                🔄 Refresh Permission Status
              </Text>
            </Pressable>

            {/* Continue Button */}
            <Pressable
              onPress={handleContinue}
              className={`rounded-2xl py-4 px-6 ${allRequiredGranted
                ? 'bg-white'
                : 'bg-white/20 border border-white/30'
                }`}
              disabled={!allRequiredGranted}
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                className={`text-center text-lg font-semibold ${allRequiredGranted ? 'text-gray-900' : 'text-white/50'
                  }`}
              >
                Continue
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}