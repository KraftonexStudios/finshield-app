import DataCollectionTextInput from '@/components/DataCollectionTextInput';
import { useDataCollectionStore } from '@/stores/useDataCollectionStore';
import { useUserStore } from '@/stores/useUserStore';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, Share, Text, View } from 'react-native';

export default function RequestMoneyScreen() {
  const [amount, setAmount] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [note, setNote] = useState('');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [recentContacts, setRecentContacts] = useState<any[]>([]);
  const { user, transactions } = useUserStore();
  const { startDataCollection, isCollecting, collectionScenario } = useDataCollectionStore();

  // Start data collection when screen loads
  useEffect(() => {
    const initializeDataCollection = async () => {
      if (!isCollecting && !collectionScenario) {
        try {
          await startDataCollection('login');
        } catch (error) {
          // Failed to start data collection
        }
      }
    };

    initializeDataCollection();
  }, [isCollecting, collectionScenario, startDataCollection]);

  const quickAmounts = [500, 1000, 2000, 5000];

  // Get recent contacts from transaction history
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      const contacts = transactions
        .filter(tx => tx.type === 'transfer' && tx.toMobile)
        .reduce((acc: any[], tx) => {
          const existing = acc.find(c => c.mobile === tx.toMobile);
          if (!existing && tx.toMobile !== user?.mobile) {
            acc.push({
              id: tx.toUserId || tx.toMobile,
              name: tx.fromMobile || 'Unknown',
              mobile: tx.toMobile,
              avatar: (tx.fromMobile || 'UN').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            });
          }
          return acc;
        }, [])
        .slice(0, 4); // Show only 4 recent contacts
      setRecentContacts(contacts);
    }
  }, [transactions, user?.mobile]);

  const formatCurrency = (value: string | number) => {
    const numericValue = typeof value === 'string' ? parseInt(value) : value;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(numericValue);
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleContactSelect = (contact: any) => {
    setSelectedContact(contact);
    setMobileNumber(contact.mobile.replace(/\s/g, ''));
  };

  const validateInputs = () => {
    if (!amount || parseInt(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return false;
    }
    if (!mobileNumber || mobileNumber.length < 10) {
      Alert.alert('Invalid Mobile Number', 'Please enter a valid mobile number');
      return false;
    }
    return true;
  };

  const generatePaymentLink = () => {
    const requestId = Date.now().toString();
    const paymentLink = `https://securebank.app/pay?req=${requestId}&amt=${amount}&to=${user?.mobile || ''}&note=${encodeURIComponent(note)}`;
    return { requestId, paymentLink };
  };

  const handleSendRequest = async () => {
    if (!validateInputs()) return;

    const { requestId, paymentLink } = generatePaymentLink();
    const recipientName = selectedContact?.name || 'Unknown';

    try {
      const message = `💰 Payment Request\n\nHi ${recipientName}!\n\n${user?.fullName || 'Someone'} has requested ${formatCurrency(amount)} from you.\n\n${note ? `Note: ${note}\n\n` : ''}Pay securely using this link:\n${paymentLink}\n\nRequest ID: ${requestId}\n\nSent via SecureBank App`;

      await Share.share({
        message,
        title: 'Payment Request'
      });

      // Show success message
      Alert.alert(
        'Request Sent!',
        `Payment request for ${formatCurrency(amount)} has been sent to ${recipientName}.`,
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send payment request. Please try again.');
    }
  };

  const handleGenerateQR = () => {
    if (!validateInputs()) return;

    const { requestId, paymentLink } = generatePaymentLink();

    router.push({
      pathname: '/(app)/payment-qr',
      params: {
        amount,
        note,
        requestId,
        paymentLink,
        type: 'request'
      }
    });
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
              <Text className="text-2xl font-bold text-white">Request Money</Text>
            </View>

            {/* Amount Input */}
            <View className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10">
              <Text className="text-white/70 text-sm mb-2">Enter Amount</Text>
              <View className="flex-row items-center">
                <Text className="text-white text-2xl mr-2">₹</Text>
                <DataCollectionTextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  className="text-white text-3xl font-bold flex-1"
                  keyboardType="numeric"
                  maxLength={8}
                  inputType="amount"
                />
              </View>

              {/* Quick Amount Buttons */}
              <View className="flex-row flex-wrap mt-4 gap-2">
                {quickAmounts.map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => handleQuickAmount(value)}
                    className="bg-white/10 px-4 py-2 rounded-full"
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text className="text-white text-sm font-medium">
                      {formatCurrency(value)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Mobile Number Input */}
            <View className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10">
              <Text className="text-white/70 text-sm mb-3">Request From</Text>
              <DataCollectionTextInput
                value={mobileNumber}
                onChangeText={setMobileNumber}
                placeholder="Enter mobile number"
                placeholderTextColor="rgba(255,255,255,0.3)"
                className="text-white text-lg bg-white/5 rounded-xl px-4 py-3 border border-white/10"
                keyboardType="phone-pad"
                maxLength={15}
                inputType="mobile"
              />
            </View>

            {/* Recent Contacts */}
            <View className="mb-6">
              <Text className="text-white text-lg font-semibold mb-4">Recent Contacts</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-4">
                  {recentContacts.map((contact) => (
                    <Pressable
                      key={contact.id}
                      onPress={() => handleContactSelect(contact)}
                      className={`items-center p-3 rounded-2xl border ${selectedContact?.id === contact.id
                        ? 'bg-purple-500/20 border-purple-500'
                        : 'bg-white/5 border-white/10'
                        }`}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <View className="w-12 h-12 bg-purple-500 rounded-full items-center justify-center mb-2">
                        <Text className="text-white font-bold">{contact.avatar}</Text>
                      </View>
                      <Text className="text-white text-xs font-medium text-center" numberOfLines={1}>
                        {contact.name.split(' ')[0]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Note Input */}
            <View className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10">
              <Text className="text-white/70 text-sm mb-3">Add Note (Optional)</Text>
              <DataCollectionTextInput
                value={note}
                onChangeText={setNote}
                placeholder="What's this request for?"
                placeholderTextColor="rgba(255,255,255,0.3)"
                className="text-white text-base bg-white/5 rounded-xl px-4 py-3 border border-white/10"
                multiline
                numberOfLines={3}
                maxLength={100}
                textAlignVertical="top"
                inputType="text"
              />
              <Text className="text-white/40 text-xs mt-2 text-right">
                {note.length}/100
              </Text>
            </View>

            {/* Request Methods */}
            <View className="bg-white/5 rounded-2xl p-6 mb-8 border border-white/10">
              <Text className="text-white text-lg font-semibold mb-4">Request Methods</Text>

              <Pressable
                onPress={handleSendRequest}
                className="flex-row items-center py-4 px-4 bg-white/5 rounded-xl mb-3 border border-white/10"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View className="w-12 h-12 bg-blue-500 rounded-full items-center justify-center mr-4">
                  <Text className="text-white text-xl">💬</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold">Send via Message</Text>
                  <Text className="text-white/60 text-sm">Share payment link via SMS/WhatsApp</Text>
                </View>
                <Text className="text-white/40 text-xl">›</Text>
              </Pressable>

              <Pressable
                onPress={handleGenerateQR}
                className="flex-row items-center py-4 px-4 bg-white/5 rounded-xl border border-white/10"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View className="w-12 h-12 bg-green-500 rounded-full items-center justify-center mr-4">
                  <Text className="text-white text-xl">📱</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold">Generate QR Code</Text>
                  <Text className="text-white/60 text-sm">Let others scan to pay you</Text>
                </View>
                <Text className="text-white/40 text-xl">›</Text>
              </Pressable>
            </View>

            {/* Info Card */}
            <View className="bg-blue-500/10 rounded-2xl p-4 border border-blue-500/20">
              <View className="flex-row items-start">
                <Text className="text-blue-400 text-lg mr-2">ℹ️</Text>
                <View className="flex-1">
                  <Text className="text-blue-400 font-semibold mb-1">How it works</Text>
                  <Text className="text-blue-400/80 text-sm">
                    Send a payment request to anyone. They can pay you instantly using the secure link or QR code.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}