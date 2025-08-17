import { useUserStore } from '@/stores/useUserStore';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, RefreshControl, SafeAreaView, ScrollView, Text, View } from 'react-native';

export default function TransactionsScreen() {
  const { transactions, fetchTransactions } = useUserStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'sent') return transaction.type === 'transfer' || transaction.type === 'debit';
    if (filter === 'received') return transaction.type === 'credit';
    return true;
  });

  const groupedTransactions = filteredTransactions.reduce((groups, transaction) => {
    const date = new Date(transaction.createdAt?.toDate?.() || transaction.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {} as Record<string, typeof transactions>);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="px-6 py-4 border-b border-gray-800">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <Text className="text-white text-xl">←</Text>
          </Pressable>
          <Text className="text-white text-lg font-bold">Transactions</Text>
          <View className="w-10" />
        </View>

        {/* Filter Tabs */}
        <View className="flex-row bg-gray-900 rounded-xl p-1">
          {(['all', 'sent', 'received'] as const).map((filterType) => (
            <Pressable
              key={filterType}
              onPress={() => setFilter(filterType)}
              className={`flex-1 py-2 px-4 rounded-lg ${filter === filterType ? 'bg-purple-600' : 'bg-transparent'
                }`}
            >
              <Text className={`text-center font-medium capitalize ${filter === filterType ? 'text-white' : 'text-gray-400'
                }`}>
                {filterType}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Transactions List */}
      <ScrollView
        className="flex-1 px-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />
        }
      >
        {Object.keys(groupedTransactions).length === 0 ? (
          <View className="items-center justify-center py-12">
            <View className="w-16 h-16 bg-gray-800 rounded-full items-center justify-center mb-4">
              <Text className="text-gray-400 text-2xl">📄</Text>
            </View>
            <Text className="text-gray-400 text-base mb-2">No transactions yet</Text>
            <Text className="text-gray-500 text-sm text-center">
              Your transaction history will appear here
            </Text>
          </View>
        ) : (
          Object.entries(groupedTransactions)
            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
            .map(([date, dayTransactions]) => (
              <View key={date} className="mb-6">
                <Text className="text-gray-400 text-sm font-medium mb-3 px-2">
                  {formatDate(date)}
                </Text>

                {dayTransactions.map((transaction) => (
                  <Pressable
                    key={transaction.id}
                    onPress={() => router.push({
                      pathname: '/(app)/transaction-details',
                      params: { transactionId: transaction.id }
                    })}
                    className="bg-gray-900 rounded-2xl p-4 mb-3"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${transaction.type === 'credit' ? 'bg-green-500/20' : 'bg-red-500/20'
                          }`}>
                          <Text className={`text-xl ${transaction.type === 'credit' ? 'text-green-400' : 'text-red-400'
                            }`}>
                            {transaction.type === 'credit' ? '↓' : '↑'}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-white font-medium text-base">
                            {transaction.description}
                          </Text>
                          <Text className="text-gray-400 text-sm">
                            {new Date(transaction.createdAt?.toDate?.() || transaction.createdAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Text>
                        </View>
                      </View>
                      <View className="items-end">
                        <Text className={`font-bold text-base ${transaction.type === 'credit' ? 'text-green-400' : 'text-red-400'
                          }`}>
                          {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount}
                        </Text>
                        <View className={`px-2 py-1 rounded-full ${transaction.status === 'completed' ? 'bg-green-500/20' :
                          transaction.status === 'pending' ? 'bg-yellow-500/20' : 'bg-red-500/20'
                          }`}>
                          <Text className={`text-xs font-medium capitalize ${transaction.status === 'completed' ? 'text-green-400' :
                            transaction.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                            {transaction.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}