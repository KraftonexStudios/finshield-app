import { useUserStore } from '@/stores/useUserStore';
import * as Contacts from 'expo-contacts';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, Text, View } from 'react-native';

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
      console.error('Permission request failed:', error);
    }
  };

  const handleContinue = () => {
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

    setOnboardingStep('mobile-input');
    router.push('/(onboarding)/mobile-input');
  };

  const allRequiredGranted = permissions
    .filter(p => p.required)
    .every(p => p.granted);

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      className="flex-1 bg-black"
    >

      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 px-8 py-8">
          {/* Header */}
          <View className="mb-12">
            <Text className="text-3xl font-bold text-white mb-3">
              App Permissions
            </Text>
            <Text className="text-white/70 text-lg leading-6">
              We need these permissions to provide you with the best banking experience.
            </Text>
          </View>

          {/* Permissions List */}
          <View className="flex-1">
            {permissions.map((permission) => (
              <View
                key={permission.id}
                className="bg-white/5 rounded-2xl p-5 mb-4 border border-white/10"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <Text className="text-3xl mr-4">{permission.icon}</Text>
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Text className="text-lg font-semibold text-white">
                          {permission.title}
                        </Text>
                        {permission.required && (
                          <Text className="text-red-400 text-sm ml-2 font-medium">*Required</Text>
                        )}
                      </View>
                      <Text className="text-white/70 text-sm mt-1 leading-5">
                        {permission.description}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => requestPermission(permission.id)}
                    className={`px-4 py-2 rounded-full ${permission.granted
                      ? 'bg-green-500/20 border border-green-500/30'
                      : 'bg-white border border-white/20'
                      }`}
                    disabled={permission.granted}
                  >
                    <Text
                      className={`text-sm font-semibold ${permission.granted
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
          </View>

          {/* Continue Button */}
          <View className="mt-8">
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