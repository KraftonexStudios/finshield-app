import { useUserStore } from '@/stores/useUserStore';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, SafeAreaView, ScrollView, Share, Text, View } from 'react-native';

export default function TransactionDetailsScreen() {
  const { transactionId } = useLocalSearchParams();
  const { transactions } = useUserStore();

  // Find the actual transaction from the store
  const transaction = transactions.find(t => t.id === transactionId);

  // If transaction not found, show error state
  if (!transaction) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="px-6 py-4 border-b border-gray-800">
          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
              <Text className="text-white text-xl">←</Text>
            </Pressable>
            <Text className="text-white text-lg font-bold">Transaction Details</Text>
            <View className="w-10" />
          </View>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 bg-gray-800 rounded-full items-center justify-center mb-4">
            <Text className="text-gray-400 text-2xl">❌</Text>
          </View>
          <Text className="text-white font-medium text-center mb-2">Transaction Not Found</Text>
          <Text className="text-gray-400 text-sm text-center mb-6">
            The transaction you're looking for doesn't exist or has been removed.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="bg-purple-600 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-medium">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleShare = async () => {
    try {
      const transactionDate = transaction.createdAt ? 
        (transaction.createdAt.toDate ? transaction.createdAt.toDate() : new Date(transaction.createdAt)) :
        new Date(transaction.date);
      
      await Share.share({
        message: `Transaction Receipt\n\nAmount: ₹${transaction.amount}\nDescription: ${transaction.description}\nDate: ${transactionDate.toLocaleDateString('en-IN')}\nTransaction ID: ${transaction.id}\nStatus: ${transaction.status.toUpperCase()}`
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="px-6 py-4 border-b border-gray-800">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <Text className="text-white text-xl">←</Text>
          </Pressable>
          <Text className="text-white text-lg font-bold">Transaction Details</Text>
          <Pressable onPress={handleShare} className="w-10 h-10 items-center justify-center">
            <Text className="text-white text-xl">📤</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        {/* Status */}
        <View className="items-center mb-8">
          <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${transaction.status === 'completed' ? 'bg-green-500/20' :
              transaction.status === 'pending' ? 'bg-yellow-500/20' : 'bg-red-500/20'
            }`}>
            <Text className={`text-2xl ${transaction.status === 'completed' ? 'text-green-400' :
                transaction.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
              }`}>
              {transaction.status === 'completed' ? '✓' :
                transaction.status === 'pending' ? '⏳' : '✗'}
            </Text>
          </View>
          <Text className={`text-2xl font-bold mb-2 ${transaction.type === 'credit' ? 'text-green-400' : 'text-red-400'
            }`}>
            {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount}
          </Text>
          <Text className="text-gray-400 text-base capitalize">
            {transaction.status} • {transaction.type === 'credit' ? 'Received' : 'Sent'}
          </Text>
        </View>

        {/* Transaction Details */}
        <View className="bg-gray-900 rounded-2xl p-6 mb-6">
          <Text className="text-white text-lg font-bold mb-4">Details</Text>

          <View className="flex-row justify-between items-center py-3 border-b border-gray-800">
            <Text className="text-gray-400">Description</Text>
            <Text className="text-white font-medium">{transaction.description}</Text>
          </View>

          <View className="flex-row justify-between items-center py-3 border-b border-gray-800">
            <Text className="text-gray-400">Amount</Text>
            <Text className="text-white font-medium">₹{transaction.amount}</Text>
          </View>

          <View className="flex-row justify-between items-center py-3 border-b border-gray-800">
            <Text className="text-gray-400">Date</Text>
            <Text className="text-white font-medium">
              {(() => {
                const transactionDate = transaction.createdAt ? 
                  (transaction.createdAt.toDate ? transaction.createdAt.toDate() : new Date(transaction.createdAt)) :
                  new Date(transaction.date);
                return transactionDate.toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
              })()}
            </Text>
          </View>

          <View className="flex-row justify-between items-center py-3 border-b border-gray-800">
            <Text className="text-gray-400">Transaction ID</Text>
            <Text className="text-white font-medium">{transaction.id}</Text>
          </View>

          {transaction.note && (
            <View className="flex-row justify-between items-start py-3">
              <Text className="text-gray-400">Note</Text>
              <Text className="text-white font-medium text-right flex-1 ml-4">
                {transaction.note}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View className="space-y-3">
          <Pressable
            onPress={handleShare}
            className="bg-purple-600 rounded-2xl p-4"
          >
            <Text className="text-white font-medium text-center">Share Receipt</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(app)/send-money')}
            className="bg-gray-800 rounded-2xl p-4"
          >
            <Text className="text-white font-medium text-center">Send Money</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(app)/transactions')}
            className="bg-gray-800 rounded-2xl p-4"
          >
            <Text className="text-white font-medium text-center">View All Transactions</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}