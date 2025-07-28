import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, SafeAreaView, Share, Text, View } from 'react-native';

export default function TransferSuccessScreen() {
  const { amount, recipientName, mobileNumber, transactionId } = useLocalSearchParams<{
    amount: string;
    recipientName: string;
    mobileNumber: string;
    transactionId: string;
  }>();

  const formatCurrency = (value: string | number) => {
    const numericValue = typeof value === 'string' ? parseInt(value) : value;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(numericValue);
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleShareReceipt = async () => {
    try {
      const message = `Payment Successful\n\nAmount: ${formatCurrency(amount)}\nTo: ${recipientName}\nMobile: ${mobileNumber}\nTransaction ID: ${transactionId}\nDate: ${formatDate()}\n\nSent via SecureBank App`;

      await Share.share({
        message,
        title: 'Payment Receipt'
      });
    } catch (error) {
      console.log('Error sharing receipt:', error);
    }
  };

  const handleGoToDashboard = () => {
    router.replace('/(app)/dashboard');
  };

  const handleViewTransactions = () => {
    router.push('/(app)/transactions');
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
            <View className="w-24 h-24 bg-green-500 rounded-full items-center justify-center mb-4">
              <Text className="text-white text-4xl">✓</Text>
            </View>
            <Text className="text-white text-2xl font-bold mb-2">Transfer Successful!</Text>
            <Text className="text-white/70 text-center text-base">
              Your money has been sent successfully
            </Text>
          </View>

          {/* Transaction Details Card */}
          <View className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10">
            {/* Amount */}
            <View className="items-center mb-6 pb-6 border-b border-white/10">
              <Text className="text-white/70 text-sm mb-1">Amount Sent</Text>
              <Text className="text-white text-3xl font-bold">{formatCurrency(amount)}</Text>
            </View>

            {/* Recipient Info */}
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-purple-500 rounded-full items-center justify-center mb-3">
                <Text className="text-white text-2xl font-bold">
                  {recipientName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text className="text-white text-xl font-bold">{recipientName}</Text>
              <Text className="text-white/70 text-sm">{mobileNumber}</Text>
            </View>

            {/* Transaction Details */}
            <View className="space-y-3">
              <View className="flex-row justify-between">
                <Text className="text-white/70">Transaction ID</Text>
                <Text className="text-white font-mono text-sm">{transactionId}</Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-white/70">Date & Time</Text>
                <Text className="text-white">{formatDate()}</Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-white/70">Transfer Mode</Text>
                <Text className="text-white">IMPS</Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-white/70">Status</Text>
                <View className="flex-row items-center">
                  <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                  <Text className="text-green-400 font-medium">Completed</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10">
            <Text className="text-white text-lg font-semibold mb-4">Quick Actions</Text>

            <Pressable
              onPress={handleShareReceipt}
              className="flex-row items-center py-3 px-4 bg-white/5 rounded-xl mb-3"
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View className="w-10 h-10 bg-blue-500 rounded-full items-center justify-center mr-3">
                <Text className="text-white text-lg">📤</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-medium">Share Receipt</Text>
                <Text className="text-white/60 text-sm">Send transaction details</Text>
              </View>
              <Text className="text-white/40 text-xl">›</Text>
            </Pressable>

            <Pressable
              onPress={handleViewTransactions}
              className="flex-row items-center py-3 px-4 bg-white/5 rounded-xl"
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View className="w-10 h-10 bg-purple-500 rounded-full items-center justify-center mr-3">
                <Text className="text-white text-lg">📋</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-medium">View All Transactions</Text>
                <Text className="text-white/60 text-sm">Check transaction history</Text>
              </View>
              <Text className="text-white/40 text-xl">›</Text>
            </Pressable>
          </View>

          {/* Success Tips */}
          <View className="bg-green-500/10 rounded-2xl p-4 mb-8 border border-green-500/20">
            <View className="flex-row items-start">
              <Text className="text-green-400 text-lg mr-2">💡</Text>
              <View className="flex-1">
                <Text className="text-green-400 font-semibold mb-1">Pro Tip</Text>
                <Text className="text-green-400/80 text-sm">
                  Save frequently used contacts for faster transfers in the future.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Actions */}
        <View className="px-6 pb-6">
          <Pressable
            onPress={handleGoToDashboard}
            className="bg-white rounded-2xl py-4 px-6 mb-4"
            style={({ pressed }) => ({
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text className="text-center text-lg font-semibold text-gray-900">
              Back to Dashboard
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(app)/send-money')}
            className="py-3"
          >
            <Text className="text-white/60 text-center text-base">
              Send Another Payment
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}