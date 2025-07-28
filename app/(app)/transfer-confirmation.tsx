import { useUserStore } from '@/stores/useUserStore';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

export default function TransferConfirmationScreen() {
  const { amount, mobileNumber, note, recipientName } = useLocalSearchParams<{
    amount: string;
    mobileNumber: string;
    note: string;
    recipientName: string;
  }>();

  const { user, processTransaction } = useUserStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const formatCurrency = (value: string | number) => {
    const numericValue = typeof value === 'string' ? parseInt(value) : value;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(numericValue);
  };

  const handleConfirmTransfer = async () => {
    setIsProcessing(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Process the transaction
      const transactionData = {
        id: Date.now().toString(),
        type: 'debit' as const,
        amount: parseInt(amount),
        description: `Transfer to ${recipientName || mobileNumber}`,
        date: new Date().toISOString(),
        recipient: {
          name: recipientName || 'Unknown',
          mobile: mobileNumber
        },
        note: note || '',
        status: 'completed' as const
      };

      await processTransaction(transactionData);

      // Navigate to success screen
      router.replace({
        pathname: '/(app)/transfer-success',
        params: {
          amount,
          recipientName: recipientName || 'Unknown',
          mobileNumber,
          transactionId: transactionData.id
        }
      });
    } catch (error) {
      Alert.alert('Transaction Failed', 'Unable to process the transaction. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const transactionFee = parseInt(amount) > 10000 ? 5 : 0;
  const totalAmount = parseInt(amount) + transactionFee;

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
                disabled={isProcessing}
              >
                <Text className="text-white text-xl">←</Text>
              </Pressable>
              <Text className="text-2xl font-bold text-white">Confirm Transfer</Text>
            </View>

            {/* Transaction Summary Card */}
            <View className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10">
              <View className="items-center mb-6">
                <View className="w-16 h-16 bg-purple-500 rounded-full items-center justify-center mb-3">
                  <Text className="text-white text-2xl font-bold">
                    {(recipientName || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text className="text-white text-xl font-bold">{recipientName || 'Unknown'}</Text>
                <Text className="text-white/70 text-sm">{mobileNumber}</Text>
              </View>

              <View className="items-center py-4 border-t border-b border-white/10">
                <Text className="text-white/70 text-sm mb-1">Amount to Send</Text>
                <Text className="text-white text-3xl font-bold">{formatCurrency(amount)}</Text>
              </View>
            </View>

            {/* Transaction Details */}
            <View className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10">
              <Text className="text-white text-lg font-semibold mb-4">Transaction Details</Text>

              <View className="space-y-4">
                <View className="flex-row justify-between">
                  <Text className="text-white/70">Transfer Amount</Text>
                  <Text className="text-white font-medium">{formatCurrency(amount)}</Text>
                </View>

                {transactionFee > 0 && (
                  <View className="flex-row justify-between">
                    <Text className="text-white/70">Transaction Fee</Text>
                    <Text className="text-white font-medium">{formatCurrency(transactionFee)}</Text>
                  </View>
                )}

                <View className="flex-row justify-between border-t border-white/10 pt-4">
                  <Text className="text-white font-semibold">Total Amount</Text>
                  <Text className="text-white font-bold text-lg">{formatCurrency(totalAmount)}</Text>
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-white/70">From Account</Text>
                  <Text className="text-white font-medium">
                    {user?.accountNumber ? `****${user.accountNumber.toString().slice(-4)}` : '****1234'}
                  </Text>
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-white/70">Transfer Mode</Text>
                  <Text className="text-white font-medium">IMPS</Text>
                </View>

                {note && (
                  <View className="flex-row justify-between">
                    <Text className="text-white/70">Note</Text>
                    <Text className="text-white font-medium flex-1 text-right" numberOfLines={2}>
                      {note}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Security Notice */}
            <View className="bg-yellow-500/10 rounded-2xl p-4 mb-6 border border-yellow-500/20">
              <View className="flex-row items-start">
                <Text className="text-yellow-400 text-lg mr-2">⚠️</Text>
                <View className="flex-1">
                  <Text className="text-yellow-400 font-semibold mb-1">Security Notice</Text>
                  <Text className="text-yellow-400/80 text-sm">
                    Please verify the recipient details carefully. This transaction cannot be reversed once completed.
                  </Text>
                </View>
              </View>
            </View>

            {/* Balance Check */}
            <View className="bg-white/5 rounded-2xl p-4 mb-8 border border-white/10">
              <View className="flex-row justify-between items-center">
                <Text className="text-white/70">Available Balance</Text>
                <Text className="text-white font-semibold">
                  {formatCurrency(user?.balance ?? 0)}
                </Text>
              </View>
              <View className="flex-row justify-between items-center mt-2">
                <Text className="text-white/70">Balance After Transfer</Text>
                <Text className={`font-semibold ${(user?.balance || 0) - totalAmount >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                  {formatCurrency((user?.balance || 0) - totalAmount)}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View className="px-6 pb-6">
          <Pressable
            onPress={handleConfirmTransfer}
            className="bg-white rounded-2xl py-4 px-6 mb-4"
            disabled={isProcessing || (user?.balance || 0) < totalAmount}
            style={({ pressed }) => ({
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text className="text-center text-lg font-semibold text-gray-900">
              {isProcessing ? 'Processing...' : 'Confirm & Send'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            className="py-3"
            disabled={isProcessing}
          >
            <Text className="text-white/60 text-center text-base">
              Cancel
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}