import DataCollectionTextInput from '@/components/DataCollectionTextInput';
import { useUserStore } from '@/stores/useUserStore';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

export default function ContactsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const { user, transactions } = useUserStore();

  // Get contacts from transaction history
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      const contactsMap = new Map();

      transactions
        .filter(tx => tx.type === 'transfer' && tx.toMobile && tx.toMobile !== user?.mobile)
        .forEach(tx => {
          const mobile = tx.toMobile;
          if (!contactsMap.has(mobile)) {
            contactsMap.set(mobile, {
              id: tx.toUserId || mobile,
              name: tx.fromMobile || 'Unknown',
              mobile: mobile,
              avatar: (tx.fromMobile || 'UN').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
              lastAmount: tx.amount,
              lastDate: tx.createdAt?.toDate ? tx.createdAt.toDate().toISOString() : new Date().toISOString()
            });
          } else {
            // Update with latest transaction
            const existing = contactsMap.get(mobile);
            const txDate = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date();
            const existingDate = new Date(existing.lastDate);
            if (txDate > existingDate) {
              existing.lastAmount = tx.amount;
              existing.lastDate = txDate.toISOString();
            }
          }
        });

      const contactsList = Array.from(contactsMap.values())
        .sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());

      setContacts(contactsList);
    }
  }, [transactions, user?.mobile]);

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.mobile.includes(searchQuery)
  );

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="px-6 py-4 border-b border-gray-800">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <Text className="text-white text-xl">←</Text>
          </Pressable>
          <Text className="text-white text-lg font-bold">Contacts</Text>
          <View className="w-10" />
        </View>

        {/* Search Bar */}
        <View className="bg-gray-900 rounded-xl px-4 py-3">
          <DataCollectionTextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search contacts..."
            placeholderTextColor="#6B7280"
            className="text-white text-base"
            inputType="text"
          />
        </View>
      </View>

      {/* Contacts List */}
      <ScrollView className="flex-1 px-6 py-4">
        {filteredContacts.map((contact) => (
          <Pressable
            key={contact.id}
            onPress={() => router.push({
              pathname: '/(app)/send-money',
              params: { contactName: contact.name, contactMobile: contact.mobile }
            })}
            className="bg-gray-900 rounded-2xl p-4 mb-3"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="w-12 h-12 bg-purple-500 rounded-full items-center justify-center mr-4">
                  <Text className="text-white text-xl">{contact.avatar}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-medium text-base">
                    {contact.name}
                  </Text>
                  <Text className="text-gray-400 text-sm">
                    {contact.mobile}
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-purple-400 font-medium">
                  ₹{contact.lastAmount}
                </Text>
                <Text className="text-gray-500 text-xs">
                  {new Date(contact.lastDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}

        {filteredContacts.length === 0 && (
          <View className="items-center justify-center py-12">
            <Text className="text-gray-400 text-base">No contacts found</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}