import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, SafeAreaView, Share, Text, View } from 'react-native';

export default function RechargeSuccessScreen() {
  const { provider, mobileNumber, amount, planDescription, validity, transactionId } = useLocalSearchParams<{
    provider: string;
    mobileNumber: string;
    amount: string;
    planDescription?: string;
    validity?: string;
    transactionId: string;
  }>();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleShareReceipt = async () => {
    try {
      const message = `🎉 Recharge Successful!\n\n` +
        `Operator: ${provider}\n` +
        `Mobile: ${mobileNumber}\n` +
        `Amount: ${formatCurrency(Number(amount))}\n` +
        `${planDescription ? `Plan: ${planDescription}\n` : ''}` +
        `${validity ? `Validity: ${validity}\n` : ''}` +
        `Transaction ID: ${transactionId}\n` +
        `Date: ${new Date().toLocaleDateString('en-IN')}\n\n` +
        `Powered by SecurePay`;
      
      await Share.share({
        message,
        title: 'Recharge Receipt',
      });
    } catch (error) {
      // Error sharing receipt
    }
  };

  const handleGoToDashboard = () => {
    router.replace('/(app)/dashboard');
  };

  const handleRechargeAgain = () => {
    router.push('/(app)/recharge');
  };

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        <View className="flex-1 px-6 py-8">
          {/* Success Animation */}
          <View className="items-center mb-8">
            <View className="w-24 h-24 bg-green-500 rounded-full items-center justify-center mb-6">
              <Text className="text-white text-4xl">✓</Text>
            </View>
            <Text className="text-3xl font-bold text-white mb-3 text-center">
              Recharge Successful!
            </Text>
            <Text className="text-white/70 text-center text-lg">
              Your {provider} recharge has been completed
            </Text>
          </View>

          {/* Receipt Card */}
          <View className="bg-white/10 rounded-3xl p-6 mb-8 border border-white/20">
            <View className="items-center mb-6">
              <Text className="text-white text-3xl font-bold mb-2">
                {formatCurrency(Number(amount))}
              </Text>
              <Text className="text-white/70 text-lg">
                Recharged to {mobileNumber}
              </Text>
            </View>

            {/* Transaction Details */}
            <View className="space-y-4">
              <View className="flex-row justify-between items-center py-2 border-b border-white/10">
                <Text className="text-white/70">Operator</Text>
                <Text className="text-white font-semibold">{provider}</Text>
              </View>
              
              <View className="flex-row justify-between items-center py-2 border-b border-white/10">
                <Text className="text-white/70">Mobile Number</Text>
                <Text className="text-white font-semibold">{mobileNumber}</Text>
              </View>
              
              {planDescription && (
                <View className="flex-row justify-between items-center py-2 border-b border-white/10">
                  <Text className="text-white/70">Plan</Text>
                  <Text className="text-white font-semibold text-right flex-1 ml-4">
                    {planDescription}
                  </Text>
                </View>
              )}
              
              {validity && (
                <View className="flex-row justify-between items-center py-2 border-b border-white/10">
                  <Text className="text-white/70">Validity</Text>
                  <Text className="text-white font-semibold">{validity}</Text>
                </View>
              )}
              
              <View className="flex-row justify-between items-center py-2 border-b border-white/10">
                <Text className="text-white/70">Transaction ID</Text>
                <Text className="text-white font-semibold">{transactionId}</Text>
              </View>
              
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-white/70">Date & Time</Text>
                <Text className="text-white font-semibold">
                  {new Date().toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="space-y-4">
            <Pressable
              onPress={handleShareReceipt}
              className="bg-white rounded-2xl py-4 px-6 mb-4"
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text className="text-gray-900 text-center font-semibold text-lg">
                Share Receipt
              </Text>
            </Pressable>

            <Pressable
              onPress={handleRechargeAgain}
              className="bg-purple-600 rounded-2xl py-4 px-6 mb-4"
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text className="text-white text-center font-semibold text-lg">
                Recharge Again
              </Text>
            </Pressable>

            <Pressable
              onPress={handleGoToDashboard}
              className="bg-white/10 rounded-2xl py-4 px-6 border border-white/20"
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text className="text-white text-center font-semibold text-lg">
                Back to Dashboard
              </Text>
            </Pressable>
          </View>

          {/* Success Message */}
          <View className="bg-green-500/10 rounded-2xl p-4 mt-6 border border-green-500/20">
            <View className="flex-row items-start">
              <Text className="text-green-400 text-lg mr-3">🎉</Text>
              <View className="flex-1">
                <Text className="text-green-400 font-semibold mb-1">
                  Recharge Completed Successfully
                </Text>
                <Text className="text-green-400/80 text-sm">
                  Your mobile has been recharged and should be active within a few minutes.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}