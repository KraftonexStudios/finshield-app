import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View, TextInput } from 'react-native';
import { useDataCollectionStore } from '../stores/useDataCollectionStore';
import { TextInputWrapper } from '../components/TextInputWrapper';
import { TouchTrackingWrapper } from '../components/TouchTrackingWrapper';

export default function DataCollectionTest() {
  const {
    currentSession,
    touchEvents,
    keystrokes,
    motionEvents,
    isCollecting,
    startSession,
    endSession,
    startDataCollection,
    requestPermissions,
  } = useDataCollectionStore();

  const [testText, setTestText] = useState('');

  const handleStartSession = async () => {
    await startSession('test_user_123');
  };

  const handleStartDataCollection = async () => {
    await startDataCollection('login');
  };

  const handleEndSession = async () => {
    await endSession();
  };

  const handleRequestPermissions = async () => {
    await requestPermissions();
  };

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4 text-center">🧪 Data Collection Test</Text>

      {/* Status Display */}
      <View className="mb-4 p-4 bg-gray-100 rounded-lg">
        <Text className="font-bold text-lg mb-2">📊 Current Status</Text>
        <Text className="mb-1">Session Active: {currentSession ? '✅ YES' : '❌ NO'}</Text>
        <Text className="mb-1">Collecting Data: {isCollecting ? '✅ YES' : '❌ NO'}</Text>
        <Text className="mb-1">Session ID: {currentSession?.sessionId || 'None'}</Text>
      </View>

      {/* Data Counts */}
      <View className="mb-4 p-4 bg-blue-50 rounded-lg">
        <Text className="font-bold text-lg mb-2">📈 Collected Data</Text>
        <Text className="mb-1">👆 Touch Events: {touchEvents.length}</Text>
        <Text className="mb-1">⌨️ Keystrokes: {keystrokes.length}</Text>
        <Text className="mb-1">🏃 Motion Events: {motionEvents.length}</Text>
      </View>

      {/* Control Buttons */}
      <View className="mb-4 space-y-2">
        <TouchableOpacity
          onPress={handleRequestPermissions}
          className="bg-blue-500 p-3 rounded-lg"
        >
          <Text className="text-white text-center font-semibold">🔐 Request Permissions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleStartSession}
          disabled={!!currentSession}
          className={`p-3 rounded-lg ${
            currentSession ? 'bg-gray-300' : 'bg-green-500'
          }`}
        >
          <Text className="text-white text-center font-semibold">
            🚀 Start Session
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleStartDataCollection}
          disabled={!currentSession || isCollecting}
          className={`p-3 rounded-lg ${
            !currentSession || isCollecting ? 'bg-gray-300' : 'bg-purple-500'
          }`}
        >
          <Text className="text-white text-center font-semibold">
            🎯 Start Data Collection
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleEndSession}
          disabled={!currentSession}
          className={`p-3 rounded-lg ${
            !currentSession ? 'bg-gray-300' : 'bg-red-500'
          }`}
        >
          <Text className="text-white text-center font-semibold">
            🛑 End Session
          </Text>
        </TouchableOpacity>
      </View>

      {/* Test Input Area */}
      <View className="mb-4 p-4 bg-yellow-50 rounded-lg">
        <Text className="font-bold text-lg mb-2">✍️ Test Input (with Data Collection)</Text>
        <Text className="text-sm text-gray-600 mb-2">
          Type here to test keystroke collection. Touch the screen to test touch collection.
        </Text>
        
        <TouchTrackingWrapper>
          <TextInputWrapper inputType="text">
            <TextInput
              value={testText}
              onChangeText={setTestText}
              placeholder="Type here to test keystroke collection..."
              className="border border-gray-300 rounded p-3 bg-white"
              multiline
              numberOfLines={3}
            />
          </TextInputWrapper>
        </TouchTrackingWrapper>
      </View>

      {/* Instructions */}
      <View className="mb-4 p-4 bg-orange-50 rounded-lg">
        <Text className="font-bold text-lg mb-2">📋 Instructions</Text>
        <Text className="text-sm mb-1">1. Request permissions first</Text>
        <Text className="text-sm mb-1">2. Start a session</Text>
        <Text className="text-sm mb-1">3. Start data collection</Text>
        <Text className="text-sm mb-1">4. Type in the text input and touch the screen</Text>
        <Text className="text-sm mb-1">5. End session to send data</Text>
      </View>
    </ScrollView>
  );
}