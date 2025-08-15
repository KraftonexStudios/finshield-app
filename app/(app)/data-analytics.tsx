import DataCollectionTextInput from '@/components/DataCollectionTextInput';
import { DeviceBehavior, nativeDataCollectionService, SessionAnalytics } from '@/services/NativeDataCollectionService';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DataAnalyticsScreen = () => {
  const [sessionAnalytics, setSessionAnalytics] = useState<SessionAnalytics | null>(null);
  const [deviceBehavior, setDeviceBehavior] = useState<DeviceBehavior | null>(null);
  const [serviceStatus, setServiceStatus] = useState(nativeDataCollectionService.getStatus());
  const [refreshing, setRefreshing] = useState(false);
  const [testInput, setTestInput] = useState('');

  const loadData = async () => {
    try {
      const [analytics, behavior] = await Promise.all([
        nativeDataCollectionService.getSessionAnalytics(),
        nativeDataCollectionService.getDeviceBehavior()
      ]);

      setSessionAnalytics(analytics);
      setDeviceBehavior(behavior);
      setServiceStatus(nativeDataCollectionService.getStatus());
    } catch (error) {
      // Failed to load data
      Alert.alert('Error', 'Failed to load analytics data');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const resetSession = async () => {
    try {
      const success = await nativeDataCollectionService.resetSession();
      if (success) {
        Alert.alert('Success', 'Session reset successfully');
        await loadData();
      } else {
        Alert.alert('Error', 'Failed to reset session');
      }
    } catch (error) {
      // Failed to reset session
      Alert.alert('Error', 'Failed to reset session');
    }
  };

  const exportData = async () => {
    try {
      const exportedData = await nativeDataCollectionService.exportData();
      // Exported data
      Alert.alert(
        'Data Exported',
        `Data exported successfully at ${new Date(exportedData.exportTimestamp).toLocaleString()}`,
        [
          {
            text: 'View in Console',
            onPress: () => {}
          },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      // Failed to export data
      Alert.alert('Error', 'Failed to export data');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Native Data Collection Analytics</Text>

        {/* Service Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Status</Text>
          <View style={styles.statusContainer}>
            <Text style={[styles.statusText, serviceStatus.initialized ? styles.statusGood : styles.statusBad]}>
              Initialized: {serviceStatus.initialized ? '✓' : '✗'}
            </Text>
            <Text style={[styles.statusText, serviceStatus.sessionActive ? styles.statusGood : styles.statusBad]}>
              Session Active: {serviceStatus.sessionActive ? '✓' : '✗'}
            </Text>
            <Text style={[styles.statusText, serviceStatus.nativeModuleAvailable ? styles.statusGood : styles.statusBad]}>
              Native Module: {serviceStatus.nativeModuleAvailable ? '✓' : '✗'}
            </Text>
          </View>
        </View>

        {/* Test Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Data Collection</Text>
          <Text style={styles.description}>Type in the input below to test keystroke collection:</Text>
          <DataCollectionTextInput
            style={styles.testInput}
            placeholder="Type here to test keystroke collection..."
            value={testInput}
            onChangeText={setTestInput}
            inputType="text"
            multiline
            onDataCollected={(data) => {
              // Keystroke collected
            }}
          />
        </View>

        {/* Session Analytics */}
        {sessionAnalytics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Session Analytics</Text>
            <View style={styles.analyticsGrid}>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsLabel}>Session Duration</Text>
                <Text style={styles.analyticsValue}>{formatDuration(sessionAnalytics.sessionDuration)}</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsLabel}>Touch Events</Text>
                <Text style={styles.analyticsValue}>{sessionAnalytics.touchEvents}</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsLabel}>Keystrokes</Text>
                <Text style={styles.analyticsValue}>{sessionAnalytics.keystrokeEvents}</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsLabel}>Data Points</Text>
                <Text style={styles.analyticsValue}>
                  {(sessionAnalytics.touchEvents + sessionAnalytics.keystrokeEvents)}
                </Text>
              </View>
            </View>

            {/* Raw Data Collection */}
            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>Raw Data Collection</Text>
              <View style={styles.analyticsGrid}>
                <View style={styles.analyticsItem}>
                  <Text style={styles.analyticsLabel}>Session Start</Text>
                  <Text style={styles.analyticsValue}>
                    {sessionAnalytics.sessionStartTime ? new Date(sessionAnalytics.sessionStartTime).toLocaleTimeString() : 'N/A'}
                  </Text>
                </View>
                <View style={styles.analyticsItem}>
                  <Text style={styles.analyticsLabel}>Last Activity</Text>
                  <Text style={styles.analyticsValue}>
                    {sessionAnalytics.lastActivity ? new Date(sessionAnalytics.lastActivity).toLocaleTimeString() : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Device Behavior */}
        {deviceBehavior && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Device Behavior</Text>
            <View style={styles.deviceBehaviorContainer}>
              <View style={styles.behaviorItem}>
                <Text style={styles.behaviorLabel}>Debugging Enabled</Text>
                <Text style={[styles.behaviorValue, deviceBehavior.isDebuggingEnabled ? styles.statusBad : styles.statusGood]}>
                  {deviceBehavior.isDebuggingEnabled ? 'Yes' : 'No'}
                </Text>
              </View>
              <View style={styles.behaviorItem}>
                <Text style={styles.behaviorLabel}>Overlay Permission</Text>
                <Text style={[styles.behaviorValue, deviceBehavior.hasOverlayPermission ? styles.statusBad : styles.statusGood]}>
                  {deviceBehavior.hasOverlayPermission ? 'Yes' : 'No'}
                </Text>
              </View>
              <View style={styles.behaviorItem}>
                <Text style={styles.behaviorLabel}>Unknown Apps</Text>
                <Text style={[styles.behaviorValue, deviceBehavior.hasUnknownApps ? styles.statusBad : styles.statusGood]}>
                  {deviceBehavior.hasUnknownApps ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
              <View style={styles.behaviorItem}>
                <Text style={styles.behaviorLabel}>Hardware Attestation</Text>
                <Text style={[styles.behaviorValue, deviceBehavior.hardwareAttestation ? styles.statusGood : styles.statusBad]}>
                  {deviceBehavior.hardwareAttestation ? 'Supported' : 'Not Supported'}
                </Text>
              </View>
            </View>

            {/* Device Fingerprint */}
            {deviceBehavior.deviceFingerprint && (
              <View style={styles.subSection}>
                <Text style={styles.subSectionTitle}>Device Fingerprint</Text>
                {Object.entries(deviceBehavior.deviceFingerprint).map(([key, value]) => (
                  <View key={key} style={styles.fingerprintItem}>
                    <Text style={styles.fingerprintLabel}>{key}</Text>
                    <Text style={styles.fingerprintValue}>{value}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={resetSession}>
            <Text style={styles.buttonText}>Reset Session</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.exportButton]} onPress={exportData}>
            <Text style={styles.buttonText}>Export Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  subSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#555',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  testInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  statusContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusGood: {
    color: '#4CAF50',
  },
  statusBad: {
    color: '#F44336',
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  analyticsItem: {
    width: '48%',
    marginBottom: 12,
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  analyticsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  gestureContainer: {
    marginTop: 12,
  },
  gestureItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  gestureLabel: {
    fontSize: 14,
    color: '#666',
  },
  gestureCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  deviceBehaviorContainer: {
    gap: 8,
  },
  behaviorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  behaviorLabel: {
    fontSize: 14,
    color: '#666',
  },
  behaviorValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  fingerprintItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  fingerprintLabel: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  fingerprintValue: {
    fontSize: 12,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  exportButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DataAnalyticsScreen;