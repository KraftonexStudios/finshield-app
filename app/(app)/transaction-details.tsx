import { useUserStore } from '@/stores/useUserStore';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CheckCircle, ChevronRight, Clock, Share2, XCircle } from 'lucide-react-native';
import React from 'react';
import { Pressable, SafeAreaView, ScrollView, Share, Text, View } from 'react-native';

export default function TransactionDetailsScreen() {
  const { transactionId } = useLocalSearchParams();
  const { transactions } = useUserStore();
  const transaction = transactions.find(t => t.id === transactionId);

  const getStatusIcon = () => {
    switch (transaction?.status) {
      case 'completed': return <CheckCircle size={32} color="#4ade80" />;
      case 'pending': return <Clock size={32} color="#facc15" />;
      default: return <XCircle size={32} color="#f87171" />;
    }
  };

  const handleShare = async () => {
    try {
      const transactionDate = transaction?.createdAt
        ? (transaction.createdAt.toDate ? transaction.createdAt.toDate() : new Date(transaction.createdAt))
        : new Date();

      await Share.share({
        message: `Transaction Receipt\n\nAmount: ₹${transaction?.amount}\nDescription: ${transaction?.description}\nDate: ${transactionDate.toLocaleDateString('en-IN')}\nTransaction ID: ${transaction?.id}\nStatus: ${transaction?.status?.toUpperCase()}`
      });
    } catch { }
  };

  if (!transaction) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="px-6 py-5 border-b border-gray-800">
          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => router.back()} className="w-12 h-12 items-center justify-center rounded-full">
              <ArrowLeft size={24} color="white" />
            </Pressable>
            <Text className="text-white text-lg font-bold">Transaction Details</Text>
            <View className="w-12" />
          </View>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 bg-gray-800 rounded-full items-center justify-center mb-4">
            <XCircle size={32} color="#9ca3af" />
          </View>
          <Text className="text-white font-medium text-center mb-2">Transaction Not Found</Text>
          <Text className="text-gray-400 text-sm text-center mb-6">
            The transaction you're looking for doesn't exist or has been removed.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="bg-purple-600 px-8 py-3 rounded-xl"
          >
            <Text className="text-white font-medium">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="px-6 py-5 border-b border-gray-800">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="w-12 h-12 items-center justify-center rounded-full">
            <ArrowLeft size={24} color="white" />
          </Pressable>
          <Text className="text-white text-lg font-bold">Transaction Details</Text>
          <Pressable onPress={handleShare} className="w-12 h-12 items-center justify-center rounded-full">
            <Share2 size={24} color="white" />
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false}>
        {/* Status */}
        <View className="items-center mb-8">
          <View className="w-20 h-20 bg-gray-800 rounded-full items-center justify-center mb-4">
            {getStatusIcon()}
          </View>
          <Text className={`text-2xl font-bold mb-2 ${transaction.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
            {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount}
          </Text>
          <Text className="text-gray-400 capitalize">
            {transaction.status} • {transaction.type === 'credit' ? 'Received' : 'Sent'}
          </Text>
        </View>

        {/* Transaction Details */}
        <View className="bg-gray-900 rounded-2xl p-6 mb-8">
          <Text className="text-white text-lg font-bold mb-4">Details</Text>
          {[
            { label: 'Description', value: transaction.description },
            { label: 'Amount', value: `₹${transaction.amount}` },
            {
              label: 'Date',
              value: (() => {
                const date = transaction.createdAt?.toDate
                  ? transaction.createdAt.toDate()
                  : new Date(transaction.createdAt);
                return date.toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
              })()
            },
            { label: 'Transaction ID', value: transaction.id },
            ...(transaction.note ? [{ label: 'Note', value: transaction.note }] : [])
          ].map((item, i, arr) => (
            <View
              key={i}
              className={`py-3 ${i < arr.length - 1 ? 'border-b border-gray-800' : ''}`}
            >
              <Text className="text-gray-400 mb-1">{item.label}</Text>
              <Text className="text-white font-medium">{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View className="flex flex-col gap-2">

          <Pressable
            onPress={handleShare}
            className="bg-purple-600 rounded-2xl py-4"
          >
            <Text className="text-white font-medium text-center">Share Receipt</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(app)/send-money')}
            className="bg-gray-800 rounded-2xl py-4"
          >
            <Text className="text-white font-medium text-center">Send Money</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(app)/transactions')}
            className="bg-gray-800 rounded-2xl py-4 flex-row items-center justify-center"
          >
            <Text className="text-white font-medium">View All Transactions</Text>
            <ChevronRight size={18} color="#9ca3af" style={{ marginLeft: 8 }} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
