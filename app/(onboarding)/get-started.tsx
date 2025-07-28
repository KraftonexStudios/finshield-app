import { useUserStore } from '@/stores/useUserStore';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, SafeAreaView, Text, View } from 'react-native';

export default function GetStartedScreen() {
  const setOnboardingStep = useUserStore((state) => state.setOnboardingStep);

  const handleGetStarted = () => {
    setOnboardingStep('permissions');
    router.push('/(onboarding)/permissions');
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 justify-center items-center px-6">
        {/* Logo/Brand Section */}
        <View className="mb-20">
          {/* Gradient Circles */}
          <View className="relative w-32 h-32 items-center justify-center">
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              className="w-24 h-24 rounded-full absolute -top-2 -left-2"
              style={{ opacity: 0.9 }}
            />
            <LinearGradient
              colors={['#F59E0B', '#EC4899']}
              className="w-20 h-20 rounded-full absolute top-1 left-6"
              style={{ opacity: 0.8 }}
            />
            <LinearGradient
              colors={['#EAB308', '#F59E0B']}
              className="w-16 h-16 rounded-full absolute top-4 left-1"
              style={{ opacity: 0.7 }}
            />
          </View>
        </View>

        {/* Welcome Text */}
        <View className="mb-12 items-center">
          <Text className="text-white text-4xl font-bold mb-3">
            Welcome to
          </Text>
          <Text className="text-white text-4xl font-bold mb-6">
            BanKitka
          </Text>
          <Text className="text-gray-400 text-lg text-center leading-6">
            Take control of your finance
          </Text>
        </View>

        {/* Get Started Button */}
        <View className="absolute bottom-20 left-6 right-6">
          <Pressable
            onPress={handleGetStarted}
            className="bg-green-400 rounded-full py-5 px-8 flex-row items-center justify-center"
            style={({ pressed }) => ({
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text className="text-black text-lg font-bold mr-3">
              GET STARTED
            </Text>
            <View className="w-8 h-8 bg-black rounded-full items-center justify-center">
              <Text className="text-green-400 text-lg font-bold">→</Text>
            </View>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}