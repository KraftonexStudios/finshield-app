import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useStore } from '@/store/useStore';

export function CounterExample() {
  const { count, increment, decrement, user, setUser, clearUser } = useStore();

  const handleSetUser = () => {
    setUser({ name: 'John Doe', email: 'john@example.com' });
  };

  return (
    <View className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg m-4">
      <Text className="text-2xl font-bold text-center mb-4 text-gray-800 dark:text-white">
        NativeWind + Zustand Demo
      </Text>
      
      {/* Counter Section */}
      <View className="mb-6">
        <Text className="text-lg text-center mb-3 text-gray-600 dark:text-gray-300">
          Count: {count}
        </Text>
        <View className="flex-row justify-center space-x-4">
          <Pressable
            onPress={decrement}
            className="bg-red-500 px-4 py-2 rounded-lg active:bg-red-600"
          >
            <Text className="text-white font-semibold">-</Text>
          </Pressable>
          <Pressable
            onPress={increment}
            className="bg-blue-500 px-4 py-2 rounded-lg active:bg-blue-600"
          >
            <Text className="text-white font-semibold">+</Text>
          </Pressable>
        </View>
      </View>

      {/* User Section */}
      <View className="border-t border-gray-200 dark:border-gray-600 pt-4">
        {user ? (
          <View>
            <Text className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              Welcome, {user.name}!
            </Text>
            <Text className="text-gray-600 dark:text-gray-300 mb-3">
              Email: {user.email}
            </Text>
            <Pressable
              onPress={clearUser}
              className="bg-gray-500 px-4 py-2 rounded-lg active:bg-gray-600"
            >
              <Text className="text-white font-semibold text-center">Logout</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <Text className="text-gray-600 dark:text-gray-300 mb-3 text-center">
              No user logged in
            </Text>
            <Pressable
              onPress={handleSetUser}
              className="bg-green-500 px-4 py-2 rounded-lg active:bg-green-600"
            >
              <Text className="text-white font-semibold text-center">Login as Demo User</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}