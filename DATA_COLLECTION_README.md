# Data Collection System

This document explains how to use the comprehensive data collection system implemented in this banking application.

## Overview

The data collection system is designed to gather behavioral data for fraud detection and user analytics. It includes:

- **Touch Events**: Enhanced touch data with pressure, area, and orientation
- **Keystroke Patterns**: Typing behavior analysis with dwell time and pressure
- **Motion Sensors**: Accelerometer, gyroscope, and magnetometer data
- **Device Behavior**: Security settings, app usage, and system information
- **Network Behavior**: Connection security, SIM info, and VPN detection
- **Location Behavior**: Movement patterns and location data
- **Login Behavior**: Authentication patterns and timing

## Architecture

### Core Components

1. **Data Collection Store** (`stores/useDataCollectionStore.ts`)
   - Centralized state management using Zustand
   - Handles all data collection logic and native module integration

2. **Type Definitions** (`types/data.collection.ts`)
   - Comprehensive interfaces for all data types
   - Clear separation between JS/Expo and native Kotlin data

3. **Native Module** (`modules/data-collection/`)
   - Custom Expo module written in Kotlin
   - Provides enhanced data collection capabilities
   - Handles Android-specific permissions and APIs

## Usage

### Basic Setup

```typescript
import { useDataCollectionStore } from "../stores/useDataCollectionStore";

function MyComponent() {
  const {
    startSession,
    endSession,
    collectTouchEvent,
    collectKeystroke,
    requestPermissions,
    isCollecting,
    currentSession,
  } = useDataCollectionStore();

  // Initialize data collection
  useEffect(() => {
    requestPermissions();
  }, []);
}
```

### Starting a Data Collection Session

```typescript
// Start collecting data for a user
await startSession("user_id_123");

// The session will automatically collect:
// - Motion sensor data
// - Location updates (if permitted)
// - Device and network behavior
```

### Collecting Touch Events

```typescript
// Collect enhanced touch data
const touchData = {
  x: 150,
  y: 300,
  eventType: "touch",
  timestamp: Date.now(),
};

await collectTouchEvent(touchData);
// Native module adds: pressure, touchArea, orientation
```

### Collecting Keystroke Data

```typescript
// Collect typing behavior
const keystrokeData = {
  character: "A",
  keyCode: 65,
  timestamp: Date.now(),
};

await collectKeystroke(keystrokeData);
// Native module adds: pressure, dwellTime
```

### Manual Data Collection

```typescript
// Collect device behavior
await collectDeviceBehavior();
// Returns: debugging status, overlay permissions, accessibility services, etc.

// Collect network behavior
await collectNetworkBehavior();
// Returns: VPN detection, SIM info, network security, etc.

// Collect location behavior
await collectLocationBehavior();
// Returns: movement patterns, location accuracy, etc.
```

### Ending a Session

```typescript
// End the current session and get summary
const sessionSummary = await endSession();
console.log("Session duration:", sessionSummary.duration);
console.log("Events collected:", sessionSummary.eventCount);
```

## Native Module Features

The Kotlin native module provides enhanced data collection:

### Enhanced Touch Events

- **Pressure**: Touch pressure measurement
- **Touch Area**: Contact area size
- **Orientation**: Touch orientation angle

### Enhanced Keystroke Data

- **Pressure**: Key press pressure
- **Dwell Time**: How long key was pressed

### Device Behavior Analysis

- **Debugging Status**: ADB debugging enabled
- **Overlay Permission**: System overlay access
- **Unknown Apps**: Installation from unknown sources
- **Accessibility Services**: Active accessibility services
- **Input Method**: Current keyboard/input method
- **App Usage Patterns**: Application usage statistics
- **Hardware Attestation**: Device security validation

## Dependencies

- `expo-device`: Device information
- `expo-battery`: Battery status
- `expo-location`: Location services
- `expo-network`: Network connectivity
- `expo-sensors`: Motion sensors (accelerometer, gyroscope, magnetometer)
- `react-native-sim-cards-manager`: SIM card information
- `react-native-wifi-reborn`: WiFi network information
- `react-native-device-info`: Device and carrier information
- `react-native-vpn-detector`: VPN detection
- `@react-native-community/netinfo`: Network information (required by VPN detector)
- `zustand`: State management
- Custom native module for enhanced touch/keystroke/device behavior data collection

### Network Behavior Analysis

- **SIM Information**: Using `react-native-sim-cards-manager` for SIM card data
- **WiFi Information**: Using `react-native-wifi-reborn` for network name (SSID)
- **Carrier Details**: Using `react-native-device-info` for network operator information
- **VPN Detection**: Using `react-native-vpn-detector` for VPN status detection
- **Basic Network State**: Connection type, internet reachability via Expo Network

## Permissions

The system requires several Android permissions:

### Required Permissions

- `PACKAGE_USAGE_STATS`: App usage statistics
- `SYSTEM_ALERT_WINDOW`: For overlay detection
- `REQUEST_INSTALL_PACKAGES`: For unknown app installation detection

### React Native Package Permissions

- `react-native-sim-cards-manager`: Requires `READ_PHONE_STATE` for SIM information
- `react-native-wifi-reborn`: Requires `ACCESS_FINE_LOCATION` and `ACCESS_WIFI_STATE` for WiFi data
- `expo-location`: Requires `ACCESS_FINE_LOCATION` for precise location data
- `expo-network`: Requires `ACCESS_NETWORK_STATE` for network connectivity
- `react-native-device-info`: Handles its own permission requirements

### Permission Management

```typescript
// Check current permission status
const permissions = await checkPermissions();
console.log("Location permitted:", permissions.location);

// Request all required permissions
await requestPermissions();
```

## Data Structure

### Behavioral Session

```typescript
interface BehavioralSession {
  sessionId: string;
  userId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  eventCount: number;
  deviceInfo: any;
  appVersion: string;
}
```

### Touch Event

```typescript
interface MobileTouchEvent {
  x: number;
  y: number;
  timestamp: number;
  eventType: string;
  pressure: number; // From native module
  touchArea: number; // From native module
  orientation: number; // From native module
}
```

### Keystroke Event

```typescript
interface MobileKeystroke {
  character: string;
  keyCode: number;
  timestamp: number;
  pressure: number; // From native module
  dwellTime: number; // From native module
}
```

## Building and Deployment

### Development Build

```bash
# Install dependencies
npm install

# Build development client with native module
npx expo run:android
```

### Production Considerations

1. **Privacy Compliance**: Ensure user consent for data collection
2. **Data Security**: Encrypt collected data before transmission
3. **Performance**: Monitor impact on app performance
4. **Battery Usage**: Optimize sensor usage to minimize battery drain

## Example Implementation

See `examples/data-collection-example.tsx` for a complete working example that demonstrates all features of the data collection system.

## Troubleshooting

### Common Issues

1. **Native Module Not Found**
   - Ensure you've run `npx expo run:android` to build with the native module
   - Check that the module is properly linked

2. **Permission Denied**
   - Request permissions before starting data collection
   - Some permissions require user interaction (Settings app)

3. **Sensor Data Not Collecting**
   - Verify device has required sensors
   - Check that motion sensors are started

### Debug Mode

```typescript
// Enable debug logging
const store = useDataCollectionStore();
console.log("Current session:", store.currentSession);
console.log("Permission status:", store.permissionStatus);
console.log("Collected events:", {
  touches: store.touchEvents.length,
  keystrokes: store.keystrokes.length,
  motion: store.motionEvents.length,
});
```

## Security Notes

- All sensitive data collection requires explicit user consent
- Data is collected locally and should be encrypted before transmission
- The native module implements security best practices
- Hardware attestation provides additional device validation

## Performance Optimization

- Motion sensors are automatically throttled to prevent excessive data
- Location updates use balanced accuracy settings
- Data collection can be paused/resumed as needed
- Session management prevents memory leaks
