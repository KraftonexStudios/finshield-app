import { router } from 'expo-router';
import { ArrowLeft, Shield } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, Text, View } from 'react-native';
import DataCollectionTextInput from '../../components/DataCollectionTextInput';
import { useDataCollectionStore } from '../../stores/useDataCollectionStore';
import { useUserStore } from '../../stores/useUserStore';

interface CaptchaChallenge {
  combinedText: string;
}

// Generate random meaningless text with mixed letters and numbers to prevent autocomplete
const generateRandomCaptcha = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let captcha = '';

  // Generate exactly 6 random characters
  for (let i = 0; i < 6; i++) {
    captcha += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return captcha;
};

export default function CaptchaVerificationScreen() {
  const [currentChallenge, setCurrentChallenge] = useState<CaptchaChallenge | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUserStore();
  const { collectKeystroke } = useDataCollectionStore();

  useEffect(() => {
    // Generate a new random meaningless challenge
    const randomText = generateRandomCaptcha();
    setCurrentChallenge({ combinedText: randomText });
  }, []);

  const handleInputChange = (text: string) => {
    setUserInput(text);

    // Collect keystroke data for typing behavior analysis
    if (user?.uid) {
      collectKeystroke({
        character: text.slice(-1), // Last typed character
        timestamp: Date.now(),
        inputType: 'text',
        coordinate_x: 0,
        coordinate_y: 0,
        actionValue: 1, // keyup event
      });
    }
  };

  const handleSubmit = async () => {
    if (!currentChallenge) return;

    const isCorrect = userInput.trim() === currentChallenge.combinedText;

    if (isCorrect) {
      setIsLoading(true);

      try {
        // Navigate to loading screen for data processing
        router.replace('./loading-setup');
      } catch (error) {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      Alert.alert(
        'Incorrect Input',
        'Please type the text exactly as shown, including spaces and capitalization.',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setUserInput('');
              // Generate a new challenge to prevent memorization
              const newRandomText = generateRandomCaptcha();
              setCurrentChallenge({ combinedText: newRandomText });
            }
          }
        ]
      );
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (!currentChallenge) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 items-center justify-center">
          <Text className="text-white text-lg">Loading verification...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 px-6 py-8">
        {/* Header */}
        <View className="flex-row items-center mb-8">
          <Pressable
            onPress={handleBack}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={24} color="white" />
          </Pressable>
          <Text className="text-white text-xl font-semibold ml-4">
            Security Verification
          </Text>
        </View>

        {/* Icon */}
        <View className="items-center mb-8">
          <View className="w-20 h-20 rounded-full items-center justify-center mb-6 bg-[#10B981]">
            <Shield size={32} color="white" />
          </View>
          <Text className="text-white text-2xl font-bold mb-2">
            Identity Verification
          </Text>
          <Text className="text-gray-400 text-base text-center">
            Please type the 6-character code below exactly as shown
          </Text>
        </View>

        {/* Challenge Display */}
        <View className="bg-gray-900 rounded-lg p-4 mb-6">
          <Text className="text-gray-400 text-sm mb-2">
            6-character code to type:
          </Text>
          <Text className="text-white text-2xl font-mono leading-6 text-center tracking-widest">
            {currentChallenge.combinedText}
          </Text>
        </View>

        {/* Input Field */}
        <View className="mb-6">
          <Text className="text-gray-400 text-sm mb-2">
            Your input:
          </Text>
          <DataCollectionTextInput
            value={userInput}
            onChangeText={handleInputChange}
            placeholder="Type the 6-character code here..."
            placeholderTextColor="#6b7280"
            className="bg-gray-800 text-white text-2xl p-4 rounded-lg border border-gray-700 text-center tracking-widest font-mono"
            multiline={false}
            maxLength={6}
            keyboardType="default"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="off"
            textContentType="none"
            inputType="text"
            editable={!isLoading}
          />
        </View>

        {/* Submit Button */}
        <Pressable
          onPress={handleSubmit}
          disabled={isLoading || !userInput.trim()}
          className={`py-4 px-6 rounded-lg items-center mb-8 ${isLoading || !userInput.trim()
            ? 'bg-gray-700'
            : 'bg-green-600'
            }`}
        >
          <Text className={`text-lg font-semibold ${isLoading || !userInput.trim()
            ? 'text-gray-400'
            : 'text-white'
            }`}>
            {isLoading ? 'Processing...' : 'Verify & Continue'}
          </Text>
        </Pressable>

        {/* Help Text */}
        <View>
          <Text className="text-gray-500 text-sm text-center">
            This 6-character code prevents autocomplete and helps us analyze your unique typing patterns for enhanced security.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}