import React, { useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AlertPayload } from '../../constants/API_ENDPOINTS';
import { apiService } from '../../services/apiService';
import { useUserStore } from '../../stores/useUserStore';

export default function SuspiciousActivityScreen() {
  const [isReporting, setIsReporting] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user, logout } = useUserStore();

  useEffect(() => {
    // Automatically send alert when component mounts
    sendSuspiciousActivityAlert();
  }, []);

  const sendSuspiciousActivityAlert = async () => {
    try {
      setIsReporting(true);
      setError(null);

      if (!user?.uid) {
        throw new Error('User not authenticated');
      }

      const alertPayload: AlertPayload = {
        userId: user.uid,
        alertType: 'suspicious_behavior',
        severity: 'high',
        description: 'Suspicious activity detected during authentication process',
        metadata: {
          source: 'authentication_flow',
          trigger: 'behavioral_analysis',
          timestamp: new Date().toISOString(),
        },
        deviceInfo: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          platform: typeof navigator !== 'undefined' ? navigator.platform : 'mobile',
          language: typeof navigator !== 'undefined' ? navigator.language : 'en',
        },
        timestamp: Date.now(),
      };

      console.log('Sending suspicious activity alert:', alertPayload);

      // Send alert using API service
      const result = await apiService.sendAlert(alertPayload);

      if (!result.success) {
        throw new Error(result.error || 'Failed to send alert');
      }

      console.log('Suspicious activity alert sent successfully:', result);

      setReportSent(true);
    } catch (error) {
      console.error('Error sending suspicious activity alert:', error);
      setError(error instanceof Error ? error.message : 'Failed to send alert');
    } finally {
      setIsReporting(false);
    }
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Please contact our customer support team for assistance with your account verification.',
      [
        {
          text: 'Call Support',
          onPress: () => {
            // In a real app, this would open the phone dialer
            Alert.alert('Support', 'Call: 1-800-BANKING');
          }
        },
        {
          text: 'Email Support',
          onPress: () => {
            // In a real app, this would open the email client
            Alert.alert('Support', 'Email: support@bankingapp.com');
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };



  return (
    <SafeAreaView className="flex-1 bg-red-50">
      <View className="flex-1 justify-center items-center px-6">
        {/* Alert Icon */}
        <View className="mb-8">
          <View className="w-24 h-24 bg-red-100 rounded-full items-center justify-center mb-4">
            <Text className="text-red-600 text-4xl">⚠️</Text>
          </View>
        </View>

        {/* Main Content */}
        <View className="bg-white p-6 rounded-2xl shadow-sm mb-8 w-full">
          <Text className="text-red-600 text-center text-2xl font-bold mb-4">
            Suspicious Activity Detected
          </Text>

          <Text className="text-gray-700 text-center text-base leading-6 mb-6">
            For your security, we have detected unusual activity on your account.
            Our security team has been notified and will review your account.
          </Text>

          {/* Status Messages */}
          {isReporting && (
            <View className="bg-blue-50 p-4 rounded-xl mb-4">
              <Text className="text-blue-600 text-center font-medium">
                🔄 Reporting suspicious activity...
              </Text>
            </View>
          )}

          {reportSent && (
            <View className="bg-green-50 p-4 rounded-xl mb-4">
              <Text className="text-green-600 text-center font-medium">
                ✅ Security team has been notified
              </Text>
            </View>
          )}

          {error && (
            <View className="bg-red-50 p-4 rounded-xl mb-4">
              <Text className="text-red-600 text-center font-medium">
                ❌ {error}
              </Text>
              <TouchableOpacity
                className="mt-2 py-2 px-4 bg-red-100 rounded-lg"
                onPress={sendSuspiciousActivityAlert}
              >
                <Text className="text-red-600 text-center font-semibold">
                  Retry Alert
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Text className="text-gray-600 text-center text-sm">
            Your account access has been temporarily restricted for security purposes.
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="w-full space-y-4">
          <TouchableOpacity
            className="bg-blue-600 py-4 rounded-xl"
            onPress={handleContactSupport}
          >
            <Text className="text-white text-center font-semibold text-lg">
              Contact Support
            </Text>
          </TouchableOpacity>


        </View>

        {/* Security Notice */}
        <View className="mt-8 px-4">
          <Text className="text-gray-500 text-center text-xs">
            🔒 This security measure helps protect your account from unauthorized access.
            If you believe this is an error, please contact our support team.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}