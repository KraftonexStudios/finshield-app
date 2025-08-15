import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useDataCollectionStore } from '../stores/useDataCollectionStore';
import { MobileKeystroke, MobileTouchEvent } from '../types/data.collection';

export default function DataCollectionExample() {
  const {
    // State
    currentSession,
    touchEvents,
    keystrokes,
    motionEvents,
    loginBehavior,
    locationBehavior,
    deviceBehavior,
    networkBehavior,
    permissionStatus,
    isCollecting,

    // Actions
    startSession,
    endSession,
    collectTouchEvent,
    collectKeystroke,
    collectMotionData,
    collectLoginBehavior,
    collectLocationBehavior,
    collectDeviceBehavior,
    collectNetworkBehavior,
    requestPermissions,
    checkPermissions,
    startMotionSensors,
    stopMotionSensors,
  } = useDataCollectionStore();

  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    // Initialize permissions on component mount
    checkPermissions().then(() => {
      addLog('Permissions checked');
    });
  }, []);

  const handleStartSession = async () => {
    try {
      await startSession('example_user_123');
      addLog('Data collection session started');
    } catch (error) {
      addLog(`Error starting session: ${error}`);
    }
  };

  const handleEndSession = async () => {
    try {
      const session = await endSession();
      addLog(`Session ended. Duration: ${session?.duration || 0}ms`);
    } catch (error) {
      addLog(`Error ending session: ${error}`);
    }
  };

  const handleTouchEvent = async () => {
    try {
      const touchData: Partial<MobileTouchEvent> = {
        x: Math.random() * 300,
        y: Math.random() * 500,
        eventType: 'touch',
        timestamp: Date.now(),
      };

      await collectTouchEvent(touchData);
      addLog(`Touch event collected at (${touchData.x?.toFixed(0)}, ${touchData.y?.toFixed(0)})`);
    } catch (error) {
      addLog(`Error collecting touch event: ${error}`);
    }
  };

  const handleKeystroke = async () => {
    try {
      const keystrokeData: Partial<MobileKeystroke> = {
        character: String.fromCharCode(65 + Math.floor(Math.random() * 26)), // Random A-Z
        timestamp: Date.now(),
        keyCode: 65 + Math.floor(Math.random() * 26),
      };

      await collectKeystroke(keystrokeData);
      addLog(`Keystroke collected: ${keystrokeData.character}`);
    } catch (error) {
      addLog(`Error collecting keystroke: ${error}`);
    }
  };

  const handleCollectDeviceBehavior = async () => {
    try {
      await collectDeviceBehavior();
      addLog('Device behavior collected');
    } catch (error) {
      addLog(`Error collecting device behavior: ${error}`);
    }
  };

  const handleCollectNetworkBehavior = async () => {
    try {
      await collectNetworkBehavior();
      addLog('Network behavior collected');
    } catch (error) {
      addLog(`Error collecting network behavior: ${error}`);
    }
  };

  const handleRequestPermissions = async () => {
    try {
      await requestPermissions();
      addLog('Permissions requested');
    } catch (error) {
      addLog(`Error requesting permissions: ${error}`);
    }
  };

  const handleStartMotionSensors = async () => {
    try {
      await startMotionSensors();
      addLog('Motion sensors started');
    } catch (error) {
      addLog(`Error starting motion sensors: ${error}`);
    }
  };

  const handleStopMotionSensors = () => {
    stopMotionSensors();
    addLog('Motion sensors stopped');
  };

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4">Data Collection Example</Text>

      {/* Session Status */}
      <View className="mb-4 p-3 bg-gray-100 rounded">
        <Text className="font-semibold">Session Status:</Text>
        <Text>Active: {currentSession ? 'Yes' : 'No'}</Text>
        <Text>Collecting: {isCollecting ? 'Yes' : 'No'}</Text>
        {currentSession && (
          <Text>Session ID: {currentSession.sessionId}</Text>
        )}
      </View>

      {/* Data Counts */}
      <View className="mb-4 p-3 bg-blue-50 rounded">
        <Text className="font-semibold">Collected Data:</Text>
        <Text>Touch Events: {touchEvents.length}</Text>
        <Text>Keystrokes: {keystrokes.length}</Text>
        <Text>Motion Events: {motionEvents.length}</Text>
      </View>

      {/* Permission Status */}
      <View className="mb-4 p-3 bg-green-50 rounded">
        <Text className="font-semibold">Permissions:</Text>
        <Text>Location: {permissionStatus.location ? '✅' : '❌'}</Text>
        <Text>Motion: {permissionStatus.motion ? '✅' : '❌'}</Text>
        <Text>Phone State: {permissionStatus.phoneState ? '✅' : '❌'}</Text>
        <Text>Usage Stats: {permissionStatus.usageStats ? '✅' : '❌'}</Text>
      </View>

      {/* Control Buttons */}
      <View className="space-y-2">
        <TouchableOpacity
          onPress={handleRequestPermissions}
          className="bg-blue-500 p-3 rounded"
        >
          <Text className="text-white text-center font-semibold">Request Permissions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleStartSession}
          disabled={!!currentSession}
          className={`p-3 rounded ${currentSession ? 'bg-gray-300' : 'bg-green-500'}`}
        >
          <Text className="text-white text-center font-semibold">Start Session</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleEndSession}
          disabled={!currentSession}
          className={`p-3 rounded ${!currentSession ? 'bg-gray-300' : 'bg-red-500'}`}
        >
          <Text className="text-white text-center font-semibold">End Session</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleTouchEvent}
          className="bg-purple-500 p-3 rounded"
        >
          <Text className="text-white text-center font-semibold">Simulate Touch Event</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleKeystroke}
          className="bg-orange-500 p-3 rounded"
        >
          <Text className="text-white text-center font-semibold">Simulate Keystroke</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleCollectDeviceBehavior}
          className="bg-indigo-500 p-3 rounded"
        >
          <Text className="text-white text-center font-semibold">Collect Device Behavior</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleCollectNetworkBehavior}
          className="bg-teal-500 p-3 rounded"
        >
          <Text className="text-white text-center font-semibold">Collect Network Behavior</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleStartMotionSensors}
          className="bg-yellow-500 p-3 rounded"
        >
          <Text className="text-white text-center font-semibold">Start Motion Sensors</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleStopMotionSensors}
          className="bg-gray-500 p-3 rounded"
        >
          <Text className="text-white text-center font-semibold">Stop Motion Sensors</Text>
        </TouchableOpacity>
      </View>

      {/* Logs */}
      <View className="mt-6 p-3 bg-gray-50 rounded">
        <Text className="font-semibold mb-2">Activity Log:</Text>
        {logs.map((log, index) => (
          <Text key={index} className="text-sm text-gray-600 mb-1">
            {log}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}