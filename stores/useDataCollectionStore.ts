import * as Battery from "expo-battery";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as LocalAuthentication from "expo-local-authentication";
import * as Location from "expo-location";
import { requireNativeModule } from "expo-modules-core";
import * as Network from "expo-network";
import * as ScreenOrientation from "expo-screen-orientation";
import { Accelerometer, Gyroscope, Magnetometer } from "expo-sensors";
import DeviceInfo from "react-native-device-info";
import { isVpnActive } from "react-native-vpn-detector";
import WifiManager from "react-native-wifi-reborn";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// Import API constants and service
import { buildApiUrl } from "../constants/API_ENDPOINTS";

// Import types
import type {
  BehavioralSession,
  DeviceBehavior,
  LocationBehavior,
  MobileKeystroke,
  MobileMotionEvents,
  MobileTouchEvent,
  MotionPattern,
  NetworkBehavior,
  TouchGesture,
  TypingPattern,
} from "../types/data.collection";

// Native module interface
interface BehavioralDataCollector {
  collectTouchEvent(touchData: any): Promise<MobileTouchEvent>;
  collectKeystroke(keystrokeData: any): Promise<MobileKeystroke>;
  getDeviceBehavior(): Promise<any>;
  getSimCountry(): Promise<string>;
  checkPermissions(): Promise<{ [key: string]: boolean }>;
  resetSession(): Promise<boolean>;
}

// Import the native module
let BehavioralDataCollectorModule: BehavioralDataCollector | null = null;
try {
  BehavioralDataCollectorModule = requireNativeModule("DataCollection");
} catch (error) {}

// Debouncing utility for state updates
let updateTimeout: ReturnType<typeof setTimeout> | null = null;

// Performance optimization: Use requestAnimationFrame for smooth UI updates
let animationFrameId: number | null = null;
let pendingStateUpdates: (() => void)[] = [];

const scheduleStateUpdate = (updateFn: () => void) => {
  pendingStateUpdates.push(updateFn);

  if (animationFrameId === null) {
    animationFrameId = requestAnimationFrame(() => {
      // Execute all pending updates in a single frame
      const updates = [...pendingStateUpdates];
      pendingStateUpdates = [];
      animationFrameId = null;

      updates.forEach((update) => update());
    });
  }
};

interface DataCollectionState {
  // Session Management
  currentSession: BehavioralSession | null;
  isCollecting: boolean;
  sessionId: string | null;
  userId: string | null;
  collectionScenario:
    | "initial-registration"
    | "first-time-registration"
    | "re-registration"
    | "login"
    | null;
  isWaitingForResponse: boolean;
  sessionStartTime: number | null;
  sessionEndTime: number | null;
  backgroundState: string | null;
  patternInterval: NodeJS.Timeout | null;
  staticDataCollected: boolean;
  isEndingSession: boolean;
  lastTouchEventTime: number;
  lastKeystrokeTime: number;
  lastProcessedKeyIdentifier: string | null;
  lastKeystrokeCoordinates: { x: number; y: number } | null;
  currentInputType: "password" | "email" | "amount" | "mobile" | "text" | null;
  pendingKeydowns: Map<
    string,
    {
      timestamp: number;
      inputType: "password" | "email" | "amount" | "mobile" | "text";
      x: number;
      y: number;
      pressure: number | undefined;
    }
  >; // Track keydown events for simplified keystroke structure

  // Data Collections
  touchEvents: MobileTouchEvent[];
  keystrokes: MobileKeystroke[];
  motionEvents: MobileMotionEvents[];
  motionPatterns: MotionPattern[];
  touchGestures: TouchGesture[];
  typingPatterns: TypingPattern[];

  // Behavioral Data
  locationBehavior: LocationBehavior | null;
  deviceBehavior: DeviceBehavior | null;
  networkBehavior: NetworkBehavior | null;

  // Sensor Subscriptions
  accelerometerSubscription: any;
  gyroscopeSubscription: any;
  magnetometerSubscription: any;

  // Collection Status
  isMotionCollecting: boolean;
  isTouchCollecting: boolean;
  isKeystrokeCollecting: boolean;
  lastDataSent: number | null;
  collectionErrors: string[];

  // Error Handling
  errors: Record<string, string>;
  permissionStatus: Record<string, boolean>;

  // Background state preservation
  backgroundStateData: {
    wasCollecting: boolean;
    timestamp: number;
    touchCount: number;
    motionCount: number;
    scenario: string | null;
  } | null;

  // Actions
  startSession: (userId: string) => Promise<void>;
  setUserId: (userId: string) => void;
  clearSession: () => void;
  startDataCollection: (
    scenario:
      | "initial-registration"
      | "first-time-registration"
      | "re-registration"
      | "login"
  ) => Promise<void>;
  endSessionAndSendData: (endpoint: string) => Promise<{
    success: boolean;
    data: any;
  }>;
  stopDataCollection: () => Promise<void>;
  handleAppStateChange: (nextAppState: string) => Promise<void>;

  // Data Collection Actions
  collectTouchEvent: (event: Partial<MobileTouchEvent>) => Promise<void>;
  collectKeystroke: (event: Partial<MobileKeystroke>) => Promise<void>;
  generateTypingPatternForInputType: (
    inputType: "password" | "email" | "amount" | "mobile" | "text",
    forceGeneration?: boolean
  ) => void;
  startMotionCollection: () => Promise<void>;
  stopMotionCollection: () => void;
  collectLocationBehavior: () => Promise<void>;
  collectDeviceBehavior: () => Promise<void>;
  collectNetworkBehavior: () => Promise<void>;

  // Utility Actions
  generateSessionId: () => string;
  calculateMotionMagnitude: (accelerometer: {
    x: number;
    y: number;
    z: number;
  }) => number;
  calculateRotationRate: (gyroscope: {
    x: number;
    y: number;
    z: number;
  }) => number;
  calculateDistance: (
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ) => number;
  calculateVelocity: (distance: number, duration: number) => number;

  // Permission Management
  requestPermissions: () => Promise<void>;
  checkPermissions: () => Promise<{
    location: boolean;
    motion: boolean;
    usageStats: boolean;
  }>;
  checkPermissionStatus: (permission: string) => boolean;
  sendSessionDataToServer: (
    endpoint: string,
    sessionData: BehavioralSession
  ) => Promise<void>;
  calculateDataSize: (data: any) => number;
  validateSessionData: (sessionData: BehavioralSession) => {
    isValid: boolean;
    reason?: string;
  };
  chunkSessionData: (
    sessionData: BehavioralSession,
    maxSizeBytes?: number
  ) => BehavioralSession[];
}

export const useDataCollectionStore = create<DataCollectionState>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    currentSession: null,
    isCollecting: false,
    sessionId: null,
    userId: null,
    collectionScenario: null,
    isWaitingForResponse: false,
    sessionStartTime: null,
    sessionEndTime: null,
    backgroundState: null,
    patternInterval: null,
    backgroundStateData: null,
    staticDataCollected: false,
    isEndingSession: false,
    lastTouchEventTime: 0,
    lastKeystrokeTime: 0,
    lastProcessedKeyIdentifier: null,
    lastKeystrokeCoordinates: null,
    currentInputType: null,
    pendingKeydowns: new Map(),
    touchEvents: [],
    keystrokes: [],
    motionEvents: [],
    motionPatterns: [],
    touchGestures: [],
    typingPatterns: [],
    locationBehavior: null,
    deviceBehavior: null,
    networkBehavior: null,
    accelerometerSubscription: null,
    gyroscopeSubscription: null,
    magnetometerSubscription: null,
    isMotionCollecting: false,
    isTouchCollecting: false,
    isKeystrokeCollecting: false,
    lastDataSent: null,
    collectionErrors: [],
    errors: {},
    permissionStatus: {
      location: false,
      usageStats: false,
    },

    // Utility Functions with performance optimizations
    generateSessionId: () => {
      return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    // Memoized calculation functions to avoid repeated computations
    calculateMotionMagnitude: (() => {
      const cache = new Map();
      return (accelerometer) => {
        const key = `${accelerometer.x.toFixed(3)}_${accelerometer.y.toFixed(3)}_${accelerometer.z.toFixed(3)}`;
        if (cache.has(key)) {
          return cache.get(key);
        }
        const magnitude = Math.sqrt(
          accelerometer.x * accelerometer.x +
            accelerometer.y * accelerometer.y +
            accelerometer.z * accelerometer.z
        );
        // Keep cache size manageable
        if (cache.size > 100) {
          cache.clear();
        }
        cache.set(key, magnitude);
        return magnitude;
      };
    })(),

    calculateRotationRate: (() => {
      const cache = new Map();
      return (gyroscope) => {
        const key = `${gyroscope.x.toFixed(3)}_${gyroscope.y.toFixed(3)}_${gyroscope.z.toFixed(3)}`;
        if (cache.has(key)) {
          return cache.get(key);
        }
        const rate = Math.sqrt(
          gyroscope.x * gyroscope.x +
            gyroscope.y * gyroscope.y +
            gyroscope.z * gyroscope.z
        );
        if (cache.size > 100) {
          cache.clear();
        }
        cache.set(key, rate);
        return rate;
      };
    })(),

    calculateDistance: (() => {
      const cache = new Map();
      return (startX, startY, endX, endY) => {
        const key = `${startX}_${startY}_${endX}_${endY}`;
        if (cache.has(key)) {
          return cache.get(key);
        }
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (cache.size > 50) {
          cache.clear();
        }
        cache.set(key, distance);
        return distance;
      };
    })(),

    calculateVelocity: (distance, duration) => {
      return duration > 0 ? distance / duration : 0;
    },

    // Permission Management
    requestPermissions: async () => {
      try {
        // Location Permission
        const locationPermission =
          await Location.requestForegroundPermissionsAsync();
        set((state) => ({
          permissionStatus: {
            ...state.permissionStatus,
            location: locationPermission.status === "granted",
          },
        }));

        // Battery Permission (usually granted by default)
        try {
          await Battery.getBatteryLevelAsync();
          set((state) => ({
            permissionStatus: {
              ...state.permissionStatus,
              battery: true,
            },
          }));
        } catch (error) {
          set((state) => ({
            permissionStatus: {
              ...state.permissionStatus,
              battery: false,
            },
            errors: {
              ...state.errors,
              battery: "Battery permission denied",
            },
          }));
        }

        // Biometric Permission
        const biometricAvailable = await LocalAuthentication.hasHardwareAsync();
        set((state) => ({
          permissionStatus: {
            ...state.permissionStatus,
            biometric: biometricAvailable,
          },
        }));

        // Check native module permissions
        if (BehavioralDataCollectorModule) {
          try {
            const nativePermissions =
              await BehavioralDataCollectorModule.checkPermissions();
            set((state) => ({
              permissionStatus: {
                ...state.permissionStatus,
                usageStats: nativePermissions.usageStats || false,
              },
            }));
          } catch (error) {}
        }
      } catch (error) {
        set((state) => ({
          errors: {
            ...state.errors,
            permissions: "Failed to request permissions",
          },
        }));
      }
    },

    checkPermissions: async () => {
      try {
        const permissions = {
          location: false,
          motion: false,
          usageStats: false,
        };

        // Check location permission
        const { status: locationStatus } =
          await Location.getForegroundPermissionsAsync();
        permissions.location = locationStatus === "granted";

        // Motion sensors don't require explicit permissions on most devices
        permissions.motion = true;

        // Check native module permissions
        if (BehavioralDataCollectorModule) {
          try {
            const nativePermissions =
              await BehavioralDataCollectorModule.checkPermissions();
            permissions.usageStats = nativePermissions.usageStats || false;
          } catch (error) {}
        }

        set({
          permissionStatus: { ...get().permissionStatus, ...permissions },
        });
        return permissions;
      } catch (error) {
        throw error;
      }
    },

    checkPermissionStatus: (permission) => {
      return get().permissionStatus[permission] || false;
    },

    // Session Management
    startSession: async (userId) => {
      try {
        const sessionId = get().generateSessionId();
        const timestamp = Date.now();

        // Request permissions first
        await get().requestPermissions();

        // Collect initial device and network behavior
        await get().collectDeviceBehavior();
        await get().collectNetworkBehavior();
        await get().collectLocationBehavior();

        const session: BehavioralSession = {
          sessionId,
          userId,
          timestamp,
          touchPatterns: [],
          typingPatterns: [],
          motionPattern: [],
          locationBehavior: get().locationBehavior || {
            latitude: 0,
            longitude: 0,
            accuracy: 0,
            altitude: 0,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            permissionDenied: true,
          },
          networkBehavior: get().networkBehavior || {
            networkType: "unknown",
            networkName: "",
            networkOperator: "",
            isSecureConnection: false,
            simSerial: "",
            simOperator: "",
            simCountry: "",
            vpnDetected: false,
          },
          deviceBehavior: get().deviceBehavior || {
            deviceId: "",
            deviceModel: "",
            osVersion: "",
            appVersion: "",
            batteryLevel: 0,
            isCharging: false,
            orientation: "unknown",
            isRooted: false,
            isDebuggingEnabled: false,
            hasOverlayPermission: false,
            hasUnknownApps: false,
            accessibilityServices: [],
            activeInputMethod: "",
            appUsagePatterns: {},
            hardwareAttestation: false,
          },
        };

        set({
          currentSession: session,
          sessionId,
          userId,
          isCollecting: true,
          sessionStartTime: timestamp,
          staticDataCollected: false,
          lastTouchEventTime: 0,
          lastKeystrokeTime: 0,
          touchEvents: [],
          keystrokes: [],
          motionEvents: [],
          errors: {},
        });

        // Start motion collection automatically
        await get().startMotionCollection();
      } catch (error) {
        set((state) => ({
          errors: {
            ...state.errors,
            session: "Failed to start data collection session",
          },
        }));
      }
    },

    setUserId: (userId) => {
      set((state) => ({
        userId,
        currentSession: state.currentSession
          ? { ...state.currentSession, userId }
          : null,
      }));
      console.log("🔑 User ID set for data collection:", userId);
    },

    // Optimized Data Collection Management with batching
    startDataCollection: async (scenario) => {
      try {
        const state = get();

        // Prevent starting multiple sessions
        if (state.isCollecting && state.collectionScenario) {
          console.log(
            "🟡 Data collection already active for scenario:",
            state.collectionScenario
          );
          return;
        }

        // Reset native module session state
        try {
          if (BehavioralDataCollectorModule) {
            await BehavioralDataCollectorModule.resetSession();
          }
        } catch (error) {
          console.warn("Failed to reset native module session:", error);
        }

        set({
          collectionScenario: scenario,
          isCollecting: true,
          isTouchCollecting: true,
          isKeystrokeCollecting: true,
          collectionErrors: [],
        });

        // Start motion collection if not already started
        if (!get().isMotionCollecting) {
          await get().startMotionCollection();
        }

        // Initialize all behavior data collections to avoid null values
        await Promise.all([
          get().collectDeviceBehavior(),
          get().collectNetworkBehavior(),
          get().collectLocationBehavior(),
        ]);

        console.log(
          "🟢 Data collection started successfully for scenario:",
          scenario
        );
      } catch (error) {
        set((state) => ({
          collectionErrors: [
            ...state.collectionErrors,
            "Failed to start data collection",
          ],
          errors: {
            ...state.errors,
            collection: "Failed to start data collection",
          },
        }));
      }
    },

    stopDataCollection: async () => {
      try {
        // Removed data collection stop logging

        set({
          isCollecting: false,
          isTouchCollecting: false,
          isKeystrokeCollecting: false,
          collectionScenario: null,
        });

        // Stop motion collection
        get().stopMotionCollection();
      } catch (error) {
        set((state) => ({
          collectionErrors: [
            ...state.collectionErrors,
            "Failed to stop data collection",
          ],
          errors: {
            ...state.errors,
            collection: "Failed to stop data collection",
          },
        }));
      }
    },

    handleAppStateChange: async (nextAppState) => {
      try {
        const state = get();
        // Removed app state logging

        if (nextAppState === "background" && state.isCollecting) {
          // Save current collection state before pausing
          const backgroundStateData = {
            wasCollecting: true,
            timestamp: Date.now(),
            touchCount: state.touchEvents.length,
            motionCount: state.motionPatterns.length,
            scenario: state.collectionScenario,
          };

          // Store background state for resume
          set({ backgroundStateData });

          // Pause collection when app goes to background
          await get().stopDataCollection();

          // Removed collection pause logging
        } else if (nextAppState === "active") {
          const backgroundStateData = state.backgroundStateData;

          // Only resume collection if it was explicitly paused due to background state
          // Do NOT automatically restart collection just because the app becomes active
          if (
            backgroundStateData?.wasCollecting &&
            state.sessionId &&
            state.collectionScenario
          ) {
            const backgroundDuration =
              Date.now() - (backgroundStateData.timestamp || 0);

            // Removed collection resume logging

            await get().startDataCollection(state.collectionScenario);

            // Clear background state
            set({ backgroundStateData: null });
          } else {
            // Removed app active logging
          }
        }

        // Removed app state success logging
      } catch (error) {}
    },

    endSessionAndSendData: async (endpoint) => {
      console.log(
        "🔴 endSessionAndSendData called - starting session termination and data send"
      );
      try {
        const state = get();
        if (!state.currentSession || state.isEndingSession) {
          console.log("🔴 endSessionAndSendData early return:", {
            hasCurrentSession: !!state.currentSession,
            isCollecting: state.isCollecting,
            isEndingSession: state.isEndingSession,
          });
          // Session already ended or currently ending
          return {
            success: true,
            data: {
              status: "no_session_data",
              requiresSecurityQuestions: false,
              message: "No session data available",
            },
          };
        }

        // Set flag to prevent multiple simultaneous calls
        set({ isEndingSession: true });
        console.log(
          "🔴 endSessionAndSendData proceeding with session termination"
        );

        // Generate typing pattern for current input type before ending session
        console.log("🔴 Session end - Current state check:", {
          currentInputType: state.currentInputType,
          keystrokesCount: state.keystrokes.length,
          typingPatternsCount: state.typingPatterns.length,
          isCollecting: state.isCollecting,
        });

        // Generate typing patterns for all input types that have keystrokes
        if (state.keystrokes.length > 0) {
          console.log(
            "🔴 Generating final typing patterns for all input types with keystrokes"
          );

          // Get unique input types from keystrokes
          const inputTypes = [
            ...new Set(state.keystrokes.map((k) => k.inputType)),
          ];
          console.log("🔴 Found input types:", inputTypes);

          inputTypes.forEach((inputType) => {
            if (inputType) {
              console.log("🔴 Generating pattern for input type:", inputType);
              get().generateTypingPatternForInputType(inputType, true); // Force generation
            }
          });

          // Check updated state after pattern generation
          const updatedState = get();
          console.log(
            "🔴 After pattern generation - typing patterns count:",
            updatedState.typingPatterns.length
          );
        }

        get().stopMotionCollection();

        // Consolidate all touch events into a single TouchGesture
        const allTouchEvents = [
          ...state.touchGestures.flatMap((gesture) => gesture.touches),
          ...state.touchEvents,
        ];

        const consolidatedTouchPatterns: TouchGesture[] =
          allTouchEvents.length > 0
            ? [
                {
                  touches: allTouchEvents,
                },
              ]
            : [];

        // Consolidate all typing patterns by inputType into single objects
        // Only use raw keystrokes from state to prevent duplication from existing patterns
        const consolidatedTypingPatterns: TypingPattern[] = [];
        const keystrokesByInputType = new Map<string, MobileKeystroke[]>();

        // Only use keystrokes from state to prevent duplication
        state.keystrokes.forEach((keystroke) => {
          if (keystroke.inputType) {
            const existing =
              keystrokesByInputType.get(keystroke.inputType) || [];
            existing.push(keystroke);
            keystrokesByInputType.set(keystroke.inputType, existing);
          }
        });

        // Create consolidated typing patterns
        keystrokesByInputType.forEach((keystrokes, inputType) => {
          if (keystrokes.length > 0) {
            consolidatedTypingPatterns.push({
              inputType: inputType as
                | "password"
                | "email"
                | "amount"
                | "mobile"
                | "text",
              keystrokes: keystrokes.sort((a, b) => a.timestamp - b.timestamp), // Sort by timestamp
            });
          }
        });

        const sessionData: BehavioralSession = {
          sessionId: state.currentSession.sessionId,
          userId: state.currentSession.userId,
          timestamp: state.currentSession.timestamp,
          touchPatterns: consolidatedTouchPatterns,
          typingPatterns: consolidatedTypingPatterns,
          motionPattern: state.motionPatterns,
          locationBehavior: state.currentSession.locationBehavior,
          networkBehavior: state.currentSession.networkBehavior,
          deviceBehavior: state.currentSession.deviceBehavior,
        };

        console.log(
          "🔴 Session end debug - Complete session analysis:",
          sessionData,
          "----print data----"
        );

        // Reset session state
        set({
          currentSession: null,
          isCollecting: false,
          sessionId: null,
          sessionEndTime: Date.now(),
          staticDataCollected: false,
          isEndingSession: false,
          lastTouchEventTime: 0,
          lastKeystrokeTime: 0,
          lastProcessedKeyIdentifier: null,
          currentInputType: null,
          touchEvents: [],
          keystrokes: [],
          motionEvents: [],
          motionPatterns: [],
          touchGestures: [],
          typingPatterns: [],
        });

        // Send session data to server
        const responseData = await get().sendSessionDataToServer(
          endpoint,
          sessionData
        );
        console.log(`✅ Session data sent successfully to ${endpoint}`);

        return {
          success: true,
          data: responseData,
        };
      } catch (error) {
        console.error(`❌ Failed to send session data to ${endpoint}:`, error);
        // Reset the ending session flag on error
        set({ isEndingSession: false });

        // TODO: NEEDS WORK - Bypass server errors for now during development
        // This should be removed once API endpoints are properly configured
        // console.warn("Bypassing server error for development");
        // return {
        //   success: true,
        //   data: {
        //     status: "server_error_bypassed",
        //     requiresSecurityQuestions: false,
        //     message: "Server error bypassed for development",
        //   },
        // };

        // Original error handling (commented out for bypass):
        set((state) => ({
          collectionErrors: [
            ...state.collectionErrors,
            `Failed to send data to ${endpoint}`,
          ],
          errors: {
            ...state.errors,
            sessionEnd: `Failed to send data to ${endpoint}`,
          },
        }));
        return { success: false, data: null };
      }
    },

    clearSession: () => {
      get().stopMotionCollection();
      set({
        currentSession: null,
        isCollecting: false,
        isKeystrokeCollecting: false,
        isTouchCollecting: false,
        isMotionCollecting: false,
        sessionId: null,
        userId: null,
        collectionScenario: null,
        isWaitingForResponse: false,
        sessionStartTime: null,
        sessionEndTime: null,
        staticDataCollected: false,
        isEndingSession: false,
        lastTouchEventTime: 0,
        lastKeystrokeTime: 0,
        lastProcessedKeyIdentifier: null,
        currentInputType: null,
        pendingKeydowns: new Map(),
        touchEvents: [],
        keystrokes: [],
        motionEvents: [],
        motionPatterns: [],
        touchGestures: [],
        typingPatterns: [],
        locationBehavior: null,
        deviceBehavior: null,
        networkBehavior: null,
        lastDataSent: null,
        collectionErrors: [],
        errors: {},
      });
    },

    // Touch Event Collection
    collectTouchEvent: async (event) => {
      try {
        const state = get();
        if (!state.isCollecting) return;

        const timestamp = Date.now();
        // Enhanced throttling: avoid overwhelming data and prevent duplicate coordinates
        if (timestamp - state.lastTouchEventTime < 100) {
          // Reduced to max 10 events per second for better navigation performance
          return;
        }

        // Prevent storing duplicate or very similar touch events
        const lastTouchEvent = state.touchEvents[state.touchEvents.length - 1];
        if (lastTouchEvent) {
          const coordinateThreshold = 10; // pixels
          const timeThreshold = 100; // milliseconds
          const xDiff = Math.abs((event.startX || 0) - lastTouchEvent.startX);
          const yDiff = Math.abs((event.startY || 0) - lastTouchEvent.startY);
          const timeDiff = timestamp - lastTouchEvent.timestamp;

          // Skip if coordinates are too similar and time difference is small
          if (
            xDiff < coordinateThreshold &&
            yDiff < coordinateThreshold &&
            timeDiff < timeThreshold
          ) {
            console.log("🟡 Skipped duplicate touch event:", {
              xDiff: xDiff.toFixed(1),
              yDiff: yDiff.toFixed(1),
              timeDiff,
            });
            return;
          }
        }
        let touchEvent: MobileTouchEvent = {
          gestureType: event.gestureType || "tap",
          timestamp,
          startX: event.startX || 0,
          startY: event.startY || 0,
          endX: event.endX || 0,
          endY: event.endY || 0,
          duration: event.duration || 0,
          distance: 0,
          velocity: 0,
          pressure: event.pressure, // undefined if device doesn't support pressure
        };

        // Calculate distance and velocity in real-time
        touchEvent.distance = get().calculateDistance(
          touchEvent.startX,
          touchEvent.startY,
          touchEvent.endX,
          touchEvent.endY
        );
        touchEvent.velocity = get().calculateVelocity(
          touchEvent.distance!,
          touchEvent.duration
        );

        console.log("🔵 Real-time touch calculation:", {
          gestureType: touchEvent.gestureType,
          distance: touchEvent.distance.toFixed(2),
          velocity: touchEvent.velocity.toFixed(2),
          duration: touchEvent.duration,
          coordinates: `(${touchEvent.startX.toFixed(1)}, ${touchEvent.startY.toFixed(1)}) -> (${touchEvent.endX.toFixed(1)}, ${touchEvent.endY.toFixed(1)})`,
        });

        // Try to get enhanced data from native module
        if (BehavioralDataCollectorModule) {
          try {
            const enhancedData =
              await BehavioralDataCollectorModule.collectTouchEvent({
                startX: touchEvent.startX,
                startY: touchEvent.startY,
                endX: touchEvent.endX,
                endY: touchEvent.endY,
              });
            touchEvent = { ...touchEvent, ...enhancedData };
          } catch (nativeError) {}
        }

        // Use async state update to prevent blocking navigation
        scheduleStateUpdate(() => {
          set((state) => {
            const newTouchEvents =
              state.touchEvents.length >= 100
                ? [...state.touchEvents.slice(-49), touchEvent] // Keep last 50 events when at limit
                : [...state.touchEvents, touchEvent];

            // Just collect touch events - patterns will be consolidated at session end
            console.log("🔵 Collected touch event:", {
              gestureType: touchEvent.gestureType,
              distance: touchEvent.distance,
              velocity: touchEvent.velocity,
              totalEvents: newTouchEvents.length,
            });

            return {
              touchEvents: newTouchEvents,
              lastTouchEventTime: timestamp,
            };
          });
        });
      } catch (error) {
        set((state) => ({
          errors: {
            ...state.errors,
            touch: "Failed to collect touch event",
          },
        }));
      }
    },

    // Keystroke Collection with debounced updates
    collectKeystroke: async (event) => {
      try {
        const state = get();

        console.log("🔴 [KEYSTROKE STORAGE] collectKeystroke called:", {
          isCollecting: state.isCollecting,
          event: {
            character: event.character,
            inputType: event.inputType,
            actionValue: event.actionValue,
            timestamp: event.timestamp,
          },
          currentKeystrokeCount: state.keystrokes.length,
          currentTypingPatternCount: state.typingPatterns.length,
        });

        if (!state.isCollecting) {
          console.log(
            "🔴 [KEYSTROKE STORAGE] Not collecting - returning early"
          );
          return;
        }

        const timestamp = event.timestamp || Date.now();
        const actionValue: 0 | 1 = event.actionValue ?? 1;
        // const keyIdentifier = `${event.character}_${event.inputType || "text"}_${actionValue}`;

        // NO DUPLICATE DETECTION - Capture everything to ensure nothing is missed
        // All keystrokes are processed regardless of timing or repetition
        console.log(
          `🟢 Processing ALL keystrokes: '${event.character}' (${actionValue === 0 ? "keydown" : "keyup"}) - No filtering applied`
        );

        // Update timing for session tracking only using async update
        scheduleStateUpdate(() => {
          set((state) => ({
            lastKeystrokeTime: timestamp,
          }));
        });

        const keyPairIdentifier = `${event.character}_${event.inputType || "text"}`;

        // Handle keydown event
        if (actionValue === 0) {
          const keydownData = {
            timestamp,
            inputType: event.inputType || "text",
            x: event.coordinate_x || 0,
            y: event.coordinate_y || 0,
            pressure: event.pressure,
          };

          scheduleStateUpdate(() => {
            set((state) => {
              const newPendingKeydowns = new Map(state.pendingKeydowns);
              newPendingKeydowns.set(keyPairIdentifier, keydownData);
              return {
                pendingKeydowns: newPendingKeydowns,
              };
            });
          });

          console.log(
            `🔵 Store - Keydown stored: ${event.character}, pending count: ${get().pendingKeydowns.size + 1}`
          );
          return;
        }

        // Handle keyup event
        if (actionValue === 1) {
          const keydownData = state.pendingKeydowns.get(keyPairIdentifier);
          if (!keydownData) {
            console.warn(
              `No matching keydown found for keyup event: '${event.character}'`
            );
            return;
          }

          // Calculate timing
          let dwellTime = Math.max(0, timestamp - keydownData.timestamp);
          if (dwellTime < 5) {
            dwellTime = Math.max(dwellTime, 15);
            console.log(
              `Adjusted extremely fast dwell time to ${dwellTime}ms for '${event.character}'`
            );
          } else if (dwellTime < 15) {
            console.log(
              `Very fast typing detected: ${dwellTime}ms dwell time for '${event.character}'`
            );
          } else if (dwellTime > 5000) {
            console.warn(
              `Very long dwell time: ${dwellTime}ms for character '${event.character}' - possible UI freeze`
            );
          }

          let flightTime = 0;
          const lastKeystroke = state.keystrokes[state.keystrokes.length - 1];
          if (lastKeystroke) {
            flightTime = Math.max(
              0,
              keydownData.timestamp - lastKeystroke.timestamp
            );
          }

          // Create keystroke object
          const keystroke: MobileKeystroke = {
            character: event.character || "",
            timestamp: keydownData.timestamp,
            dwellTime,
            flightTime,
            coordinate_x: keydownData.x,
            coordinate_y: keydownData.y,
            pressure: keydownData.pressure,
            inputType: keydownData.inputType,
          };

          // Send to native module if available
          if (BehavioralDataCollectorModule) {
            try {
              await BehavioralDataCollectorModule.collectKeystroke({
                character: keystroke.character,
                timestamp: keystroke.timestamp,
                dwellTime: dwellTime,
                flightTime: flightTime,
                coordinate_x: keydownData.x,
                coordinate_y: keydownData.y,
                pressure: keydownData.pressure,
              });

              console.log(
                `Keystroke collected - Character: ${keystroke.character}, JS Dwell Time: ${dwellTime}ms, JS Flight Time: ${flightTime}ms`
              );
            } catch (nativeError) {
              console.warn(
                "Native module keystroke collection failed:",
                nativeError
              );
            }
          }

          // Clean up pending keydowns
          state.pendingKeydowns.delete(keyPairIdentifier);
          const currentInputType = keystroke.inputType;
          const previousInputType = get().currentInputType;

          set({ currentInputType });
          console.log(
            `Input type changed from ${previousInputType} to ${currentInputType}`
          );

          // Clean up old keydown events
          const currentTime = timestamp;
          let cleanedCount = 0;
          for (const [key, keydownData] of state.pendingKeydowns.entries()) {
            if (currentTime - keydownData.timestamp > 1500) {
              state.pendingKeydowns.delete(key);
              cleanedCount++;
            }
          }
          if (cleanedCount > 0) {
            console.warn(
              `Cleaned up ${cleanedCount} orphaned keydown events with improved queuing`
            );
          }

          // Store keystroke asynchronously
          console.log("🔴 [KEYSTROKE STORAGE] About to store keystroke:", {
            character: keystroke.character,
            inputType: keystroke.inputType,
            dwellTime: keystroke.dwellTime,
            flightTime: keystroke.flightTime,
            currentKeystrokeCount: get().keystrokes.length,
          });

          scheduleStateUpdate(() => {
            set((state) => {
              const newKeystrokes =
                state.keystrokes.length >= 200
                  ? [...state.keystrokes.slice(-99), keystroke]
                  : [...state.keystrokes, keystroke];

              console.log("🔴 [KEYSTROKE STORAGE] Keystroke stored:", {
                newKeystrokeCount: newKeystrokes.length,
                previousCount: state.keystrokes.length,
                keystrokeAdded: keystroke.character,
              });

              // Generate typing patterns every 10 keystrokes (reduced frequency)
              if (newKeystrokes.length > 0 && newKeystrokes.length % 10 === 0) {
                // Delay pattern generation to reduce immediate CPU load
                setTimeout(() => {
                  const recentKeystrokes = newKeystrokes.slice(-25);
                  const inputType = keystroke.inputType || "text";

                  const typingPattern: TypingPattern = {
                    inputType,
                    keystrokes: recentKeystrokes,
                  };

                  console.log(
                    "🔴 [KEYSTROKE STORAGE] Generated typing pattern (10 complete keystrokes - optimized):",
                    {
                      inputType,
                      totalKeystrokeCount: recentKeystrokes.length,
                      newTypingPatternCount: get().typingPatterns.length + 1,
                    }
                  );

                  scheduleStateUpdate(() => {
                    set((state) => ({
                      ...state,
                      typingPatterns: [...state.typingPatterns, typingPattern],
                    }));
                  });
                }, 100); // 100ms delay for pattern generation

                return {
                  ...state,
                  keystrokes: newKeystrokes,
                };
              }

              return {
                ...state,
                keystrokes: newKeystrokes,
              };
            });
          });

          // Update lastKeystrokeTime and currentInputType asynchronously
          scheduleStateUpdate(() => {
            set((state) => ({
              ...state,
              lastKeystrokeTime: timestamp,
              currentInputType: currentInputType,
            }));
          });
          // });
        }
      } catch (error) {
        console.error("Keystroke collection error:", error);
        set((state) => ({
          errors: {
            ...state.errors,
            keystroke: `Failed to collect keystroke: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
          collectionErrors: [
            ...state.collectionErrors.slice(-9),
            `Keystroke collection failed at ${new Date().toISOString()}: ${error instanceof Error ? error.message : "Unknown error"}`,
          ],
        }));
      }
    },

    // Generate typing pattern for specific input type when switching fields
    generateTypingPatternForInputType: (
      inputType: "password" | "email" | "amount" | "mobile" | "text",
      forceGeneration: boolean = false
    ) => {
      const state = get();

      console.log(
        `🔴 [PATTERN GENERATION] generateTypingPatternForInputType called:`,
        {
          inputType,
          isCollecting: state.isCollecting,
          forceGeneration,
          totalKeystrokeCount: state.keystrokes.length,
          currentTypingPatternCount: state.typingPatterns.length,
        }
      );

      // Only generate patterns during session end (forceGeneration) to prevent duplication
      if (!forceGeneration) {
        console.log(
          `🔴 [PATTERN GENERATION] Pattern generation disabled during collection - only at session end`
        );
        return;
      }

      // Filter keystrokes for the specific input type
      const inputTypeKeystrokes = state.keystrokes.filter(
        (keystroke) => keystroke.inputType === inputType
      );

      console.log(
        `🔴 [PATTERN GENERATION] Filtered keystrokes for ${inputType}:`,
        {
          inputType,
          filteredKeystrokeCount: inputTypeKeystrokes.length,
          totalKeystrokeCount: state.keystrokes.length,
          isCollecting: state.isCollecting,
          forceGeneration,
          keystrokeDetails: inputTypeKeystrokes.map((k) => ({
            character: k.character,
            inputType: k.inputType,
            timestamp: k.timestamp,
          })),
        }
      );

      // This function is now only used during session end for final pattern generation
      console.log(
        `🔴 [PATTERN GENERATION] Force generation for ${inputType} with ${inputTypeKeystrokes.length} keystrokes`
      );
    },

    // Optimized Motion Collection with throttling and efficient data structures
    startMotionCollection: async () => {
      try {
        if (get().isMotionCollecting) {
          return;
        }

        // Check sensor availability
        try {
          const isAccelAvailable = await Accelerometer.isAvailableAsync();
          const isGyroAvailable = await Gyroscope.isAvailableAsync();
          const isMagAvailable = await Magnetometer.isAvailableAsync();

          // Removed sensor availability logging

          if (!isAccelAvailable && !isGyroAvailable && !isMagAvailable) {
            return;
          }
        } catch (sensorCheckError) {
          // Removed sensor check error logging
        }

        // Optimize to 15Hz (66ms) for better navigation performance
        Accelerometer.setUpdateInterval(66);
        Gyroscope.setUpdateInterval(66);
        Magnetometer.setUpdateInterval(66);

        // Use circular buffer for efficient memory management (optimized for 15Hz)
        let motionBuffer: MobileMotionEvents[] = new Array(75).fill(null); // 5 seconds at 15Hz
        let bufferIndex = 0;
        let lastUpdateTime = 0;
        const THROTTLE_MS = 66; // Throttle updates to 15Hz for better navigation performance

        // Temporary storage for sensor data
        let latestAccelerometer = { x: 0, y: 0, z: 0 };
        let latestGyroscope = { x: 0, y: 0, z: 0 };
        let latestMagnetometer = { x: 0, y: 0, z: 0 };

        let motionEventCount = 0;
        const updateMotionEvent = () => {
          const now = Date.now();
          if (now - lastUpdateTime < THROTTLE_MS) return;

          lastUpdateTime = now;
          motionEventCount++;

          const motionMagnitude =
            get().calculateMotionMagnitude(latestAccelerometer);
          const rotationRate = get().calculateRotationRate(latestGyroscope);

          const motionEvent: MobileMotionEvents = {
            timestamp: now,
            accelerometer: { ...latestAccelerometer },
            gyroscope: { ...latestGyroscope },
            magnetometer: { ...latestMagnetometer },
            motionMagnitude: parseFloat(motionMagnitude.toFixed(3)),
            rotationRate: parseFloat(rotationRate.toFixed(3)),
          };

          // Use circular buffer instead of array operations
          motionBuffer[bufferIndex] = motionEvent;
          bufferIndex = (bufferIndex + 1) % motionBuffer.length;

          // Removed motion event logging

          // Update state less frequently to reduce re-renders (every 15 samples = 1 second at 15Hz)
          if (bufferIndex % 15 === 0) {
            const validEvents = motionBuffer.filter((event) => event !== null);

            // Use async state update to prevent blocking navigation
            scheduleStateUpdate(() => {
              set((state) => ({
                motionEvents: validEvents,
              }));
            });
          }
        };

        const accelerometerSubscription = Accelerometer.addListener(
          (accelerometerData) => {
            try {
              latestAccelerometer = {
                x: parseFloat(accelerometerData.x.toFixed(3)),
                y: parseFloat(accelerometerData.y.toFixed(3)),
                z: parseFloat(accelerometerData.z.toFixed(3)),
              };
              updateMotionEvent();
            } catch (error) {
              // Removed accelerometer error logging
            }
          }
        );

        const gyroscopeSubscription = Gyroscope.addListener((gyroscopeData) => {
          try {
            latestGyroscope = {
              x: parseFloat(gyroscopeData.x.toFixed(3)),
              y: parseFloat(gyroscopeData.y.toFixed(3)),
              z: parseFloat(gyroscopeData.z.toFixed(3)),
            };
            updateMotionEvent();
          } catch (error) {
            // Removed gyroscope error logging
          }
        });

        const magnetometerSubscription = Magnetometer.addListener(
          (magnetometerData) => {
            try {
              latestMagnetometer = {
                x: parseFloat(magnetometerData.x.toFixed(3)),
                y: parseFloat(magnetometerData.y.toFixed(3)),
                z: parseFloat(magnetometerData.z.toFixed(3)),
              };
              updateMotionEvent();
            } catch (error) {
              // Removed magnetometer error logging
            }
          }
        );

        // Removed sensor registration logging

        set({
          accelerometerSubscription,
          gyroscopeSubscription,
          magnetometerSubscription,
          isMotionCollecting: true,
        });

        // Create motion patterns every 5 seconds for continuous collection during session
        const patternInterval = setInterval(() => {
          const validEvents = motionBuffer.filter((event) => event !== null);
          if (validEvents.length > 0) {
            const pattern: MotionPattern = {
              samples: validEvents.slice(), // Copy the valid events
              duration: 5000, // 5 seconds for more frequent patterns
              sampleRateHz: 30, // Updated to 30Hz sample rate
            };
            set((state) => {
              const newPatterns = [...state.motionPatterns.slice(-19), pattern]; // Keep last 20 patterns for longer sessions

              // Removed motion pattern logging

              return {
                motionPatterns: newPatterns,
              };
            });
            // Reset buffer for next pattern
            motionBuffer = new Array(150).fill(null);
            bufferIndex = 0;
          }
        }, 5000);

        // Store interval for cleanup
        set({ patternInterval } as any);
      } catch (error) {
        set((state) => ({
          errors: {
            ...state.errors,
            motion: "Failed to start motion collection",
          },
        }));
      }
    },

    stopMotionCollection: () => {
      const state = get();

      if (state.accelerometerSubscription) {
        state.accelerometerSubscription.remove();
      }
      if (state.gyroscopeSubscription) {
        state.gyroscopeSubscription.remove();
      }
      if (state.magnetometerSubscription) {
        state.magnetometerSubscription.remove();
      }
      if ((state as any).patternInterval) {
        clearInterval((state as any).patternInterval);
      }

      set({
        accelerometerSubscription: null,
        gyroscopeSubscription: null,
        magnetometerSubscription: null,
        isMotionCollecting: false,
        patternInterval: null,
      } as any);
    },

    // Location Behavior Collection
    collectLocationBehavior: async () => {
      try {
        let locationBehavior: LocationBehavior = {
          latitude: 0,
          longitude: 0,
          accuracy: 0,
          altitude: 0,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          permissionDenied: false,
        };

        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            locationBehavior.permissionDenied = true;
            locationBehavior.locationError = "Permission denied";
          } else {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            locationBehavior = {
              ...locationBehavior,
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy || 0,
              altitude: location.coords.altitude || 0,
            };
          }
        } catch (error) {
          locationBehavior.locationError = "Failed to get location";
        }

        set({ locationBehavior });
      } catch (error) {
        set((state) => ({
          errors: {
            ...state.errors,
            location: "Failed to collect location behavior",
          },
        }));
      }
    },

    // Device Behavior Collection
    collectDeviceBehavior: async () => {
      try {
        // Initialize with default values to avoid null
        let deviceBehavior: DeviceBehavior = {
          deviceId: "unknown",
          deviceModel: "unknown",
          osVersion: "unknown",
          appVersion: "1.0.0",
          batteryLevel: 0,
          isCharging: false,
          orientation: "unknown",
          isRooted: false,
          isDebuggingEnabled: false,
          hasOverlayPermission: false,
          hasUnknownApps: false,
          accessibilityServices: [],
          activeInputMethod: "default",
          appUsagePatterns: {},
          hardwareAttestation: false,
        };

        // Collect basic device info
        try {
          deviceBehavior.deviceId = Device.osBuildId || "unknown";
          deviceBehavior.deviceModel = Device.modelName || "unknown";
          deviceBehavior.osVersion = Device.osVersion || "unknown";
          deviceBehavior.appVersion = Constants.expoConfig?.version || "1.0.0";
          deviceBehavior.isRooted = await Device.isRootedExperimentalAsync();
        } catch (error) {}

        // Collect battery info
        try {
          deviceBehavior.batteryLevel = await Battery.getBatteryLevelAsync();
          const batteryState = await Battery.getBatteryStateAsync();
          deviceBehavior.isCharging =
            batteryState === Battery.BatteryState.CHARGING;
        } catch (error) {
          deviceBehavior.batteryPermissionDenied = true;
        }

        // Collect orientation
        try {
          const orientation = await ScreenOrientation.getOrientationAsync();
          deviceBehavior.orientation =
            orientation === ScreenOrientation.Orientation.PORTRAIT_UP ||
            orientation === ScreenOrientation.Orientation.PORTRAIT_DOWN
              ? "portrait"
              : "landscape";
        } catch (error) {}

        // Collect enhanced device info from native module
        if (BehavioralDataCollectorModule) {
          try {
            const enhancedData =
              await BehavioralDataCollectorModule.getDeviceBehavior();
            deviceBehavior = { ...deviceBehavior, ...enhancedData };
          } catch (nativeError) {}
        }

        set({ deviceBehavior });
      } catch (error) {
        set((state) => ({
          errors: {
            ...state.errors,
            device: "Failed to collect device behavior",
          },
        }));
      }
    },

    // Network Behavior Collection
    collectNetworkBehavior: async () => {
      try {
        let networkBehavior: NetworkBehavior = {
          networkType: "unknown",
          networkName: "",
          networkOperator: "",
          isSecureConnection: false,
          simSerial: "",
          simOperator: "",
          simCountry: "",
          vpnDetected: false,
        };

        // Collect basic network info
        try {
          const networkState = await Network.getNetworkStateAsync();
          networkBehavior.networkType =
            networkState.type === Network.NetworkStateType.WIFI
              ? "wifi"
              : networkState.type === Network.NetworkStateType.CELLULAR
                ? "cellular"
                : networkState.type === Network.NetworkStateType.ETHERNET
                  ? "ethernet"
                  : "unknown";
        } catch (error) {}

        // Collect network info using React Native packages
        try {
          // Carrier Info using react-native-device-info
          const carrier = await DeviceInfo.getCarrier();
          if (carrier) {
            networkBehavior.networkOperator = carrier;
          }

          // SIM data collection using native module
          networkBehavior.simSerial = "unknown";
          networkBehavior.simOperator = carrier || "unknown";

          // Get SIM country from native module
          if (BehavioralDataCollectorModule) {
            try {
              const simCountry =
                await BehavioralDataCollectorModule.getSimCountry();
              networkBehavior.simCountry = simCountry;
            } catch (error) {
              console.warn(
                "Failed to get SIM country from native module:",
                error
              );
              networkBehavior.simCountry = "unknown";
            }
          } else {
            networkBehavior.simCountry = "unknown";
          }

          // WiFi Info
          const wifiInfo = await WifiManager.getCurrentWifiSSID();
          if (wifiInfo) {
            networkBehavior.networkName = wifiInfo;
            networkBehavior.isSecureConnection = true; // Assume WiFi is secure if connected
          }

          // VPN Detection using react-native-vpn-detector
          const vpnStatus = isVpnActive();
          networkBehavior.vpnDetected = vpnStatus;
        } catch (packageError) {}

        set({ networkBehavior });
      } catch (error) {
        set((state) => ({
          errors: {
            ...state.errors,
            network: "Failed to collect network behavior",
          },
        }));
      }
    },

    // utility
    // Helper function to calculate data size in bytes
    calculateDataSize: (data: any): number => {
      return new Blob([JSON.stringify(data)]).size;
    },

    // Helper function to validate data quality
    validateSessionData: (
      sessionData: BehavioralSession
    ): { isValid: boolean; reason?: string } => {
      // Check if session has basic required fields
      if (!sessionData.sessionId || !sessionData.userId) {
        return { isValid: false, reason: "Missing sessionId or userId" };
      }

      // Check if session has any meaningful data
      const hasData =
        (sessionData.touchPatterns && sessionData.touchPatterns.length > 0) ||
        (sessionData.typingPatterns && sessionData.typingPatterns.length > 0) ||
        (sessionData.motionPattern && sessionData.motionPattern.length > 0) ||
        sessionData.locationBehavior ||
        sessionData.networkBehavior ||
        sessionData.deviceBehavior;

      if (!hasData) {
        return {
          isValid: false,
          reason: "No meaningful behavioral data collected",
        };
      }

      return { isValid: true };
    },

    // Helper function to chunk large data
    chunkSessionData: (
      sessionData: BehavioralSession,
      maxSizeBytes: number = 15 * 1024 * 1024
    ): BehavioralSession[] => {
      const chunks: BehavioralSession[] = [];
      const baseData = {
        sessionId: sessionData.sessionId,
        userId: sessionData.userId,
        timestamp: sessionData.timestamp,
        locationBehavior: sessionData.locationBehavior,
        networkBehavior: sessionData.networkBehavior,
        deviceBehavior: sessionData.deviceBehavior,
      };

      // Start with base data and add behavioral data incrementally
      let currentChunk: BehavioralSession = {
        ...baseData,
        touchPatterns: [],
        typingPatterns: [],
        motionPattern: [],
      };

      const addToChunk = (data: any, field: keyof BehavioralSession) => {
        const testChunk = { ...currentChunk, [field]: data };
        if (get().calculateDataSize(testChunk) <= maxSizeBytes) {
          currentChunk = testChunk;
          return true;
        }
        return false;
      };

      // Add touch patterns
      if (sessionData.touchPatterns && sessionData.touchPatterns.length > 0) {
        for (const pattern of sessionData.touchPatterns) {
          if (
            !addToChunk(
              [...currentChunk.touchPatterns, pattern],
              "touchPatterns"
            )
          ) {
            // Current chunk is full, start a new one
            chunks.push(currentChunk);
            currentChunk = {
              ...baseData,
              touchPatterns: [pattern],
              typingPatterns: [],
              motionPattern: [],
            };
          }
        }
      }

      // Add typing patterns
      if (sessionData.typingPatterns && sessionData.typingPatterns.length > 0) {
        for (const pattern of sessionData.typingPatterns) {
          if (
            !addToChunk(
              [...currentChunk.typingPatterns, pattern],
              "typingPatterns"
            )
          ) {
            chunks.push(currentChunk);
            currentChunk = {
              ...baseData,
              touchPatterns: [],
              typingPatterns: [pattern],
              motionPattern: [],
            };
          }
        }
      }

      // Add motion patterns
      if (sessionData.motionPattern && sessionData.motionPattern.length > 0) {
        for (const pattern of sessionData.motionPattern) {
          if (
            !addToChunk(
              [...currentChunk.motionPattern, pattern],
              "motionPattern"
            )
          ) {
            chunks.push(currentChunk);
            currentChunk = {
              ...baseData,
              touchPatterns: [],
              typingPatterns: [],
              motionPattern: [pattern],
            };
          }
        }
      }

      // Add the final chunk if it has data
      if (
        currentChunk.touchPatterns.length > 0 ||
        currentChunk.typingPatterns.length > 0 ||
        currentChunk.motionPattern.length > 0
      ) {
        chunks.push(currentChunk);
      }

      return chunks.length > 0 ? chunks : [currentChunk];
    },

    sendSessionDataToServer: async (endpoint, sessionData) => {
      try {
        // Validate session data quality first
        const validation = get().validateSessionData(sessionData);
        if (!validation.isValid) {
          console.warn(`⚠️ Skipping data send - ${validation.reason}`);
          throw new Error(`Invalid session data: ${validation.reason}`);
        }

        console.log("🔴 Sending session data with typing patterns:", {
          sessionId: sessionData.sessionId,
          typingPatternsCount: sessionData.typingPatterns?.length || 0,
          typingPatterns: sessionData.typingPatterns,
        });

        // Calculate data size
        const dataSize = get().calculateDataSize(sessionData);
        const maxSize = 15 * 1024 * 1024; // 15MB limit

        console.log(
          `📊 Session data size: ${(dataSize / 1024 / 1024).toFixed(2)}MB`
        );

        const targetEndpoint = buildApiUrl(endpoint);
        console.log("🔴 Target endpoint:", targetEndpoint);

        let responseData;

        // Check if data exceeds size limit
        if (dataSize > maxSize) {
          console.log(
            `📦 Data exceeds ${maxSize / 1024 / 1024}MB limit, chunking data...`
          );

          // Chunk the data
          const chunks = get().chunkSessionData(sessionData, maxSize);
          console.log(`📦 Split into ${chunks.length} chunks`);

          // Send chunks sequentially
          const responses = [];
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const chunkSize = get().calculateDataSize(chunk);
            console.log(
              `📦 Sending chunk ${i + 1}/${chunks.length} (${(chunkSize / 1024 / 1024).toFixed(2)}MB)`
            );

            try {
              const response = await fetch(targetEndpoint, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Session-ID": chunk.sessionId || "unknown",
                  "X-User-ID": chunk.userId || "unknown",
                  "X-Chunk-Index": i.toString(),
                  "X-Total-Chunks": chunks.length.toString(),
                  "X-Is-Chunked": "true",
                },
                body: JSON.stringify(chunk),
              });

              if (!response.ok) {
                throw new Error(
                  `HTTP ${response.status}: ${response.statusText}`
                );
              }

              const chunkResponse = await response.json();
              responses.push(chunkResponse);
              console.log(`✅ Chunk ${i + 1} sent successfully`);
            } catch (fetchError) {
              console.error(`❌ Failed to send chunk ${i + 1}:`, fetchError);
              throw new Error(
                `Failed to send chunk ${i + 1}: ${fetchError.message}`
              );
            }
          }

          responseData = {
            chunked: true,
            totalChunks: chunks.length,
            responses: responses,
            status: "success",
          };
        } else {
          // Send data as single request (under 15MB limit)
          console.log(`📤 Sending complete session data in single request`);

          try {
            const response = await fetch(targetEndpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Session-ID": sessionData.sessionId || "unknown",
                "X-User-ID": sessionData.userId || "unknown",
                "X-Is-Chunked": "false",
              },
              body: JSON.stringify(sessionData),
            });

            if (!response.ok) {
              throw new Error(
                `HTTP ${response.status}: ${response.statusText}`
              );
            }
            console.log("🔴 Response:", response);

            responseData = await response.json();
          } catch (fetchError) {
            console.error("❌ Failed to send session data:", fetchError);
            throw new Error(
              `Failed to send session data: ${fetchError.message}`
            );
          }
        }

        console.log("[SUCCESS] Session data sent successfully:", responseData);
        return responseData;
      } catch (error) {
        console.error("❌ Failed to send session data:", error);
        throw error;
      }
    },
  }))
);

// Export individual actions for easier usage
export const {
  startSession,
  clearSession,
  collectTouchEvent,
  collectKeystroke,
  startMotionCollection,
  stopMotionCollection,
  collectLocationBehavior,
  collectDeviceBehavior,
  collectNetworkBehavior,
  requestPermissions,
} = useDataCollectionStore.getState();

export default useDataCollectionStore;
