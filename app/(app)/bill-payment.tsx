import { useUserStore } from '@/stores/useUserStore';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';

interface BillProvider {
  id: string;
  name: string;
  category: string;
  icon: string;
  color: string;
}

interface BillCategory {
  id: string;
  name: string;
  icon: string;
  providers: BillProvider[];
}

export default function BillPaymentScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<BillProvider | null>(null);
  const [billNumber, setBillNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUserStore();

  const billCategories: BillCategory[] = [
    {
      id: 'electricity',
      name: 'Electricity',
      icon: '⚡',
      providers: [
        { id: 'mseb', name: 'MSEB', category: 'electricity', icon: '⚡', color: 'bg-yellow-500' },
        { id: 'bses', name: 'BSES', category: 'electricity', icon: '⚡', color: 'bg-yellow-500' },
        { id: 'tata_power', name: 'Tata Power', category: 'electricity', icon: '⚡', color: 'bg-yellow-500' },
      ]
    },
    {
      id: 'gas',
      name: 'Gas',
      icon: '🔥',
      providers: [
        { id: 'indane', name: 'Indane Gas', category: 'gas', icon: '🔥', color: 'bg-orange-500' },
        { id: 'hp_gas', name: 'HP Gas', category: 'gas', icon: '🔥', color: 'bg-orange-500' },
        { id: 'bharat_gas', name: 'Bharat Gas', category: 'gas', icon: '🔥', color: 'bg-orange-500' },
      ]
    },
    {
      id: 'water',
      name: 'Water',
      icon: '💧',
      providers: [
        { id: 'bmc', name: 'BMC Water', category: 'water', icon: '💧', color: 'bg-blue-500' },
        { id: 'delhi_jal', name: 'Delhi Jal Board', category: 'water', icon: '💧', color: 'bg-blue-500' },
        { id: 'bwssb', name: 'BWSSB', category: 'water', icon: '💧', color: 'bg-blue-500' },
      ]
    },
    {
      id: 'mobile',
      name: 'Mobile',
      icon: '📱',
      providers: [
        { id: 'airtel', name: 'Airtel', category: 'mobile', icon: '📱', color: 'bg-red-500' },
        { id: 'jio', name: 'Jio', category: 'mobile', icon: '📱', color: 'bg-blue-600' },
        { id: 'vi', name: 'Vi (Vodafone Idea)', category: 'mobile', icon: '📱', color: 'bg-red-600' },
        { id: 'bsnl', name: 'BSNL', category: 'mobile', icon: '📱', color: 'bg-yellow-600' },
      ]
    },
    {
      id: 'internet',
      name: 'Internet',
      icon: '🌐',
      providers: [
        { id: 'jio_fiber', name: 'Jio Fiber', category: 'internet', icon: '🌐', color: 'bg-blue-600' },
        { id: 'airtel_fiber', name: 'Airtel Xstream', category: 'internet', icon: '🌐', color: 'bg-red-500' },
        { id: 'act', name: 'ACT Fibernet', category: 'internet', icon: '🌐', color: 'bg-purple-500' },
      ]
    },
    {
      id: 'dth',
      name: 'DTH/Cable',
      icon: '📺',
      providers: [
        { id: 'tata_sky', name: 'Tata Play', category: 'dth', icon: '📺', color: 'bg-blue-700' },
        { id: 'dish_tv', name: 'Dish TV', category: 'dth', icon: '📺', color: 'bg-orange-600' },
        { id: 'airtel_dth', name: 'Airtel Digital TV', category: 'dth', icon: '📺', color: 'bg-red-500' },
      ]
    }
  ];

  const formatCurrency = (value: string | number) => {
    const numericValue = typeof value === 'string' ? parseInt(value) : value;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(numericValue);
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedProvider(null);
    setBillNumber('');
    setAmount('');
    setCustomerName('');
  };

  const handleProviderSelect = (provider: BillProvider) => {
    setSelectedProvider(provider);
  };

  const fetchBillDetails = async () => {
    if (!billNumber || !selectedProvider) {
      Alert.alert('Error', 'Please enter bill number and select provider');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call to fetch bill details
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock bill details
      const mockAmount = Math.floor(Math.random() * 5000) + 500;
      const mockCustomerName = 'John Doe';

      setAmount(mockAmount.toString());
      setCustomerName(mockCustomerName);

      Alert.alert('Bill Fetched', `Bill details loaded successfully for ${mockCustomerName}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch bill details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayBill = () => {
    if (!amount || !billNumber || !selectedProvider) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (parseInt(amount) > (user?.balance ?? 0)) {
      Alert.alert('Insufficient Balance', 'You do not have enough balance to pay this bill.');
      return;
    }

    router.push({
      pathname: '/(app)/bill-confirmation',
      params: {
        provider: selectedProvider.name,
        billNumber,
        amount,
        customerName,
        category: selectedProvider.category
      }
    });
  };

  const getCurrentProviders = () => {
    const category = billCategories.find(cat => cat.id === selectedCategory);
    return category?.providers || [];
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
              <Text className="text-2xl font-bold text-white">Pay Bills</Text>
            </View>

            {/* Bill Categories */}
            {!selectedCategory && (
              <View className="mb-6">
                <Text className="text-white text-lg font-semibold mb-4">Select Bill Type</Text>
                <View className="flex-row flex-wrap gap-3">
                  {billCategories.map((category) => (
                    <Pressable
                      key={category.id}
                      onPress={() => handleCategorySelect(category.id)}
                      className="bg-white/5 rounded-2xl p-4 border border-white/10 flex-1 min-w-[45%] items-center"
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text className="text-3xl mb-2">{category.icon}</Text>
                      <Text className="text-white font-medium text-center">{category.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Provider Selection */}
            {selectedCategory && !selectedProvider && (
              <View className="mb-6">
                <View className="flex-row items-center mb-4">
                  <Pressable
                    onPress={() => setSelectedCategory('')}
                    className="mr-3"
                  >
                    <Text className="text-white/60 text-xl">←</Text>
                  </Pressable>
                  <Text className="text-white text-lg font-semibold">
                    Select {billCategories.find(cat => cat.id === selectedCategory)?.name} Provider
                  </Text>
                </View>
                <View className="space-y-3">
                  {getCurrentProviders().map((provider) => (
                    <Pressable
                      key={provider.id}
                      onPress={() => handleProviderSelect(provider)}
                      className="flex-row items-center p-4 bg-white/5 rounded-2xl border border-white/10"
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <View className={`w-12 h-12 ${provider.color} rounded-full items-center justify-center mr-4`}>
                        <Text className="text-white text-xl">{provider.icon}</Text>
                      </View>
                      <Text className="text-white font-medium flex-1">{provider.name}</Text>
                      <Text className="text-white/40 text-xl">›</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Bill Payment Form */}
            {selectedProvider && (
              <View className="mb-6">
                <View className="flex-row items-center mb-6">
                  <Pressable
                    onPress={() => setSelectedProvider(null)}
                    className="mr-3"
                  >
                    <Text className="text-white/60 text-xl">←</Text>
                  </Pressable>
                  <View className={`w-10 h-10 ${selectedProvider.color} rounded-full items-center justify-center mr-3`}>
                    <Text className="text-white">{selectedProvider.icon}</Text>
                  </View>
                  <Text className="text-white text-lg font-semibold">{selectedProvider.name}</Text>
                </View>

                {/* Bill Number Input */}
                <View className="bg-white/5 rounded-2xl p-6 mb-4 border border-white/10">
                  <Text className="text-white/70 text-sm mb-3">Bill Number / Consumer ID</Text>
                  <TextInput
                    value={billNumber}
                    onChangeText={setBillNumber}
                    placeholder="Enter your bill number"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    className="text-white text-lg bg-white/5 rounded-xl px-4 py-3 border border-white/10"
                    maxLength={20}
                  />

                  <Pressable
                    onPress={fetchBillDetails}
                    className="bg-purple-500 rounded-xl py-3 mt-4"
                    disabled={!billNumber || isLoading}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Text className="text-white text-center font-semibold">
                      {isLoading ? 'Fetching...' : 'Fetch Bill Details'}
                    </Text>
                  </Pressable>
                </View>

                {/* Customer Details */}
                {customerName && (
                  <View className="bg-white/5 rounded-2xl p-6 mb-4 border border-white/10">
                    <Text className="text-white/70 text-sm mb-2">Customer Name</Text>
                    <Text className="text-white text-lg font-medium">{customerName}</Text>
                  </View>
                )}

                {/* Amount Input */}
                <View className="bg-white/5 rounded-2xl p-6 mb-4 border border-white/10">
                  <Text className="text-white/70 text-sm mb-3">Bill Amount</Text>
                  <View className="flex-row items-center">
                    <Text className="text-white text-xl mr-2">₹</Text>
                    <TextInput
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="0"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      className="text-white text-2xl font-bold flex-1"
                      keyboardType="numeric"
                      maxLength={8}
                      editable={!customerName} // Disable if fetched from API
                    />
                  </View>
                </View>

                {/* Balance Check */}
                <View className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/10">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-white/70">Available Balance</Text>
                    <Text className="text-white font-semibold">
                      {formatCurrency(user?.balance ?? 0)}
                    </Text>
                  </View>
                  {amount && (
                    <View className="flex-row justify-between items-center mt-2">
                      <Text className="text-white/70">Balance After Payment</Text>
                      <Text className={`font-semibold ${(user?.balance || 0) - parseInt(amount || '0') >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                        {formatCurrency((user?.balance || 0) - parseInt(amount || '0'))}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Pay Button */}
                <Pressable
                  onPress={handlePayBill}
                  className="bg-white rounded-2xl py-4 px-6"
                  disabled={!amount || !billNumber || parseInt(amount || '0') > (user?.balance ?? 0)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text className="text-center text-lg font-semibold text-gray-900">
                    Pay {amount ? formatCurrency(amount) : 'Bill'}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Recent Bills */}
            {!selectedCategory && (
              <View className="mb-6">
                <Text className="text-white text-lg font-semibold mb-4">Recent Bills</Text>
                <View className="space-y-3">
                  <Pressable
                    className="flex-row items-center p-4 bg-white/5 rounded-2xl border border-white/10"
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <View className="w-12 h-12 bg-yellow-500 rounded-full items-center justify-center mr-4">
                      <Text className="text-white text-xl">⚡</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-medium">MSEB - Electricity</Text>
                      <Text className="text-white/60 text-sm">Last paid: ₹1,250</Text>
                    </View>
                    <Text className="text-white/40 text-xl">›</Text>
                  </Pressable>

                  <Pressable
                    className="flex-row items-center p-4 bg-white/5 rounded-2xl border border-white/10"
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <View className="w-12 h-12 bg-red-500 rounded-full items-center justify-center mr-4">
                      <Text className="text-white text-xl">📱</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-medium">Airtel - Mobile</Text>
                      <Text className="text-white/60 text-sm">Last paid: ₹399</Text>
                    </View>
                    <Text className="text-white/40 text-xl">›</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}