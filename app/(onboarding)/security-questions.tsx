import DataCollectionTextInput from '@/components/DataCollectionTextInput';
import { useUserStore } from '@/stores/useUserStore';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, ChevronDown, ChevronUp, Lock } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

interface SecurityQuestion {
  id: string;
  question: string;
  answer: string;
}

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What city were you born in?",
  "What is your favorite movie?",
  "What was your childhood nickname?",
  "What is the name of your best friend from childhood?",
  "What was the make of your first car?"
];

export default function SecurityQuestionsScreen() {
  const { setupSecurityQuestions, isLoading, error, onboardingStep } = useUserStore();
  const [questions, setQuestions] = useState<SecurityQuestion[]>([
    { id: '1', question: SECURITY_QUESTIONS[0], answer: '' },
    { id: '2', question: SECURITY_QUESTIONS[1], answer: '' },
    { id: '3', question: SECURITY_QUESTIONS[2], answer: '' }
  ]);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);

  const handleQuestionChange = (questionId: string, newQuestion: string) => {
    setQuestions(prev => prev.map(q =>
      q.id === questionId ? { ...q, question: newQuestion } : q
    ));
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setQuestions(prev => prev.map(q =>
      q.id === questionId ? { ...q, answer: answer.trim() } : q
    ));
  };

  const isFormValid = () => {
    return questions.every(q => q.answer.length >= 2) &&
      new Set(questions.map(q => q.question)).size === 3; // Ensure unique questions
  };

  const handleContinue = async () => {
    if (!isFormValid()) {
      Alert.alert(
        'Incomplete Information',
        'Please answer all security questions with at least 2 characters each and ensure all questions are different.'
      );
      return;
    }

    try {
      const securityQuestions = questions.map(q => ({
        question: q.question,
        answer: q.answer
      }));
      await setupSecurityQuestions(securityQuestions);
      // Navigation will be handled by the store based on user setup status
    } catch (error) {
      Alert.alert('Error', 'Failed to save security questions. Please try again.');
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Security Questions?',
      'Security questions help protect your account. Are you sure you want to skip this step?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => {
            router.push('/(onboarding)/biometric-setup');
          }
        }
      ]
    );
  };

  // Navigate based on onboarding step changes
  useEffect(() => {
    if (onboardingStep === 'biometric-setup') {
      router.push('/(onboarding)/biometric-setup');
    } else if (onboardingStep === 'completed') {
      router.replace('/(app)/dashboard');
    }
  }, [onboardingStep]);

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      className="flex-1"
    >
      <SafeAreaView className="flex-1 bg-black">
        <KeyboardAvoidingView
          behavior='height'
          className="flex-1"
        >
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="flex-1 px-8 py-8">
              {/* Header */}
              <View className="mb-8">
                <Pressable
                  onPress={() => router.back()}
                  className="w-12 h-12 rounded-full bg-white/10 items-center justify-center mb-8"
                >
                  <ArrowLeft size={24} color="white" />
                </Pressable>

                <Text className="text-3xl font-bold text-white mb-3">
                  Security Questions
                </Text>
                <Text className="text-white/70 text-lg leading-6">
                  Set up 3 security questions to help protect your account
                </Text>
              </View>

              {/* Security Questions */}
              <View className="mb-8">
                {questions.map((item, index) => (
                  <View key={item.id} className="mb-6">
                    <Text className="text-white text-sm font-semibold mb-3">
                      Question {index + 1}
                    </Text>

                    {/* Question Selector */}
                    <Pressable
                      onPress={() => setSelectedQuestionIndex(selectedQuestionIndex === index ? null : index)}
                      className="bg-white/5 border border-white/20 rounded-2xl px-5 py-4 mb-3"
                    >
                      <View className="flex-row justify-between items-center">
                        <Text className="text-white flex-1 text-base">
                          {item.question}
                        </Text>
                        <View className="ml-2">
                          {selectedQuestionIndex === index ? (
                            <ChevronUp size={20} color="rgba(255, 255, 255, 0.6)" />
                          ) : (
                            <ChevronDown size={20} color="rgba(255, 255, 255, 0.6)" />
                          )}
                        </View>
                      </View>
                    </Pressable>

                    {/* Question Options */}
                    {selectedQuestionIndex === index && (
                      <View className="bg-white/5 border border-white/20 rounded-2xl mb-3 overflow-hidden">
                        {SECURITY_QUESTIONS.map((question, qIndex) => (
                          <Pressable
                            key={qIndex}
                            onPress={() => {
                              handleQuestionChange(item.id, question);
                              setSelectedQuestionIndex(null);
                            }}
                            className={`px-5 py-4 ${qIndex < SECURITY_QUESTIONS.length - 1 ? 'border-b border-white/10' : ''
                              }`}
                          >
                            <Text className="text-white text-base">
                              {question}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}

                    {/* Answer Input */}
                    <DataCollectionTextInput
                      value={item.answer}
                      onChangeText={(text) => handleAnswerChange(item.id, text)}
                      placeholder="Enter your answer"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      className="bg-white/5 border border-white/20 rounded-2xl px-5 py-4 text-white text-base"
                      autoCapitalize="words"
                      autoCorrect={false}
                      inputType="text"
                    />
                  </View>
                ))}
              </View>

              {/* Info Section */}
              <View className="bg-white/5 rounded-2xl p-5 mb-8 border border-white/10">
                <View className="flex-row items-center mb-2">
                  <Lock size={16} color="white" style={{ marginRight: 8 }} />
                  <Text className="text-white text-sm font-semibold">
                    Security Tips
                  </Text>
                </View>
                <Text className="text-white/70 text-sm leading-5">
                  • Choose answers you'll remember easily{"\n"}
                  • Avoid answers that others might guess{"\n"}
                  • These questions help verify your identity if you forget your PIN
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Buttons */}
          <View className="px-8 pb-8">
            <Pressable
              onPress={handleContinue}
              className={`rounded-2xl py-4 px-6 mb-4 ${isFormValid() && !isLoading
                ? 'bg-white'
                : 'bg-white/20 border border-white/30'
                }`}
              disabled={!isFormValid() || isLoading}
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                className={`text-center text-lg font-semibold ${isFormValid() && !isLoading ? 'text-gray-900' : 'text-white/50'
                  }`}
              >
                {isLoading ? 'Setting up...' : 'Continue'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSkip}
              className="py-3"
            >
              <Text className="text-white/60 text-center text-base">
                Skip for now
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}