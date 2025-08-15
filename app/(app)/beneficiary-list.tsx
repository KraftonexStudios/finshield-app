import DataCollectionTextInput from '@/components/DataCollectionTextInput';
import { useUserStore } from '@/stores/useUserStore';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

interface Beneficiary {
  id: string;
  name: string;
  mobile: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  type: 'upi' | 'bank';
  addedDate: string;
}

export default function BeneficiaryListScreen() {
  const { user } = useUserStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);

  // Filter beneficiaries based on search query
  const filteredBeneficiaries = beneficiaries.filter(beneficiary =>
    beneficiary.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    beneficiary.mobile.includes(searchQuery) ||
    (beneficiary.upiId && beneficiary.upiId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddBeneficiary = () => {
    Alert.alert(
      'Add Beneficiary',
      'This feature will be available soon. You can add beneficiaries through the send money flow.',
      [{ text: 'OK' }]
    );
  };

  const handleEditBeneficiary = (beneficiary: Beneficiary) => {
    Alert.alert(
      'Edit Beneficiary',
      `Edit ${beneficiary.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Edit', onPress: () => {
            Alert.alert('Coming Soon', 'Edit beneficiary feature will be available soon.');
          }
        }
      ]
    );
  };

  const handleDeleteBeneficiary = (beneficiary: Beneficiary) => {
    Alert.alert(
      'Delete Beneficiary',
      `Are you sure you want to remove ${beneficiary.name} from your beneficiaries?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: () => {
            setBeneficiaries(prev => prev.filter(b => b.id !== beneficiary.id));
          }
        }
      ]
    );
  };

  const handleSendMoney = (beneficiary: Beneficiary) => {
    router.push({
      pathname: '/(app)/send-money',
      params: {
        prefilledMobile: beneficiary.mobile,
        prefilledName: beneficiary.name
      }
    });
  };

  const renderBeneficiary = (beneficiary: Beneficiary) => (
    <View key={beneficiary.id} className="bg-white/10 rounded-2xl p-4 mb-4 border border-white/20">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1">
          <Text className="text-white font-semibold text-lg mb-1">
            {beneficiary.name}
          </Text>
          <Text className="text-white/70 text-sm">
            {beneficiary.mobile}
          </Text>
          {beneficiary.type === 'upi' && beneficiary.upiId && (
            <Text className="text-white/60 text-xs mt-1">
              UPI: {beneficiary.upiId}
            </Text>
          )}
          {beneficiary.type === 'bank' && beneficiary.bankName && (
            <Text className="text-white/60 text-xs mt-1">
              {beneficiary.bankName} • {beneficiary.accountNumber?.slice(-4)}
            </Text>
          )}
        </View>
        <View className="w-12 h-12 bg-purple-600 rounded-full items-center justify-center">
          <Text className="text-white text-lg">
            {beneficiary.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>

      <View className="flex-row justify-between">
        <Pressable
          onPress={() => handleSendMoney(beneficiary)}
          className="bg-purple-600 rounded-xl px-4 py-2 flex-1 mr-2"
        >
          <Text className="text-white font-medium text-center">Send Money</Text>
        </Pressable>

        <Pressable
          onPress={() => handleEditBeneficiary(beneficiary)}
          className="bg-white/20 rounded-xl px-4 py-2 mr-2"
        >
          <Text className="text-white font-medium">Edit</Text>
        </Pressable>

        <Pressable
          onPress={() => handleDeleteBeneficiary(beneficiary)}
          className="bg-red-500/20 rounded-xl px-4 py-2"
        >
          <Text className="text-red-400 font-medium">Delete</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        <View className="flex-1 px-6 py-4">
          {/* Header */}
          <View className="flex-row items-center mb-6">
            <Pressable
              onPress={() => router.back()}
              className="w-12 h-12 rounded-full bg-white/10 items-center justify-center mr-4"
            >
              <Text className="text-white text-xl">←</Text>
            </Pressable>
            <Text className="text-2xl font-bold text-white flex-1">Beneficiaries</Text>
            <Pressable
              onPress={handleAddBeneficiary}
              className="w-12 h-12 rounded-full bg-purple-600 items-center justify-center"
            >
              <Text className="text-white text-xl">+</Text>
            </Pressable>
          </View>

          {/* Search Bar */}
          <View className="bg-white/10 rounded-2xl px-4 py-3 mb-6 border border-white/20">
            <DataCollectionTextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search beneficiaries..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              className="text-white text-base"
              inputType="text"
            />
          </View>

          {/* Beneficiaries List */}
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {filteredBeneficiaries.length > 0 ? (
              filteredBeneficiaries.map(renderBeneficiary)
            ) : (
              <View className="flex-1 items-center justify-center py-16">
                <View className="w-20 h-20 bg-white/10 rounded-full items-center justify-center mb-6">
                  <Text className="text-white/60 text-3xl">👥</Text>
                </View>
                <Text className="text-white text-xl font-semibold mb-3 text-center">
                  {searchQuery ? 'No matching beneficiaries' : 'No Beneficiaries Added'}
                </Text>
                <Text className="text-white/70 text-center mb-8 px-8">
                  {searchQuery
                    ? 'Try searching with a different name or mobile number'
                    : 'Add beneficiaries to send money quickly and easily. Beneficiaries are automatically added when you send money to new contacts.'
                  }
                </Text>
                {!searchQuery && (
                  <Pressable
                    onPress={() => router.push('/(app)/send-money')}
                    className="bg-purple-600 rounded-2xl px-8 py-4"
                  >
                    <Text className="text-white font-semibold text-lg">Send Money</Text>
                  </Pressable>
                )}
              </View>
            )}
          </ScrollView>

          {/* Info Section */}
          <View className="bg-white/5 rounded-2xl p-4 mt-4 border border-white/10">
            <Text className="text-white font-semibold mb-2">💡 About Beneficiaries</Text>
            <Text className="text-white/70 text-sm leading-5">
              • Beneficiaries are automatically added when you send money{"\n"}
              • You can manage and organize your frequent contacts here{"\n"}
              • Send money faster by selecting from saved beneficiaries
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}