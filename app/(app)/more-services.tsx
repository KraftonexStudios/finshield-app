import { useUserStore } from '@/stores/useUserStore';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  route?: string;
  comingSoon?: boolean;
}

export default function MoreServicesScreen() {
  const { user } = useUserStore();

  const bankingServices: Service[] = [
    {
      id: 'beneficiary',
      title: 'Manage Beneficiaries',
      description: 'Add, edit or remove beneficiaries',
      icon: '👥',
      color: 'bg-blue-500',
      route: '/(app)/beneficiary-list'
    },
    {
      id: 'statements',
      title: 'Account Statements',
      description: 'Download monthly statements',
      icon: '📄',
      color: 'bg-green-500',
      comingSoon: true
    },
    {
      id: 'cheque',
      title: 'Cheque Book Request',
      description: 'Request new cheque book',
      icon: '📋',
      color: 'bg-purple-500',
      comingSoon: true
    },
    {
      id: 'fd',
      title: 'Fixed Deposits',
      description: 'Create and manage FDs',
      icon: '🏦',
      color: 'bg-orange-500',
      comingSoon: true
    }
  ];

  const paymentServices: Service[] = [
    {
      id: 'qr_pay',
      title: 'QR Code Payment',
      description: 'Scan and pay with QR codes',
      icon: '📱',
      color: 'bg-indigo-500',
      comingSoon: true
    },
    {
      id: 'split_bill',
      title: 'Split Bills',
      description: 'Split expenses with friends',
      icon: '🧾',
      color: 'bg-pink-500',
      comingSoon: true
    },
    {
      id: 'recurring',
      title: 'Recurring Payments',
      description: 'Set up automatic payments',
      icon: '🔄',
      color: 'bg-teal-500',
      comingSoon: true
    },
    {
      id: 'international',
      title: 'International Transfer',
      description: 'Send money abroad',
      icon: '🌍',
      color: 'bg-cyan-500',
      comingSoon: true
    }
  ];

  const investmentServices: Service[] = [
    {
      id: 'mutual_funds',
      title: 'Mutual Funds',
      description: 'Invest in mutual funds',
      icon: '📈',
      color: 'bg-emerald-500',
      comingSoon: true
    },
    {
      id: 'stocks',
      title: 'Stock Trading',
      description: 'Buy and sell stocks',
      icon: '📊',
      color: 'bg-red-500',
      comingSoon: true
    },
    {
      id: 'gold',
      title: 'Digital Gold',
      description: 'Buy and sell digital gold',
      icon: '🥇',
      color: 'bg-yellow-500',
      comingSoon: true
    },
    {
      id: 'sip',
      title: 'SIP Calculator',
      description: 'Calculate SIP returns',
      icon: '🧮',
      color: 'bg-violet-500',
      comingSoon: true
    }
  ];

  const insuranceServices: Service[] = [
    {
      id: 'life_insurance',
      title: 'Life Insurance',
      description: 'Protect your family',
      icon: '🛡️',
      color: 'bg-blue-600',
      comingSoon: true
    },
    {
      id: 'health_insurance',
      title: 'Health Insurance',
      description: 'Medical coverage plans',
      icon: '🏥',
      color: 'bg-red-600',
      comingSoon: true
    },
    {
      id: 'vehicle_insurance',
      title: 'Vehicle Insurance',
      description: 'Car and bike insurance',
      icon: '🚗',
      color: 'bg-gray-600',
      comingSoon: true
    },
    {
      id: 'travel_insurance',
      title: 'Travel Insurance',
      description: 'Safe travel coverage',
      icon: '✈️',
      color: 'bg-sky-500',
      comingSoon: true
    }
  ];

  const utilityServices: Service[] = [
    {
      id: 'loan_emi',
      title: 'Loan EMI',
      description: 'Pay loan installments',
      icon: '💳',
      color: 'bg-amber-500',
      comingSoon: true
    },
    {
      id: 'credit_card',
      title: 'Credit Card Bills',
      description: 'Pay credit card dues',
      icon: '💎',
      color: 'bg-slate-500',
      comingSoon: true
    },
    {
      id: 'tax_payment',
      title: 'Tax Payments',
      description: 'Pay income tax online',
      icon: '📋',
      color: 'bg-lime-500',
      comingSoon: true
    },
    {
      id: 'challan',
      title: 'Traffic Challan',
      description: 'Pay traffic fines',
      icon: '🚦',
      color: 'bg-rose-500',
      comingSoon: true
    }
  ];

  const handleServicePress = (service: Service) => {
    if (service.comingSoon) {
      // Show coming soon message
      return;
    }

    if (service.route) {
      router.push(service.route as any);
    }
  };

  const renderServiceSection = (title: string, services: Service[]) => (
    <View className="mb-8">
      <Text className="text-white text-xl font-bold mb-4">{title}</Text>
      <View className="flex-row flex-wrap gap-3">
        {services.map((service) => (
          <Pressable
            key={service.id}
            onPress={() => handleServicePress(service)}
            className="bg-white/5 rounded-2xl p-4 border border-white/10 flex-1 min-w-[45%] relative"
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
            })}
          >
            {service.comingSoon && (
              <View className="absolute top-2 right-2 bg-yellow-500 px-2 py-1 rounded-full">
                <Text className="text-black text-xs font-bold">Soon</Text>
              </View>
            )}
            <View className={`w-12 h-12 ${service.color} rounded-full items-center justify-center mb-3`}>
              <Text className="text-white text-xl">{service.icon}</Text>
            </View>
            <Text className="text-white font-semibold mb-1" numberOfLines={1}>
              {service.title}
            </Text>
            <Text className="text-white/60 text-sm" numberOfLines={2}>
              {service.description}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

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
              <Text className="text-2xl font-bold text-white">More Services</Text>
            </View>

            {/* User Welcome */}
            <View className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl p-6 mb-8 border border-white/10">
              <Text className="text-white text-lg font-semibold mb-2">
                Welcome, {user?.fullName || 'User'}!
              </Text>
              <Text className="text-white/70 text-sm">
                Explore our comprehensive banking and financial services designed to make your life easier.
              </Text>
            </View>

            {/* Quick Actions */}
            <View className="mb-8">
              <Text className="text-white text-xl font-bold mb-4">Quick Actions</Text>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => router.push('/(app)/send-money')}
                  className="bg-white/10 rounded-2xl p-4 flex-1 items-center"
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text className="text-white text-2xl mb-2">💸</Text>
                  <Text className="text-white font-medium text-center">Send Money</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push('/(app)/request-money')}
                  className="bg-white/10 rounded-2xl p-4 flex-1 items-center"
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text className="text-white text-2xl mb-2">💰</Text>
                  <Text className="text-white font-medium text-center">Request Money</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push('/(app)/transactions')}
                  className="bg-white/10 rounded-2xl p-4 flex-1 items-center"
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text className="text-white text-2xl mb-2">📊</Text>
                  <Text className="text-white font-medium text-center">Transactions</Text>
                </Pressable>
              </View>
            </View>

            {/* Service Sections */}
            {renderServiceSection('Banking Services', bankingServices)}
            {renderServiceSection('Payment Services', paymentServices)}
            {renderServiceSection('Investment Services', investmentServices)}
            {renderServiceSection('Insurance Services', insuranceServices)}
            {renderServiceSection('Utility Services', utilityServices)}

            {/* Help & Support */}
            <View className="bg-white/5 rounded-2xl p-6 mb-8 border border-white/10">
              <Text className="text-white text-lg font-semibold mb-4">Need Help?</Text>
              <View className="space-y-3">
                <Pressable
                  className="flex-row items-center py-3"
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View className="w-10 h-10 bg-green-500 rounded-full items-center justify-center mr-3">
                    <Text className="text-white text-lg">💬</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium">Live Chat Support</Text>
                    <Text className="text-white/60 text-sm">Get instant help from our team</Text>
                  </View>
                  <Text className="text-white/40 text-xl">›</Text>
                </Pressable>

                <Pressable
                  className="flex-row items-center py-3"
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View className="w-10 h-10 bg-blue-500 rounded-full items-center justify-center mr-3">
                    <Text className="text-white text-lg">📞</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium">Call Support</Text>
                    <Text className="text-white/60 text-sm">1800-XXX-XXXX (Toll Free)</Text>
                  </View>
                  <Text className="text-white/40 text-xl">›</Text>
                </Pressable>

                <Pressable
                  className="flex-row items-center py-3"
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View className="w-10 h-10 bg-purple-500 rounded-full items-center justify-center mr-3">
                    <Text className="text-white text-lg">❓</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium">FAQ</Text>
                    <Text className="text-white/60 text-sm">Find answers to common questions</Text>
                  </View>
                  <Text className="text-white/40 text-xl">›</Text>
                </Pressable>
              </View>
            </View>

            {/* App Info */}
            <View className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <Text className="text-white text-lg font-semibold mb-2">SecureBank Mobile</Text>
              <Text className="text-white/60 text-sm mb-4">
                Your trusted banking partner with cutting-edge security and user-friendly features.
              </Text>
              <View className="flex-row justify-between">
                <Text className="text-white/40 text-xs">Version 1.0.0</Text>
                <Text className="text-white/40 text-xs">© 2024 SecureBank</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}