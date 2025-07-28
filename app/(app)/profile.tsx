import { useUserStore } from '@/stores/useUserStore';
import { router } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, Share, Text, View } from 'react-native';

export default function ProfileScreen() {
  const { user, logout } = useUserStore();


  const hasValidUserData = useMemo(() => {
    return !!(user?.fullName && user?.mobile);
  }, [user?.fullName, user?.mobile]);

  const handleShareProfile = useCallback(async () => {
    if (!user?.fullName || !user?.mobile) return;

    try {
      await Share.share({
        message: `Contact me for payments: ${user.fullName} - ${user.mobile}`,
        title: 'My Payment Details'
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, [user?.fullName, user?.mobile]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  }, [logout]);





  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="px-6 py-4 border-b border-gray-800">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <Text className="text-white text-xl">←</Text>
          </Pressable>
          <Text className="text-white text-lg font-bold">Profile</Text>
          <Pressable onPress={handleShareProfile} className="w-10 h-10 items-center justify-center">
            <Text className="text-white text-xl">📤</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        {/* Profile Info */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 bg-purple-600 rounded-full items-center justify-center mb-4">
            <Text className="text-white text-3xl font-bold">
              {(user?.fullName || 'JD').split(' ').map(n => n[0]).join('').toUpperCase()}
            </Text>
          </View>
          <Text className="text-white text-xl font-bold mb-2">
            {user?.fullName || 'User'}
            {!user?.fullName && (
              <Text className="text-red-400 text-xs ml-2">⚠️</Text>
            )}
          </Text>
          <Text className="text-gray-300 text-base mb-1">
            {user?.mobile || 'N/A'}
            {!user?.mobile && (
              <Text className="text-red-400 text-xs ml-2">⚠️</Text>
            )}
          </Text>
          <Text className={`text-sm ${user?.balance && user.balance > 1000 ? 'text-green-400' :
            user?.balance && user.balance > 100 ? 'text-yellow-400' : 'text-red-400'
            }`}>
            Balance: ₹{user?.balance?.toFixed(2) || '0.00'}
          </Text>
          {(!user?.fullName || !user?.mobile) && (
            <Text className="text-red-400 text-xs mt-2 text-center">
              ⚠️ Complete profile required for QR payments
            </Text>
          )}
        </View>

        {/* Share Profile Section */}
        <View className="bg-gray-900 rounded-2xl p-6 mb-6">
          <Text className="text-white text-lg font-bold mb-4">Share Payment Details</Text>
          <View className="items-center py-4">
            <View className="w-16 h-16 bg-purple-600 rounded-full items-center justify-center mb-4">
              <Text className="text-white text-2xl">📤</Text>
            </View>
            <Text className="text-white font-medium text-center mb-2">
              Share Your Payment Information
            </Text>
            <Text className="text-gray-400 text-sm text-center mb-4">
              Share your contact details for payments
            </Text>
            <Pressable
              onPress={handleShareProfile}
              className="bg-purple-600 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-medium">Share Profile</Text>
            </Pressable>
          </View>
        </View>

        {/* Profile Actions */}
        <View className="space-y-3 mb-6">
          <Pressable
            onPress={() => router.push('/(app)/my-card')}
            className="bg-gray-900 rounded-2xl p-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <Text className="text-white text-xl mr-4">💳</Text>
              <Text className="text-white font-medium">My Cards</Text>
            </View>
            <Text className="text-gray-400">→</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(app)/transactions')}
            className="bg-gray-900 rounded-2xl p-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <Text className="text-white text-xl mr-4">📊</Text>
              <Text className="text-white font-medium">Transaction History</Text>
            </View>
            <Text className="text-gray-400">→</Text>
          </Pressable>

          <Pressable className="bg-gray-900 rounded-2xl p-4 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text className="text-white text-xl mr-4">⚙️</Text>
              <Text className="text-white font-medium">Settings</Text>
            </View>
            <Text className="text-gray-400">→</Text>
          </Pressable>

          <Pressable className="bg-gray-900 rounded-2xl p-4 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text className="text-white text-xl mr-4">🔒</Text>
              <Text className="text-white font-medium">Security</Text>
            </View>
            <Text className="text-gray-400">→</Text>
          </Pressable>

          <Pressable className="bg-gray-900 rounded-2xl p-4 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text className="text-white text-xl mr-4">❓</Text>
              <Text className="text-white font-medium">Help & Support</Text>
            </View>
            <Text className="text-gray-400">→</Text>
          </Pressable>
        </View>

        {/* Logout Button */}
        <Pressable
          onPress={handleLogout}
          className="bg-red-600 rounded-2xl p-4 mb-6"
        >
          <Text className="text-white font-medium text-center">Logout</Text>
        </Pressable>

        {/* App Info */}
        <View className="items-center py-4">
          <Text className="text-gray-500 text-sm">Banking App v1.0.0</Text>
          <Text className="text-gray-600 text-xs mt-1">Secure • Fast • Reliable</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}