import { useUserStore } from '@/stores/useUserStore';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

export default function RechargeConfirmationScreen() {
  const { provider, mobileNumber, amount, planDescription, validity } = useLocalSearchParams<{
    provider: string;
    mobileNumber: string;
    amount: string;
    planDescription?: string;
    validity?: string;
  }>();

  const { user, processTransaction } = useUserStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const rechargeAmount = parseInt(amount);
  const convenienceFee = rechargeAmount > 500 ? 2 : 0;
  const totalAmount = rechargeAmount + convenienceFee;

  const handleConfirmRecharge = async () => {
    if (isProcessing) return;

    if (totalAmount > (user?.balance || 0)) {
      Alert.alert('Insufficient Balance', 'You do not have enough balance for this recharge.');
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Process the recharge transaction
      const success = await processTransaction({
        fromMobile: user?.mobile || '',
        type: 'debit',
        amount: totalAmount,
        description: `${provider} Recharge - ${mobileNumber}`,
        note: `Plan: ${planDescription}, Validity: ${validity}`,
        reference: `RCH${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        status: 'pending',
        category: 'recharge',
        recipient: {
          name: provider,
          mobile: mobileNumber
        }
      });

      if (success) {
        router.replace({
          pathname: '/(app)/recharge-success',
          params: {
            provider,
            mobileNumber,
            amount: amount,
            planDescription,
            validity,
            transactionId: Date.now().toString()
          }
        });
      } else {
        Alert.alert('Recharge Failed', 'Unable to process recharge. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while processing the recharge.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="flex-1 px-6 py-4">
            {/* Header */}
            <View className="flex-row items-center mb-8">
              <Pressable
                onPress={() => router.back()}
                className="w-12 h-12 rounded-full bg-white/10 items-center justify-center mr-4"
              >
                <Text className="text-white text-xl">←</Text>
              </Pressable>
              <Text className="text-2xl font-bold text-white">Confirm Recharge</Text>
            </View>

            {/* Recharge Details Card */}
            <View className="bg-white/10 rounded-3xl p-6 mb-6 border border-white/20">
              <View className="items-center mb-6">
                <View className="w-16 h-16 bg-purple-600 rounded-full items-center justify-center mb-4">
                  <Text className="text-white text-2xl">📱</Text>
                </View>
                <Text className="text-white text-2xl font-bold mb-2">
                  {formatCurrency(rechargeAmount)}
                </Text>
                <Text className="text-white/70 text-lg">
                  {provider} Recharge
                </Text>
              </View>

              {/* Recharge Information */}
              <View className="space-y-4">
                <View className="flex-row justify-between items-center py-3 border-b border-white/10">
                  <Text className="text-white/70">Mobile Number</Text>
                  <Text className="text-white font-semibold">{mobileNumber}</Text>
                </View>

                <View className="flex-row justify-between items-center py-3 border-b border-white/10">
                  <Text className="text-white/70">Operator</Text>
                  <Text className="text-white font-semibold">{provider}</Text>
                </View>

                <View className="flex-row justify-between items-center py-3 border-b border-white/10">
                  <Text className="text-white/70">Recharge Amount</Text>
                  <Text className="text-white font-semibold">{formatCurrency(rechargeAmount)}</Text>
                </View>

                {planDescription && (
                  <View className="flex-row justify-between items-center py-3 border-b border-white/10">
                    <Text className="text-white/70">Plan Details</Text>
                    <Text className="text-white font-semibold text-right flex-1 ml-4">
                      {planDescription}
                    </Text>
                  </View>
                )}

                {validity && (
                  <View className="flex-row justify-between items-center py-3 border-b border-white/10">
                    <Text className="text-white/70">Validity</Text>
                    <Text className="text-white font-semibold">{validity}</Text>
                  </View>
                )}

                {convenienceFee > 0 && (
                  <View className="flex-row justify-between items-center py-3 border-b border-white/10">
                    <Text className="text-white/70">Convenience Fee</Text>
                    <Text className="text-white font-semibold">{formatCurrency(convenienceFee)}</Text>
                  </View>
                )}

                <View className="flex-row justify-between items-center py-3">
                  <Text className="text-white font-semibold text-lg">Total Amount</Text>
                  <Text className="text-white font-bold text-xl">{formatCurrency(totalAmount)}</Text>
                </View>
              </View>

              {/* Warning */}
              <View className="bg-yellow-500/10 rounded-2xl p-4 mt-6 border border-yellow-500/20">
                <View className="flex-row items-start">
                  <Text className="text-yellow-400 text-lg mr-3">⚠️</Text>
                  <Text className="text-yellow-400/80 text-sm flex-1">
                    Please verify the mobile number and operator carefully. Recharge cannot be reversed once completed.
                  </Text>
                </View>
              </View>
            </View>

            {/* Balance Check */}
            <View className="bg-white/5 rounded-2xl p-4 mb-8 border border-white/10">
              <View className="flex-row justify-between items-center">
                <Text className="text-white/70">Available Balance</Text>
                <Text className="text-white font-semibold">
                  {formatCurrency(user?.balance || 0)}
                </Text>
              </View>
              <View className="flex-row justify-between items-center mt-2">
                <Text className="text-white/70">Balance After Recharge</Text>
                <Text className={`font-semibold ${(user?.balance || 0) - totalAmount >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                  {formatCurrency((user?.balance || 0) - totalAmount)}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="space-y-4">
              <Pressable
                onPress={handleConfirmRecharge}
                disabled={isProcessing || totalAmount > (user?.balance || 0)}
                className={`rounded-2xl py-4 px-6 ${isProcessing || totalAmount > (user?.balance || 0)
                    ? 'bg-gray-600'
                    : 'bg-purple-600'
                  }`}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text className="text-white text-center font-semibold text-lg">
                  {isProcessing ? 'Processing Recharge...' : 'Confirm Recharge'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.back()}
                disabled={isProcessing}
                className="bg-white/10 rounded-2xl py-4 px-6 border border-white/20"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text className="text-white text-center font-semibold text-lg">
                  Back to Edit
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}