import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, SafeAreaView, Share, Text, View } from 'react-native';

export default function BillSuccessScreen() {
  const { provider, billNumber, amount, customerName, category, transactionId } = useLocalSearchParams<{
    provider: string;
    billNumber: string;
    amount: string;
    customerName?: string;
    category: string;
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

  const handleShareReceipt = async () => {
    try {
      const message = `💳 Bill Payment Successful!\n\n` +
        `Provider: ${provider}\n` +
        `Bill Number: ${billNumber}\n` +
        `${customerName ? `Customer: ${customerName}\n` : ''}` +
        `Category: ${getCategoryName(category)}\n` +
        `Amount: ${formatCurrency(Number(amount))}\n` +
        `Transaction ID: ${transactionId}\n` +
        `Date: ${new Date().toLocaleDateString('en-IN')}\n\n` +
        `Powered by SecurePay`;
      
      await Share.share({
        message,
        title: 'Bill Payment Receipt',
      });
    } catch (error) {
      console.error('Error sharing receipt:', error);
    }
  };

  const handleGoToDashboard = () => {
    router.replace('/(app)/dashboard');
  };

  const handlePayAnotherBill = () => {
    router.push('/(app)/bill-payment');
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
            <View className="w-24 h-24 bg-green-500 rounded-full items-center justify-center mb-6">
              <Text className="text-white text-4xl">✓</Text>
            </View>
            <Text className="text-3xl font-bold text-white mb-3 text-center">
              Payment Successful!
            </Text>
            <Text className="text-white/70 text-center text-lg">
              Your {getCategoryName(category).toLowerCase()} bill has been paid
            </Text>
          </View>

          {/* Receipt Card */}
          <View className="bg-white/10 rounded-3xl p-6 mb-8 border border-white/20">
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-purple-600 rounded-full items-center justify-center mb-4">
                <Text className="text-white text-2xl">{getCategoryIcon(category)}</Text>
              </View>
              <Text className="text-white text-3xl font-bold mb-2">
                {formatCurrency(Number(amount))}
              </Text>
              <Text className="text-white/70 text-lg text-center">
                Paid to {provider}
              </Text>
            </View>

            {/* Transaction Details */}
            <View className="space-y-4">
              <View className="flex-row justify-between items-center py-2 border-b border-white/10">
                <Text className="text-white/70">Provider</Text>
                <Text className="text-white font-semibold">{provider}</Text>
              </View>
              
              <View className="flex-row justify-between items-center py-2 border-b border-white/10">
                <Text className="text-white/70">Bill Number</Text>
                <Text className="text-white font-semibold">{billNumber}</Text>
              </View>
              
              {customerName && (
                <View className="flex-row justify-between items-center py-2 border-b border-white/10">
                  <Text className="text-white/70">Customer Name</Text>
                  <Text className="text-white font-semibold">{customerName}</Text>
                </View>
              )}
              
              <View className="flex-row justify-between items-center py-2 border-b border-white/10">
                <Text className="text-white/70">Category</Text>
                <Text className="text-white font-semibold">{getCategoryName(category)}</Text>
              </View>
              
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
              onPress={handlePayAnotherBill}
              className="bg-purple-600 rounded-2xl py-4 px-6 mb-4"
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text className="text-white text-center font-semibold text-lg">
                Pay Another Bill
              </Text>
            </Pressable>

            <View className="flex-row space-x-4">
              <Pressable
                onPress={handleViewTransactions}
                className="bg-white/10 rounded-2xl py-4 px-6 flex-1 border border-white/20"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text className="text-white text-center font-semibold">
                  View Transactions
                </Text>
              </Pressable>

              <Pressable
                onPress={handleGoToDashboard}
                className="bg-white/10 rounded-2xl py-4 px-6 flex-1 border border-white/20"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text className="text-white text-center font-semibold">
                  Dashboard
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Success Message */}
          <View className="bg-green-500/10 rounded-2xl p-4 mt-6 border border-green-500/20">
            <View className="flex-row items-start">
              <Text className="text-green-400 text-lg mr-3">🎉</Text>
              <View className="flex-1">
                <Text className="text-green-400 font-semibold mb-1">
                  Payment Processed Successfully
                </Text>
                <Text className="text-green-400/80 text-sm">
                  Your bill payment has been completed and will be reflected in your account within 24 hours.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}