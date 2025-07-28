import { useUserStore } from '@/stores/useUserStore';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

export default function BillConfirmationScreen() {
  const { provider, billNumber, amount, customerName, category } = useLocalSearchParams<{
    provider: string;
    billNumber: string;
    amount: string;
    customerName?: string;
    category: string;
  }>();

  const { user, processTransaction } = useUserStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseInt(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numAmount);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'electricity': return '⚡';
      case 'gas': return '🔥';
      case 'water': return '💧';
      case 'mobile': return '📱';
      case 'internet': return '🌐';
      case 'dth': return '📺';
      case 'insurance': return '🛡️';
      default: return '📄';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'electricity': return 'Electricity';
      case 'gas': return 'Gas';
      case 'water': return 'Water';
      case 'mobile': return 'Mobile';
      case 'internet': return 'Internet';
      case 'dth': return 'DTH';
      case 'insurance': return 'Insurance';
      default: return 'Bill';
    }
  };

  const billAmount = parseInt(amount);
  const convenienceFee = billAmount > 1000 ? 5 : 2;
  const totalAmount = billAmount + convenienceFee;

  const handleConfirmPayment = async () => {
    if (isProcessing) return;

    if (totalAmount > (user?.balance ?? 0)) {
      Alert.alert('Insufficient Balance', 'You do not have enough balance to pay this bill.');
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Process the bill payment transaction
      const success = await processTransaction({
        type: 'bill_payment',
        amount: totalAmount,
        description: `${getCategoryName(category)} Bill - ${provider}`,
        recipientMobile: billNumber,
        metadata: {
          provider,
          billNumber,
          customerName,
          category,
          convenienceFee
        }
      });

      if (success) {
        router.replace({
          pathname: '/(app)/bill-success',
          params: {
            provider,
            billNumber,
            amount: amount,
            customerName,
            category,
            transactionId: Date.now().toString()
          }
        });
      } else {
        Alert.alert('Payment Failed', 'Unable to process bill payment. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while processing the payment.');
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
              <Text className="text-2xl font-bold text-white">Confirm Payment</Text>
            </View>

            {/* Bill Details Card */}
            <View className="bg-white/10 rounded-3xl p-6 mb-6 border border-white/20">
              <View className="items-center mb-6">
                <View className="w-16 h-16 bg-purple-600 rounded-full items-center justify-center mb-4">
                  <Text className="text-white text-2xl">{getCategoryIcon(category)}</Text>
                </View>
                <Text className="text-white text-2xl font-bold mb-2">
                  {formatCurrency(billAmount)}
                </Text>
                <Text className="text-white/70 text-lg">
                  {getCategoryName(category)} Bill Payment
                </Text>
              </View>

              {/* Bill Information */}
              <View className="space-y-4">
                <View className="flex-row justify-between items-center py-3 border-b border-white/10">
                  <Text className="text-white/70">Provider</Text>
                  <Text className="text-white font-semibold">{provider}</Text>
                </View>
                
                <View className="flex-row justify-between items-center py-3 border-b border-white/10">
                  <Text className="text-white/70">Bill Number</Text>
                  <Text className="text-white font-semibold">{billNumber}</Text>
                </View>
                
                {customerName && (
                  <View className="flex-row justify-between items-center py-3 border-b border-white/10">
                    <Text className="text-white/70">Customer Name</Text>
                    <Text className="text-white font-semibold">{customerName}</Text>
                  </View>
                )}
                
                <View className="flex-row justify-between items-center py-3 border-b border-white/10">
                  <Text className="text-white/70">Bill Category</Text>
                  <Text className="text-white font-semibold">{getCategoryName(category)}</Text>
                </View>
                
                <View className="flex-row justify-between items-center py-3 border-b border-white/10">
                  <Text className="text-white/70">Bill Amount</Text>
                  <Text className="text-white font-semibold">{formatCurrency(billAmount)}</Text>
                </View>
                
                <View className="flex-row justify-between items-center py-3 border-b border-white/10">
                  <Text className="text-white/70">Convenience Fee</Text>
                  <Text className="text-white font-semibold">{formatCurrency(convenienceFee)}</Text>
                </View>
                
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
                    Please verify the bill details carefully. Payment cannot be reversed once completed.
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
                <Text className="text-white/70">Balance After Payment</Text>
                <Text className={`font-semibold ${
                  (user?.balance ?? 0) - totalAmount >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatCurrency(Math.max(0, (user?.balance ?? 0) - totalAmount))}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="space-y-4">
              <Pressable
                onPress={handleConfirmPayment}
                disabled={isProcessing || totalAmount > (user?.balance ?? 0)}
                className={`rounded-2xl py-4 px-6 ${
                    isProcessing || totalAmount > (user?.balance ?? 0)
                    ? 'bg-gray-600'
                    : 'bg-purple-600'
                }`}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text className="text-white text-center font-semibold text-lg">
                  {isProcessing ? 'Processing Payment...' : 'Confirm Payment'}
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