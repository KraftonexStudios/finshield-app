import DataCollectionTextInput from '@/components/DataCollectionTextInput';
import PinVerification from '@/components/PinVerification';
import { useDataCollectionStore } from '@/stores/useDataCollectionStore';
import { useUserStore } from '@/stores/useUserStore';
import * as Notifications from 'expo-notifications';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,

  }),
});

interface Contact {
  id: string;
  name: string;
  mobile: string;
  avatar?: string;
}

export default function SendMoneyScreen() {
  const { user, processTransaction, findUserByMobile, refreshUserData } = useUserStore();
  const { startDataCollection, isCollecting, collectionScenario } = useDataCollectionStore();
  const params = useLocalSearchParams();
  const [amount, setAmount] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [note, setNote] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showContacts, setShowContacts] = useState(false);
  const [showPinVerification, setShowPinVerification] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; mobile?: string; general?: string }>({});
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');

  // Handle QR code parameters and start data collection
  useEffect(() => {
    if (params.recipientMobile) {
      setMobileNumber(params.recipientMobile as string);
    }
    if (params.recipientName) {
      setSelectedContact({
        id: 'qr-contact',
        name: params.recipientName as string,
        mobile: params.recipientMobile as string
      });
    }
  }, [params]);

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

  // Recent contacts will be loaded from database
  const [recentContacts, setRecentContacts] = useState<Contact[]>([]);

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue === '') return '';
    return new Intl.NumberFormat('en-IN').format(parseInt(numericValue));
  };

  const handleAmountChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setAmount(numericValue);
  };

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setMobileNumber(contact.mobile);
    setShowContacts(false);
  };



  const handleContinue = () => {
    if (validateForm()) {
      setShowPinVerification(true);
    }
  };

  const sendNotification = async (title: string, body: string, data?: any) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      // Failed to send notification
    }
  };

  const handlePinSuccess = async () => {
    setIsProcessing(true);
    setPaymentStatus('processing');
    setShowPinVerification(false);

    try {
      const transactionAmount = parseInt(amount);
      const recipientName = selectedContact?.name || 'Unknown';

      // Check if user has sufficient balance
      if (transactionAmount > (user?.balance ?? 0)) {
        throw new Error('Insufficient balance');
      }

      // Ensure mobile number has +91 prefix
      const cleanMobileNumber = mobileNumber.replace(/[^0-9]/g, '');
      const formattedMobileNumber = cleanMobileNumber.startsWith('91') ? `+${cleanMobileNumber}` : `+91${cleanMobileNumber}`;

      // Find recipient user
      const recipientUser = await findUserByMobile(formattedMobileNumber);

      // Process the transaction through Firebase (regardless of whether recipient exists)
      const transactionRef = await processTransaction({
        fromMobile: user?.mobile || '',
        toMobile: formattedMobileNumber,
        toUserId: recipientUser?.uid, // Will be undefined if recipient doesn't exist
        type: 'transfer',
        amount: transactionAmount,
        description: recipientUser ? `Sent to ${recipientName}` : `Sent to ${formattedMobileNumber} (Recipient not found)`,
        ...(note && note.trim() ? { note: note.trim() } : {}),
        status: 'pending',
        reference: `TXN${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        category: 'transfer',
        recipient: {
          name: recipientName,
          mobile: formattedMobileNumber,
          accountNumber: recipientUser?.accountNumber || 'N/A'
        }
      });

      // Refresh user data to update balance
      await refreshUserData();

      setPaymentStatus('success');

      // Send success notification
      const notificationMessage = recipientUser
        ? `₹${formatCurrency(amount)} sent to ${recipientName}`
        : `₹${formatCurrency(amount)} sent to ${formattedMobileNumber} (Recipient not in system)`;

      await sendNotification(
        'Payment Processed! 🎉',
        notificationMessage,
        { transactionRef, amount: transactionAmount, recipient: recipientName, recipientFound: !!recipientUser }
      );

      // Show success and navigate
      const alertMessage = recipientUser
        ? `₹${formatCurrency(amount)} sent to ${recipientName}\nTransaction ID: ${transactionRef}`
        : `₹${formatCurrency(amount)} debited from your account\nSent to: ${formattedMobileNumber}\nNote: Recipient not found in system\nTransaction ID: ${transactionRef}`;

      Alert.alert(
        'Payment Processed! 🎉',
        alertMessage,
        [
          {
            text: 'View Receipt',
            onPress: () => {
              router.replace('/(app)/dashboard');
            }
          },
          {
            text: 'Send More',
            onPress: () => {
              setAmount('');
              setMobileNumber('');
              setNote('');
              setSelectedContact(null);
              setPaymentStatus('idle');
            }
          }
        ]
      );
    } catch (error) {
      setPaymentStatus('failed');

      // Send failure notification
      await sendNotification(
        'Payment Failed ❌',
        `Failed to send ₹${formatCurrency(amount)} to ${selectedContact?.name || 'recipient'}`,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );

      Alert.alert(
        'Payment Failed',
        error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        [
          {
            text: 'Try Again',
            onPress: () => setPaymentStatus('idle')
          },
          {
            text: 'Cancel',
            onPress: () => router.back()
          }
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePinCancel = () => {
    setShowPinVerification(false);
    setPaymentStatus('idle');
  };

  const validateForm = () => {
    const newErrors: { amount?: string; mobile?: string; general?: string } = {};

    // Amount validation
    if (!amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else {
      const numAmount = parseInt(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        newErrors.amount = 'Please enter a valid amount';
      } else if (numAmount < 1) {
        newErrors.amount = 'Minimum amount is ₹1';
      } else if (numAmount > 100000) {
        newErrors.amount = 'Maximum amount is ₹1,00,000';
      } else if (numAmount > (user?.balance ?? 0)) {
        newErrors.amount = `Insufficient balance. Available: ₹${formatCurrency((user?.balance ?? 0).toString())}`;
      }
    }

    // Mobile number validation
    if (!mobileNumber.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else {
      const cleanNumber = mobileNumber.replace(/[^0-9]/g, '');
      const normalizedNumber = cleanNumber.startsWith('91') ? cleanNumber.slice(2) : cleanNumber;
      if (!/^[6-9]\d{9}$/.test(normalizedNumber)) {
        newErrors.mobile = 'Please enter a valid 10-digit mobile number';
      } else if (normalizedNumber === user?.mobile?.replace(/[^0-9+]/g, '').replace('+91', '')) {
        newErrors.mobile = 'Cannot send money to your own number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const quickAmounts = ['500', '1000', '2000', '5000'];

  return (
    // <LinearGradient
    //   colors={['#1a1a2e', '#16213e', '#0f3460']}
    //   className="flex-1"
    // >
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView
        behavior='height'
        className="flex-1"
      >
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
              <Text className="text-2xl font-bold text-white">Send Money</Text>
            </View>

            {/* Balance Display */}
            <View className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10">
              <Text className="text-white/70 text-sm mb-1">Available Balance</Text>
              <Text className="text-white text-2xl font-bold">
                ₹{formatCurrency((user?.balance ?? 0).toString())}
              </Text>
            </View>

            {/* Amount Input */}
            <View className="mb-6">
              <Text className="text-white text-lg font-semibold mb-3">Enter Amount</Text>
              <View className="bg-white/5 border border-white/20 rounded-2xl px-5 py-4">
                <View className="flex-row items-center">
                  <Text className="text-white text-xl mr-2">₹</Text>
                  <DataCollectionTextInput
                    value={formatCurrency(amount)}
                    onChangeText={(text) => {
                      handleAmountChange(text);
                      if (errors.amount) {
                        setErrors(prev => ({ ...prev, amount: undefined }));
                      }
                    }}
                    placeholder="0"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    className={`text-white text-xl flex-1 ${errors.amount ? 'text-red-400' : ''}`}
                    keyboardType="numeric"
                    inputType="amount"
                  />
                </View>
              </View>
              {errors.amount && (
                <View className="mt-2">
                  <Text className="text-red-400 text-sm">{errors.amount}</Text>
                </View>
              )}

              {/* Quick Amount Buttons */}
              <View className="flex-row justify-between mt-4">
                {quickAmounts.map((quickAmount) => {
                  const isDisabled = parseInt(quickAmount) > (user?.balance ?? 0);
                  return (
                    <Pressable
                      key={quickAmount}
                      onPress={() => !isDisabled && setAmount(quickAmount)}
                      className={`rounded-xl px-4 py-2 border flex-1 mx-1 ${isDisabled ? 'bg-white/5 border-white/10 opacity-50' : 'bg-white/10 border-white/20'
                        } ${amount === quickAmount ? 'bg-purple-600 border-purple-500' : ''}`}
                      disabled={isDisabled}
                    >
                      <Text className={`text-sm text-center ${isDisabled ? 'text-white/50' : 'text-white'
                        } ${amount === quickAmount ? 'text-white font-semibold' : ''}`}>
                        ₹{formatCurrency(quickAmount)}
                      </Text>
                      {isDisabled && (
                        <Text className="text-white/30 text-xs text-center mt-1">Low Balance</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Mobile Number Input */}
            <View className="mb-6">
              <Text className="text-white text-lg font-semibold mb-3">Send To</Text>
              <View className="bg-white/5 border border-white/20 rounded-2xl px-5 py-4">
                <DataCollectionTextInput
                  value={mobileNumber}
                  onChangeText={(text) => {
                    setMobileNumber(text);
                    if (errors.mobile) {
                      setErrors(prev => ({ ...prev, mobile: undefined }));
                    }
                  }}
                  placeholder="Enter mobile number"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  className={`text-white text-base ${errors.mobile ? 'text-red-400' : ''}`}
                  keyboardType="phone-pad"
                  maxLength={15}
                  inputType="mobile"
                />
              </View>
              {errors.mobile && (
                <View className="mt-2">
                  <Text className="text-red-400 text-sm">{errors.mobile}</Text>
                </View>
              )}

              <Pressable
                onPress={() => setShowContacts(!showContacts)}
                className="mt-3"
              >
                <Text className="text-purple-400 text-sm">Choose from contacts</Text>
              </Pressable>
            </View>

            {/* Recent Contacts */}
            {showContacts && (
              <View className="mb-6">
                <Text className="text-white text-lg font-semibold mb-3">Recent Contacts</Text>
                {recentContacts.length > 0 ? (
                  <View className="space-y-2">
                    {recentContacts.map((contact) => (
                      <Pressable
                        key={contact.id}
                        onPress={() => {
                          handleContactSelect(contact);
                          if (errors.mobile) {
                            setErrors(prev => ({ ...prev, mobile: undefined }));
                          }
                        }}
                        className={`rounded-2xl p-4 border ${selectedContact?.id === contact.id
                          ? 'bg-purple-600/20 border-purple-500'
                          : 'bg-white/5 border-white/10'
                          }`}
                      >
                        <View className="flex-row items-center">
                          <View className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${selectedContact?.id === contact.id ? 'bg-purple-600' : 'bg-purple-500'
                            }`}>
                            <Text className="text-white font-bold">
                              {contact.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View className="flex-1">
                            <Text className="text-white font-medium">{contact.name}</Text>
                            <Text className="text-white/70 text-sm">{contact.mobile}</Text>
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View className="bg-white/5 rounded-2xl p-6 items-center border border-white/10">
                    <Text className="text-white/70 text-center mb-2">No recent contacts</Text>
                    <Text className="text-white/50 text-sm text-center">
                      Your recent money transfers will appear here
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Note Input */}
            <View className="mb-8">
              <Text className="text-white text-lg font-semibold mb-3">Add Note (Optional)</Text>
              <View className="bg-white/5 border border-white/20 rounded-2xl px-5 py-4">
                <DataCollectionTextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Enter a note for this transaction"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  className="text-white text-base"
                  multiline
                  numberOfLines={3}
                  maxLength={100}
                  inputType="text"
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Balance Info */}
        <View className="px-6 mb-4">
          <View className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <View className="flex-row justify-between items-center">
              <Text className="text-white/70">Available Balance</Text>
              <Text className="text-white font-semibold">₹{formatCurrency((user?.balance ?? 0).toString())}</Text>
            </View>
            {amount && parseInt(amount) > 0 && (
              <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-white/10">
                <Text className="text-white/70">After Transfer</Text>
                <Text className={`font-semibold ${(user?.balance ?? 0) - parseInt(amount) < 0 ? 'text-red-400' : 'text-green-400'
                  }`}>
                  ₹{formatCurrency(Math.max(0, (user?.balance ?? 0) - parseInt(amount)).toString())}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Continue Button */}
        <View className="px-6 pb-6">
          <Pressable
            onPress={handleContinue}
            className={`rounded-2xl py-4 px-6 ${amount && mobileNumber && !isProcessing && paymentStatus !== 'processing'
              ? 'bg-white'
              : 'bg-white/20 border border-white/30'
              }`}
            disabled={!amount || !mobileNumber || isProcessing || paymentStatus === 'processing'}
            style={({ pressed }) => ({
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text
              className={`text-center text-lg font-semibold ${amount && mobileNumber && !isProcessing && paymentStatus !== 'processing' ? 'text-gray-900' : 'text-white/50'
                }`}
            >
              {paymentStatus === 'processing' ? 'Processing...' : 'Continue'}
            </Text>
          </Pressable>
        </View>

        {/* PIN Verification Modal */}
        <PinVerification
          visible={showPinVerification}
          onClose={handlePinCancel}
          onSuccess={handlePinSuccess}
          title="Verify Payment"
          subtitle={`Enter PIN to send ₹${formatCurrency(amount)} to ${selectedContact?.name || 'recipient'}`}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
    // </LinearGradient >
  );
}