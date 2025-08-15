import DataCollectionTextInput from '@/components/DataCollectionTextInput';
import { useUserStore } from '@/stores/useUserStore';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

interface RechargePlan {
  id: string;
  amount: number;
  validity: string;
  description: string;
  type: 'popular' | 'data' | 'talktime' | 'full_talktime';
}

interface RechargeProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
  plans: RechargePlan[];
}

export default function RechargeScreen() {
  const [selectedProvider, setSelectedProvider] = useState<RechargeProvider | null>(null);
  const [mobileNumber, setMobileNumber] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<RechargePlan | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustomRecharge, setIsCustomRecharge] = useState(false);
  const { user } = useUserStore();

  const rechargeProviders: RechargeProvider[] = [
    {
      id: 'airtel',
      name: 'Airtel',
      icon: '📶',
      color: 'bg-red-500',
      plans: [
        { id: '1', amount: 199, validity: '28 days', description: '1.5GB/day + Unlimited calls', type: 'popular' },
        { id: '2', amount: 299, validity: '28 days', description: '2GB/day + Unlimited calls', type: 'popular' },
        { id: '3', amount: 449, validity: '56 days', description: '2GB/day + Unlimited calls', type: 'data' },
        { id: '4', amount: 599, validity: '84 days', description: '2GB/day + Unlimited calls', type: 'data' },
        { id: '5', amount: 99, validity: '28 days', description: 'Unlimited calls only', type: 'talktime' },
        { id: '6', amount: 49, validity: '28 days', description: '₹38 talktime', type: 'full_talktime' },
      ]
    },
    {
      id: 'jio',
      name: 'Jio',
      icon: '📱',
      color: 'bg-blue-600',
      plans: [
        { id: '1', amount: 209, validity: '28 days', description: '1GB/day + Unlimited calls', type: 'popular' },
        { id: '2', amount: 299, validity: '28 days', description: '2GB/day + Unlimited calls', type: 'popular' },
        { id: '3', amount: 479, validity: '56 days', description: '1.5GB/day + Unlimited calls', type: 'data' },
        { id: '4', amount: 719, validity: '84 days', description: '1.5GB/day + Unlimited calls', type: 'data' },
        { id: '5', amount: 155, validity: '28 days', description: 'Unlimited calls only', type: 'talktime' },
        { id: '6', amount: 39, validity: '28 days', description: '₹31.2 talktime', type: 'full_talktime' },
      ]
    },
    {
      id: 'vi',
      name: 'Vi (Vodafone Idea)',
      icon: '📞',
      color: 'bg-red-600',
      plans: [
        { id: '1', amount: 219, validity: '28 days', description: '1GB/day + Unlimited calls', type: 'popular' },
        { id: '2', amount: 319, validity: '28 days', description: '2GB/day + Unlimited calls', type: 'popular' },
        { id: '3', amount: 459, validity: '56 days', description: '1.5GB/day + Unlimited calls', type: 'data' },
        { id: '4', amount: 699, validity: '84 days', description: '1.5GB/day + Unlimited calls', type: 'data' },
        { id: '5', amount: 179, validity: '28 days', description: 'Unlimited calls only', type: 'talktime' },
        { id: '6', amount: 49, validity: '28 days', description: '₹38 talktime', type: 'full_talktime' },
      ]
    },
    {
      id: 'bsnl',
      name: 'BSNL',
      icon: '📡',
      color: 'bg-yellow-600',
      plans: [
        { id: '1', amount: 187, validity: '28 days', description: '2GB/day + Unlimited calls', type: 'popular' },
        { id: '2', amount: 297, validity: '54 days', description: '1GB/day + Unlimited calls', type: 'popular' },
        { id: '3', amount: 397, validity: '70 days', description: '1GB/day + Unlimited calls', type: 'data' },
        { id: '4', amount: 797, validity: '160 days', description: '2GB/day + Unlimited calls', type: 'data' },
        { id: '5', amount: 107, validity: '25 days', description: 'Unlimited calls only', type: 'talktime' },
        { id: '6', amount: 47, validity: '28 days', description: '₹39 talktime', type: 'full_talktime' },
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

  const handleProviderSelect = (provider: RechargeProvider) => {
    setSelectedProvider(provider);
    setSelectedPlan(null);
    setIsCustomRecharge(false);
    setCustomAmount('');
  };

  const handlePlanSelect = (plan: RechargePlan) => {
    setSelectedPlan(plan);
    setIsCustomRecharge(false);
    setCustomAmount('');
  };

  const handleCustomRecharge = () => {
    setIsCustomRecharge(true);
    setSelectedPlan(null);
  };

  const validateInputs = () => {
    if (!mobileNumber || mobileNumber.length < 10) {
      Alert.alert('Invalid Mobile Number', 'Please enter a valid 10-digit mobile number');
      return false;
    }
    if (!selectedProvider) {
      Alert.alert('Select Provider', 'Please select a service provider');
      return false;
    }
    if (!selectedPlan && !isCustomRecharge) {
      Alert.alert('Select Plan', 'Please select a recharge plan or enter custom amount');
      return false;
    }
    if (isCustomRecharge && (!customAmount || parseInt(customAmount) < 10)) {
      Alert.alert('Invalid Amount', 'Please enter a valid recharge amount (minimum ₹10)');
      return false;
    }
    return true;
  };

  const handleProceedToRecharge = () => {
    if (!validateInputs()) return;

    const rechargeAmount = isCustomRecharge ? parseInt(customAmount) : selectedPlan!.amount;

    if (rechargeAmount > (user?.balance || 0)) {
      Alert.alert('Insufficient Balance', 'You do not have enough balance for this recharge.');
      return;
    }

    router.push({
      pathname: '/(app)/recharge-confirmation',
      params: {
        provider: selectedProvider!.name,
        mobileNumber,
        amount: rechargeAmount.toString(),
        planDetails: isCustomRecharge ? 'Custom Recharge' : selectedPlan!.description,
        validity: isCustomRecharge ? 'As per operator' : selectedPlan!.validity,
        isCustom: isCustomRecharge.toString()
      }
    });
  };

  const getPlansByType = (type: string) => {
    return selectedProvider?.plans.filter(plan => plan.type === type) || [];
  };

  const planTypes = [
    { id: 'popular', name: 'Popular', icon: '🔥' },
    { id: 'data', name: 'Data', icon: '📊' },
    { id: 'talktime', name: 'Talktime', icon: '☎️' },
    { id: 'full_talktime', name: 'Full Talktime', icon: '💰' }
  ];

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
              <Text className="text-2xl font-bold text-white">Mobile Recharge</Text>
            </View>

            {/* Mobile Number Input */}
            <View className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10">
              <Text className="text-white/70 text-sm mb-3">Mobile Number</Text>
              <DataCollectionTextInput
                value={mobileNumber}
                onChangeText={setMobileNumber}
                placeholder="Enter 10-digit mobile number"
                placeholderTextColor="rgba(255,255,255,0.3)"
                className="text-white text-lg bg-white/5 rounded-xl px-4 py-3 border border-white/10"
                keyboardType="phone-pad"
                maxLength={10}
                inputType="amount"
              />
            </View>

            {/* Provider Selection */}
            {!selectedProvider && (
              <View className="mb-6">
                <Text className="text-white text-lg font-semibold mb-4">Select Operator</Text>
                <View className="space-y-3">
                  {rechargeProviders.map((provider) => (
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

            {/* Plan Selection */}
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
                  <Text className="text-white text-lg font-semibold">{selectedProvider.name} Plans</Text>
                </View>

                {/* Plan Type Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                  <View className="flex-row gap-3">
                    {planTypes.map((type) => (
                      <Pressable
                        key={type.id}
                        className="bg-white/10 px-4 py-2 rounded-full flex-row items-center"
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <Text className="text-white text-sm mr-1">{type.icon}</Text>
                        <Text className="text-white text-sm font-medium">{type.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>

                {/* Popular Plans */}
                <View className="mb-6">
                  <Text className="text-white text-lg font-semibold mb-4">🔥 Popular Plans</Text>
                  <View className="space-y-3">
                    {getPlansByType('popular').map((plan) => (
                      <Pressable
                        key={plan.id}
                        onPress={() => handlePlanSelect(plan)}
                        className={`p-4 rounded-2xl border ${selectedPlan?.id === plan.id
                          ? 'bg-purple-500/20 border-purple-500'
                          : 'bg-white/5 border-white/10'
                          }`}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <View className="flex-row justify-between items-start mb-2">
                          <Text className="text-white text-xl font-bold">{formatCurrency(plan.amount)}</Text>
                          <Text className="text-white/60 text-sm">{plan.validity}</Text>
                        </View>
                        <Text className="text-white/80 text-sm">{plan.description}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Data Plans */}
                <View className="mb-6">
                  <Text className="text-white text-lg font-semibold mb-4">📊 Data Plans</Text>
                  <View className="space-y-3">
                    {getPlansByType('data').map((plan) => (
                      <Pressable
                        key={plan.id}
                        onPress={() => handlePlanSelect(plan)}
                        className={`p-4 rounded-2xl border ${selectedPlan?.id === plan.id
                          ? 'bg-purple-500/20 border-purple-500'
                          : 'bg-white/5 border-white/10'
                          }`}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <View className="flex-row justify-between items-start mb-2">
                          <Text className="text-white text-xl font-bold">{formatCurrency(plan.amount)}</Text>
                          <Text className="text-white/60 text-sm">{plan.validity}</Text>
                        </View>
                        <Text className="text-white/80 text-sm">{plan.description}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Talktime Plans */}
                <View className="mb-6">
                  <Text className="text-white text-lg font-semibold mb-4">☎️ Talktime Plans</Text>
                  <View className="space-y-3">
                    {getPlansByType('talktime').concat(getPlansByType('full_talktime')).map((plan) => (
                      <Pressable
                        key={plan.id}
                        onPress={() => handlePlanSelect(plan)}
                        className={`p-4 rounded-2xl border ${selectedPlan?.id === plan.id
                          ? 'bg-purple-500/20 border-purple-500'
                          : 'bg-white/5 border-white/10'
                          }`}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <View className="flex-row justify-between items-start mb-2">
                          <Text className="text-white text-xl font-bold">{formatCurrency(plan.amount)}</Text>
                          <Text className="text-white/60 text-sm">{plan.validity}</Text>
                        </View>
                        <Text className="text-white/80 text-sm">{plan.description}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Custom Recharge */}
                <View className="mb-6">
                  <Text className="text-white text-lg font-semibold mb-4">💰 Custom Recharge</Text>
                  <Pressable
                    onPress={handleCustomRecharge}
                    className={`p-4 rounded-2xl border ${isCustomRecharge
                      ? 'bg-purple-500/20 border-purple-500'
                      : 'bg-white/5 border-white/10'
                      }`}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text className="text-white font-medium mb-2">Enter Custom Amount</Text>
                    <Text className="text-white/60 text-sm">Recharge with any amount (minimum ₹10)</Text>
                  </Pressable>

                  {isCustomRecharge && (
                    <View className="mt-4">
                      <DataCollectionTextInput
                        value={customAmount}
                        onChangeText={setCustomAmount}
                        placeholder="Enter amount (min ₹10)"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        className="text-white text-lg bg-white/5 rounded-xl px-4 py-3 border border-white/10"
                        keyboardType="numeric"
                        maxLength={6}
                        inputType="amount"
                      />
                    </View>
                  )}
                </View>

                {/* Balance Check */}
                <View className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/10">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-white/70">Available Balance</Text>
                    <Text className="text-white font-semibold">
                      {formatCurrency(user?.balance || 0)}
                    </Text>
                  </View>
                </View>

                {/* Proceed Button */}
                <Pressable
                  onPress={handleProceedToRecharge}
                  className="bg-white rounded-2xl py-4 px-6"
                  disabled={!mobileNumber || (!selectedPlan && !isCustomRecharge)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text className="text-center text-lg font-semibold text-gray-900">
                    Proceed to Recharge
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Recent Recharges */}
            {!selectedProvider && (
              <View className="mb-6">
                <Text className="text-white text-lg font-semibold mb-4">Recent Recharges</Text>
                <View className="bg-white/5 rounded-2xl p-8 border border-white/10 items-center">
                  <Text className="text-6xl mb-4">📱</Text>
                  <Text className="text-white font-medium text-lg mb-2">No Recent Recharges</Text>
                  <Text className="text-white/60 text-center text-sm">
                    Your recent mobile recharges will appear here
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}