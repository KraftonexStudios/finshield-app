export interface MobileTouchEvent {
  gestureType: "tap" | "swipe" | "scroll" | "pinch" | "long_press"; // react-native-gesture-handler
  timestamp: number; // JS: Date.now()

  startX: number; // JS: event.nativeEvent.touches[0].pageX or Native: MotionEvent.getX()
  startY: number; // JS: event.nativeEvent.touches[0].pageY or Native: MotionEvent.getY()
  endX: number; // JS: event.nativeEvent.touches[0].pageX or Native: MotionEvent.getX()
  endY: number; // JS: event.nativeEvent.touches[0].pageY or Native: MotionEvent.getY()

  duration: number; // Calculate (endTime - startTime) Native Module with kotlin
  distance?: number; // JS: Calculate Math.sqrt((endX-startX)² + (endY-startY)²)
  velocity?: number; // JS: Calculate distance/duration
}

export interface MobileKeystroke {
  character: string; // JS: event.nativeEvent.key
  timestamp: number; // JS: Date.now() or Native: KeyEvent.getEventTime()
  dwellTime: number; //  Native: ACTION_DOWN to ACTION_UP Kotlin
  flightTime: number; // JS: Calculate (currentKeystroke.timestamp - previousKeystroke.timestamp)
  x: number; // JS: event.nativeEvent.touches[0].pageX or Native: MotionEvent.getX()
  y: number; // JS: event.nativeEvent.touches[0].pageY or Native: MotionEvent.getY()
  action?: "up" | "down"; // Native: KeyEvent action type for authentic timing
  inputType?: "password" | "email" | "amount" | "mobile" | "text"; // JS: Input field type context
}

export interface MobileMotionEvents {
  timestamp: number; // JS: Date.now() or Native: System.currentTimeMillis()

  accelerometer: {
    x: number; // JS: expo-sensors Accelerometer.addListener()
    y: number; // JS: expo-sensors Accelerometer.addListener()
    z: number; // JS: expo-sensors Accelerometer.addListener()
  };

  gyroscope: {
    x: number; // JS: expo-sensors Gyroscope.addListener()
    y: number; // JS: expo-sensors Gyroscope.addListener()
    z: number; // JS: expo-sensors Gyroscope.addListener()
  };

  magnetometer: {
    x: number; // JS: expo-sensors Magnetometer.addListener()
    y: number; // JS: expo-sensors Magnetometer.addListener()
    z: number; // JS: expo-sensors Magnetometer.addListener()
  };

  motionMagnitude?: number; // JS: Calculate Math.sqrt(ax² + ay² + az²)
  rotationRate?: number; // JS: Calculate Math.sqrt(gx² + gy² + gz²)
  orientationChange?: number; // JS: Calculate from magnetometer and accelerometer data
}

export interface MotionPattern {
  samples: MobileMotionEvents[]; // JS: Collect array of MobileMotionEvents over time
  duration: number; // JS: Calculate totalTime (5000ms for 5 seconds)
  sampleRateHz: number; // JS: expo-sensors setUpdateInterval() - e.g., 50Hz
}

export interface TouchGesture {
  touches: MobileTouchEvent[]; // JS: Collect from onTouchStart/onTouchEnd events
}

export interface TypingPattern {
  inputType: "password" | "email" | "amount" | "mobile" | "text"; // JS: App context/state
  keystrokes: MobileKeystroke[]; // JS/Native: Collect from TextInput events or KeyEvent
}

export interface LoginBehavior {
  timestamp: number; // JS: Date.now() on session start
  loginFlow: "pin" | "biometric" | "passwordless"; // JS: App logic/state
  biometricOutcome: "success" | "failure" | "not_available" | "user_cancelled"; //expo-local-authentication
  biometricType: "fingerprint" | "face_id" | "none"; // expo-local-authentication
  loginError?: string; // JS: Error handling in auth flow
  failedAttempts?: number; // JS: Track failed login attempts
}

export interface LocationBehavior {
  latitude: number; // JS: expo-location Location.getCurrentPositionAsync()
  longitude: number; // JS: expo-location Location.getCurrentPositionAsync()
  accuracy: number; // JS: expo-location Location.getCurrentPositionAsync().coords.accuracy
  altitude: number; // JS: expo-location Location.getCurrentPositionAsync().coords.altitude
  timezone: string; // JS: Intl.DateTimeFormat().resolvedOptions().timeZone
  permissionDenied?: boolean; // JS: expo-location Location.requestForegroundPermissionsAsync()
  locationError?: string; // JS: Error handling in location requests
}

export interface DeviceBehavior {
  deviceId: string; // JS: expo-device Device.osBuildId
  deviceModel: string; // JS: expo-device Device.modelName
  osVersion: string; // JS: expo-device Device.osVersion
  appVersion: string; // JS: expo-constants Constants.expoConfig?.version
  batteryLevel: number; // JS: expo-battery Battery.getBatteryLevelAsync()
  isCharging: boolean; // JS: expo-battery Battery.getBatteryStateAsync()
  orientation: "portrait" | "landscape" | "unknown"; // JS: expo-screen-orientation ScreenOrientation.getOrientationAsync()
  isRooted: boolean; // JS: expo-device Device.isRootedExperimentalAsync()

  batteryPermissionDenied?: boolean; // JS: Handle expo-battery permission errors
  deviceError?: string; // JS: Error handling in device info collection

  //   Kotlin
  isDebuggingEnabled: boolean; // Native Kotlin: Settings.Global.ADB_ENABLED
  hasOverlayPermission: boolean; // Native Kotlin: Settings.canDrawOverlays()
  hasUnknownApps: boolean; // Native Kotlin: PackageManager analysis for unknown sources
  accessibilityServices: string[]; // Native Kotlin: Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
  activeInputMethod: string; // Native Kotlin: Settings.Secure.DEFAULT_INPUT_METHOD
  appUsagePatterns: Record<string, number>; // Native Kotlin: UsageStatsManager (requires permission)
  hardwareAttestation: boolean; // Native Kotlin: Key Attestation API
}

export interface NetworkBehavior {
  networkType: "wifi" | "cellular" | "ethernet" | "unknown"; // JS: expo-network Network.getNetworkStateAsync()
  networkName: string; // JS: react-native-wifi-reborn WifiManager.getCurrentWifiSSID()
  networkOperator: string; // JS: react-native-carrier-info CarrierInfo.carrierName()
  isSecureConnection: boolean; // Native Kotlin: WifiInfo security type analysis
  simSerial: string; // JS: react-native-sim-data or Native: TelephonyManager.getSimSerialNumber()
  simOperator: string; // JS: react-native-carrier-info or Native: TelephonyManager.getNetworkOperatorName()
  simCountry: string; // JS: react-native-sim-data or Native: TelephonyManager.getSimCountryIso()
  isRoaming?: boolean; // JS: react-native-sim-data or Native: TelephonyManager.isNetworkRoaming()
  phoneStatePermissionDenied?: boolean; // JS: Handle permission request results
  networkError?: string; // JS: Error handling in network requests
  vpnDetected: boolean; // JS: react-native-vpn-detector-latest or Native: ConnectivityManager analysis
}

export interface BehavioralSession {
  sessionId: string;
  userId: string;
  timestamp: number;

  touchPatterns: TouchGesture[];
  typingPatterns: TypingPattern[];
  motionPattern: MotionPattern[];
  loginBehavior: LoginBehavior;
  locationBehavior: LocationBehavior;
  networkBehavior: NetworkBehavior;
  deviceBehavior: DeviceBehavior;
}
