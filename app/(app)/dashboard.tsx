import { useDataCollectionStore } from '@/stores/useDataCollectionStore';
import { useUserStore } from '@/stores/useUserStore';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { AppState, Pressable, RefreshControl, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { TouchTrackingWrapper } from '@/components/TouchTrackingWrapper';

export default function DashboardScreen() {
  console.log("🟢 Dashboard component loaded with endSession test button");
  const { user, logout, transactions, fetchTransactions, subscribeToTransactions, subscribeToBalance, refreshUserData } = useUserStore();
  const { startSession, startDataCollection, handleAppStateChange, sendDataToServer, stopDataCollection, collectionScenario, currentSession } = useDataCollectionStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);

  useEffect(() => {
    // Subscribe to real-time updates
    subscribeToTransactions();
    subscribeToBalance();

    // Fetch initial data
    fetchTransactions();

    // Only start data collection when user actively interacts with the dashboard
    // This ensures we don't collect data without meaningful user engagement
  }, []);

  useEffect(() => {
    // Handle app state changes for data collection
    const handleAppStateChangeWrapper = (nextAppState: string) => {
      handleAppStateChange(nextAppState);

      // Send data when app goes to background (only if sufficient data collected)
      if (nextAppState === 'background' && collectionScenario === 'login') {
        const sendDataOnBackground = async () => {
          try {
            // Wait at least 30 seconds before sending data to ensure meaningful collection
            const { sessionStartTime, touchEvents, motionPatterns, keystrokes, sessionId } = useDataCollectionStore.getState();
            const sessionDuration = Date.now() - (sessionStartTime || 0);
            const hasMinimumData = touchEvents.length > 5 || motionPatterns.length > 3;

            // Always send data when app goes to background regardless of quality
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
            await sendDataToServer(`${apiUrl}/api/data/regular`);
          } catch (error) {
            // Failed to send data on background
          }
        };
        sendDataOnBackground();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChangeWrapper);

    return () => {
      subscription?.remove();
    };
  }, [collectionScenario]);

  useEffect(() => {
    // Cleanup data collection when component unmounts
    return () => {
      const cleanup = async () => {
        if (collectionScenario === 'login') {
          try {
            // Only send data if we have collected for a reasonable duration
            const { sessionStartTime, touchEvents, motionPatterns, keystrokes, sessionId } = useDataCollectionStore.getState();
            const sessionDuration = Date.now() - (sessionStartTime || 0);
            const hasMinimumData = touchEvents.length > 5 || motionPatterns.length > 3;

            // Always send data on app closure regardless of quality
            // End session properly (this will also send data to server)
            const session = await useDataCollectionStore.getState().endSession();
            if (!session) {
              // Fallback: send data manually if endSession fails
              const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
              await sendDataToServer(`${apiUrl}/api/data/regular`);
              // Note: Don't call stopDataCollection here as endSession already handles it
            }
          } catch (error) {
            // Failed to send data on cleanup
          }
        }
      };
      cleanup();
    };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const quickActions = [
    { id: 'transfer', title: 'Transfer', icon: '💸', color: 'bg-blue-500' },
    { id: 'pay', title: 'Pay Bills', icon: '📄', color: 'bg-green-500' },
    { id: 'recharge', title: 'Recharge', icon: '📱', color: 'bg-purple-500' },
    { id: 'scan', title: 'Scan QR', icon: '📷', color: 'bg-orange-500' },
  ];

  // Get recent transactions from store (limit to 3 for dashboard)
  const recentTransactions = transactions.slice(0, 3);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchTransactions(),
        refreshUserData()
      ]);
    } catch (error) {
      // Failed to refresh data
    } finally {
      setIsRefreshing(false);
    }
  };

  // Start data collection on first meaningful user interaction
  const handleUserInteraction = async () => {
    console.log("🟡 User interaction detected:", {
      hasCollectionScenario: !!collectionScenario,
      hasCurrentSession: !!currentSession,
      userId: user?.id || 'dashboard_user'
    });
    
    if (!currentSession) {
      console.log("🟢 Starting session and data collection for user interaction");
      // First start a session, then start data collection
      await startSession(user?.id || 'dashboard_user');
      await startDataCollection('login');
    } else if (!collectionScenario) {
      console.log("🟢 Session exists but no data collection - starting collection");
      await startDataCollection('login');
    } else {
      console.log("🟡 Session and data collection already active");
    }
  };



  return (
    <SafeAreaView className="flex-1 bg-black">
      <TouchTrackingWrapper className="flex-1">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          onTouchStart={handleUserInteraction}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#8B5CF6"
              colors={['#8B5CF6']}
            />
          }
        >
          {/* Header */}
          <View className="px-6 py-10">
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-gray-400 text-sm">Good Morning</Text>
                <Text className="text-white text-xl font-bold">{user?.fullName || 'User'}</Text>
              </View>
              <Pressable
                onPress={() => router.push('/(app)/profile')}
                className="w-10 h-10 bg-gray-800 rounded-full items-center justify-center"
              >
                <Text className="text-white text-lg">👤</Text>
              </Pressable>
            </View>

            {/* Balance Display */}
            <View className="items-center mb-8">
              <View className="flex-row items-center mb-2">
                <View className="w-2 h-2 bg-purple-500 rounded-full mr-2" />
                <View className="w-2 h-2 bg-purple-500 rounded-full mr-2" />
                <View className="w-2 h-2 bg-purple-500 rounded-full mr-2" />
                <View className="w-2 h-2 bg-purple-500 rounded-full" />
              </View>
              <View className="flex-row items-center mb-1">
                <Text className="text-white text-4xl font-bold">
                  {balanceVisible ? `₹${(user?.balance || 1250.00).toFixed(2)}` : '₹••••••'}
                </Text>
                <Pressable
                  onPress={() => setBalanceVisible(!balanceVisible)}
                  className="ml-3 bg-gray-800 rounded-full p-2"
                >
                  <Text className="text-white text-sm">{balanceVisible ? '👁️' : '👁️‍🗨️'}</Text>
                </Pressable>
              </View>
              <Text className="text-gray-400 text-sm">Available Balance</Text>
              {isRefreshing && (
                <Text className="text-gray-400 text-xs mt-1">Updating...</Text>
              )}
            </View>

            {/* Action Buttons */}
            <View className="flex-row justify-center space-x-4 mb-8">
              <Pressable
                onPress={() => router.push('/(app)/send-money')}
                className="bg-gray-800 rounded-full px-6 py-3"
              >
                <Text className="text-white font-medium">Send</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/(app)/request-money')}
                className="bg-gray-800 rounded-full px-6 py-3"
              >
                <Text className="text-white font-medium">Request</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/(app)/more-services')}
                className="bg-gray-800 rounded-full px-6 py-3"
              >
                <Text className="text-white font-medium">More</Text>
              </Pressable>
            </View>
          </View>



          {/* Send Money */}
          <View className="px-6 pb-8">
            <Text className="text-white text-lg font-bold mb-4">Quick Send</Text>
            <View className="flex-row justify-between">
              <Pressable
                onPress={() => router.push('/(app)/send-money')}
                className="bg-purple-600 rounded-2xl p-6 flex-1 mr-2 items-center"
              >
                <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center mb-2">
                  <Text className="text-white text-xl">💸</Text>
                </View>
                <Text className="text-white text-sm font-medium">Send Money</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(app)/request-money')}
                className="bg-gray-900 rounded-2xl p-6 flex-1 ml-2 items-center"
              >
                <View className="w-12 h-12 bg-purple-500/20 rounded-full items-center justify-center mb-2">
                  <Text className="text-purple-400 text-xl">📥</Text>
                </View>
                <Text className="text-white text-sm font-medium">Request Money</Text>
              </Pressable>
            </View>
          </View>
          {/* My Card Section */}
          <View className="px-6 mb-6">
            <Text className="text-white text-lg font-bold mb-4">My Card</Text>

            {user?.accountNumber ? (
              <Pressable
                onPress={() => router.push('/(app)/my-card')}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 mb-4"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-white text-lg font-bold mb-1">Virtual Debit Card</Text>
                    <Text className="text-white/80 text-sm mb-3">
                      {balanceVisible ? '•••• •••• •••• 9012' : '•••• •••• •••• ••••'}
                    </Text>
                    <Text className="text-white/60 text-xs">Tap to view card details</Text>
                  </View>
                  <View className="items-end">
                    <View className="w-12 h-8 bg-white/20 rounded-lg items-center justify-center mb-2">
                      <Text className="text-white text-xs font-bold">VISA</Text>
                    </View>
                    <Text className="text-white/80 text-sm">12/28</Text>
                    <View className={`mt-1 px-2 py-1 rounded-full ${(user?.balance || 0) > 1000 ? 'bg-green-600/20' : 'bg-yellow-600/20'
                      }`}>
                      <Text className={`text-xs ${(user?.balance || 0) > 1000 ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                        {(user?.balance || 0) > 1000 ? 'Active' : 'Low Balance'}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ) : (
              <View className="bg-gray-700/50 rounded-2xl p-6 items-center border-2 border-dashed border-gray-600 mb-4">
                <View className="w-12 h-12 bg-gray-600 rounded-full items-center justify-center mb-3">
                  <Text className="text-gray-400 text-xl">💳</Text>
                </View>
                <Text className="text-white font-medium text-center mb-2">
                  No Virtual Card
                </Text>
                <Text className="text-gray-400 text-sm text-center mb-4">
                  Create a virtual card to make online payments securely
                </Text>
                <Pressable className="bg-purple-600 px-6 py-2 rounded-xl">
                  <Text className="text-white font-medium">Create Card</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Recent Transactions */}
          <View className="px-6 pb-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-lg font-bold">Recent Activity</Text>
              <Pressable onPress={() => router.push('/(app)/transactions')}>
                <Text className="text-purple-400 text-sm">View All</Text>
              </Pressable>
            </View>

            {recentTransactions.length > 0 ? (
              <View className="space-y-3 gap-2">
                {recentTransactions.map((transaction, index) => (
                  <View key={transaction.id} className="bg-gray-900 rounded-2xl p-4">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${transaction.type === 'credit' ? 'bg-green-500/20' : 'bg-red-500/20'
                          }`}>
                          <Text className={`text-lg ${transaction.type === 'credit' ? 'text-green-400' : 'text-red-400'
                            }`}>
                            {transaction.type === 'credit' ? '↓' : '↑'}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-white font-medium">
                            {transaction.description}
                          </Text>
                          <View className="flex-row items-center">
                            <Text className="text-gray-400 text-sm">
                              {transaction.createdAt ?
                                new Date(transaction.createdAt.toDate ? transaction.createdAt.toDate() : transaction.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
                                new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              }
                            </Text>
                            <View className={`ml-2 px-2 py-1 rounded-full ${transaction.status === 'completed' ? 'bg-green-600/20' :
                              transaction.status === 'pending' ? 'bg-yellow-600/20' : 'bg-red-600/20'
                              }`}>
                              <Text className={`text-xs ${transaction.status === 'completed' ? 'text-green-400' :
                                transaction.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                {transaction.status}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                      <Text className={`font-bold ${transaction.type === 'credit' ? 'text-green-400' : 'text-red-400'
                        }`}>
                        {balanceVisible ?
                          `${transaction.type === 'credit' ? '+' : '-'}₹${transaction.amount}` :
                          `${transaction.type === 'credit' ? '+' : '-'}₹•••`
                        }
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="bg-gray-800/50 rounded-2xl p-8 items-center">
                <View className="w-16 h-16 bg-gray-700 rounded-full items-center justify-center mb-4">
                  <Text className="text-gray-400 text-2xl">📊</Text>
                </View>
                <Text className="text-white font-medium text-center mb-2">
                  No Transactions Yet
                </Text>
                <Text className="text-gray-400 text-sm text-center mb-4">
                  Your transaction history will appear here once you start making payments
                </Text>
                <Pressable
                  onPress={() => router.push('/(app)/send-money')}
                  className="bg-purple-600 px-6 py-2 rounded-xl"
                >
                  <Text className="text-white font-medium">Send Money</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Quick Send */}

        </ScrollView>
      </TouchTrackingWrapper>
    </SafeAreaView>
  );
}