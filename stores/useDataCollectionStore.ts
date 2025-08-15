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

// Import types
import type {
  BehavioralSession,
  DeviceBehavior,
  LocationBehavior,
  LoginBehavior,
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
  checkPermissions(): Promise<{ [key: string]: boolean }>;
}

// Import the native module
let BehavioralDataCollectorModule: BehavioralDataCollector | null = null;
try {
  BehavioralDataCollectorModule = requireNativeModule("DataCollection");
} catch (error) {}

// Debouncing utility for state updates
let updateTimeout: NodeJS.Timeout | null = null;

interface DataCollectionState {
  // Session Management
  currentSession: BehavioralSession | null;
  isCollecting: boolean;
  sessionId: string | null;
  userId: string | null;
  collectionScenario:
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
  currentInputType: string | null;

  // Data Collections
  touchEvents: MobileTouchEvent[];
  keystrokes: MobileKeystroke[];
  motionEvents: MobileMotionEvents[];
  motionPatterns: MotionPattern[];
  touchGestures: TouchGesture[];
  typingPatterns: TypingPattern[];

  // Behavioral Data
  loginBehavior: LoginBehavior | null;
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
  endSession: () => Promise<BehavioralSession | null>;
  clearSession: () => void;
  startDataCollection: (
    scenario: "first-time-registration" | "re-registration" | "login"
  ) => Promise<void>;
  stopDataCollection: () => Promise<void>;
  handleAppStateChange: (nextAppState: string) => Promise<void>;
  sendDataAndWaitForResponse: (endpoint: string) => Promise<boolean>;

  // Data Collection Actions
  collectTouchEvent: (event: Partial<MobileTouchEvent>) => Promise<void>;
  collectKeystroke: (event: Partial<MobileKeystroke>) => Promise<void>;
  generateTypingPatternForInputType: (inputType: string) => void;
  startMotionCollection: () => Promise<void>;
  stopMotionCollection: () => void;
  collectLoginBehavior: (behavior: Partial<LoginBehavior>) => Promise<void>;
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
  sendDataToServer: (endpoint: string) => Promise<void>;
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
    currentInputType: null,
    touchEvents: [],
    keystrokes: [],
    motionEvents: [],
    motionPatterns: [],
    touchGestures: [],
    typingPatterns: [],
    loginBehavior: null,
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
          loginBehavior: get().loginBehavior || {
            timestamp,
            loginFlow: "pin",
            biometricOutcome: "not_available",
            biometricType: "none",
          },
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

    // Optimized Data Collection Management with batching
    startDataCollection: async (scenario) => {
      try {
        const state = get();

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

        // Initialize login behavior with default values
        await get().collectLoginBehavior({
          loginFlow: scenario === "login" ? "pin" : "pin",
          biometricOutcome: "not_available",
          biometricType: "none",
          failedAttempts: 0,
        });

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

    sendDataAndWaitForResponse: async (endpoint) => {
      try {
        set({ isWaitingForResponse: true });

        await get().sendDataToServer(endpoint);

        // Reduced delay for better performance
        await new Promise((resolve) => setTimeout(resolve, 500));

        set({
          isWaitingForResponse: false,
          lastDataSent: Date.now(),
        });

        // Removed data send success logging
        return true;
      } catch (error) {
        set({
          isWaitingForResponse: false,
          collectionErrors: [...get().collectionErrors, "Failed to send data"],
        });
        return false;
      }
    },

    endSession: async () => {
      console.log("🔴 endSession called - starting session termination");
      try {
        const state = get();
        if (!state.currentSession || state.isEndingSession) {
          console.log("🔴 endSession early return:", {
            hasCurrentSession: !!state.currentSession,
            isCollecting: state.isCollecting,
            isEndingSession: state.isEndingSession,
          });
          // Session already ended or currently ending
          return null;
        }

        // Set flag to prevent multiple simultaneous calls
        set({ isEndingSession: true });
        console.log("🔴 endSession proceeding with session termination");

        // Generate typing pattern for current input type before ending session
        if (state.currentInputType && state.keystrokes.length > 0) {
          get().generateTypingPatternForInputType(state.currentInputType);
        }

        get().stopMotionCollection();

        // Generate final touch pattern from remaining touch events if any
        let finalTouchPatterns = [...state.touchGestures];
        if (state.touchEvents.length > 0) {
          // Create a final pattern from any remaining touch events
          const remainingTouchPattern: TouchGesture = {
            touches: state.touchEvents,
          };
          finalTouchPatterns.push(remainingTouchPattern);
        }

        const finalSession: BehavioralSession = {
          sessionId: state.currentSession.sessionId,
          userId: state.currentSession.userId,
          timestamp: state.currentSession.timestamp,
          touchPatterns: finalTouchPatterns, //done
          typingPatterns: state.typingPatterns, //need work
          motionPattern: state.motionPatterns, //done
          loginBehavior: state.currentSession.loginBehavior, //done
          locationBehavior: state.currentSession.locationBehavior, //done
          networkBehavior: state.currentSession.networkBehavior, // almost done but sim country
          deviceBehavior: state.currentSession.deviceBehavior, //it's truly good but just need to filter our app data
        };

        console.log(
          "🔴 Session end debug - Complete session analysis:",
          finalSession.deviceBehavior
        );

        try {
          await get().sendDataToServer("/api/session-data");
        } catch (serverError) {
          // Session should still end even if server send fails
          console.log(
            "Server send failed (expected in development):",
            serverError.message
          );
        }

        set({
          currentSession: null,
          isCollecting: false,
          sessionId: null,
          sessionEndTime: Date.now(),
          staticDataCollected: false,
          isEndingSession: false,
          lastTouchEventTime: 0,
          lastKeystrokeTime: 0,
          currentInputType: null,
          touchEvents: [],
          keystrokes: [],
          motionEvents: [],
          motionPatterns: [],
          touchGestures: [],
          typingPatterns: [],
        });

        return finalSession;
      } catch (error) {
        set((state) => ({
          errors: {
            ...state.errors,
            session: "Failed to end data collection session",
          },
          isEndingSession: false, // Reset flag on error
        }));
        return null;
      }
    },

    clearSession: () => {
      get().stopMotionCollection();
      set({
        currentSession: null,
        isCollecting: false,
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
        currentInputType: null,
        touchEvents: [],
        keystrokes: [],
        motionEvents: [],
        motionPatterns: [],
        touchGestures: [],
        typingPatterns: [],
        loginBehavior: null,
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
        // Throttle touch events to avoid overwhelming data (max 10 events per second)
        if (timestamp - state.lastTouchEventTime < 100) {
          return;
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

        // Store touch events immediately without debouncing to ensure they're captured
        set((state) => {
          const newTouchEvents =
            state.touchEvents.length >= 100
              ? [...state.touchEvents.slice(-49), touchEvent] // Keep last 50 events when at limit
              : [...state.touchEvents, touchEvent];

          // Generate touch pattern in real-time (every 3 touch events for more frequent patterns)
          let newTouchGestures = state.touchGestures;
          if (newTouchEvents.length % 3 === 0 && newTouchEvents.length > 0) {
            // Create a new TouchGesture with recent touch events
            const recentTouchEvents = newTouchEvents.slice(-5); // Use last 5 touch events
            const touchGesture: TouchGesture = {
              touches: recentTouchEvents,
            };

            console.log("🔵 Generated touch pattern in real-time:", {
              touchCount: recentTouchEvents.length,
              gestureTypes: recentTouchEvents.map((t) => t.gestureType),
              averageVelocity: (
                recentTouchEvents.reduce(
                  (sum, t) => sum + (t.velocity || 0),
                  0
                ) / recentTouchEvents.length
              ).toFixed(2),
              totalPatterns: state.touchGestures.length + 1,
              patternTimestamp: new Date().toLocaleTimeString(),
            });

            newTouchGestures = [
              ...state.touchGestures.slice(-9), // Keep last 10 patterns
              touchGesture,
            ];
          }

          return {
            touchEvents: newTouchEvents,
            touchGestures: newTouchGestures,
            lastTouchEventTime: timestamp,
          };
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
        if (!state.isCollecting) return;

        const timestamp = Date.now();
        // Throttle keystrokes to avoid overwhelming data (max 20 events per second)
        if (timestamp - state.lastKeystrokeTime < 50) {
          return;
        }
        const previousKeystroke = state.keystrokes[state.keystrokes.length - 1];

        let keystroke: MobileKeystroke = {
          character: event.character || "",
          timestamp,
          dwellTime: event.dwellTime || 0,
          flightTime: previousKeystroke
            ? timestamp - previousKeystroke.timestamp
            : 0,
          x: event.x || 0,
          y: event.y || 0,
          action: event.action || "up",
          inputType: event.inputType || "text",
        };

        // Try to get enhanced data from native module with action for authentic dwell time
        if (BehavioralDataCollectorModule) {
          try {
            const enhancedData =
              await BehavioralDataCollectorModule.collectKeystroke({
                character: keystroke.character,
                timestamp: keystroke.timestamp,
                action: event.action || "up",
                pageX: event.x || 0,
                pageY: event.y || 0,
                x: event.x || 0,
                y: event.y || 0,
              });
            // Use native module's authentic dwell time calculation
            keystroke = { ...keystroke, ...enhancedData };
          } catch (nativeError) {
            // Fallback to provided dwell time if native module fails
          }
        }

        // Check if input type has changed and generate pattern for previous input type
        const currentInputType = keystroke.inputType;
        const previousInputType = get().currentInputType;

        if (previousInputType && previousInputType !== currentInputType) {
          // Generate typing pattern for the previous input type before switching
          get().generateTypingPatternForInputType(previousInputType);
        }

        // Store keystrokes immediately without debouncing to ensure they're captured
        set((state) => {
          const newKeystrokes =
            state.keystrokes.length >= 100
              ? [...state.keystrokes.slice(-49), keystroke] // Keep last 50 events when at limit
              : [...state.keystrokes, keystroke];

          // Generate typing pattern if we have enough keystrokes (every 10 keystrokes)
          if (newKeystrokes.length % 10 === 0) {
            // Determine input type from recent keystrokes
            const recentKeystrokes = newKeystrokes.slice(-20);
            const inputType =
              recentKeystrokes.length > 0 &&
              recentKeystrokes[recentKeystrokes.length - 1].inputType
                ? recentKeystrokes[recentKeystrokes.length - 1].inputType
                : "text";

            const typingPattern: TypingPattern = {
              inputType,
              keystrokes: recentKeystrokes,
            };

            console.log("Generated typing pattern (10 keystrokes):", {
              inputType,
              keystrokeCount: recentKeystrokes.length,
              hasInputType:
                !!recentKeystrokes[recentKeystrokes.length - 1]?.inputType,
            });

            return {
              keystrokes: newKeystrokes,
              lastKeystrokeTime: timestamp,
              currentInputType: currentInputType,
              typingPatterns: [
                ...state.typingPatterns.slice(-9),
                typingPattern,
              ], // Keep last 10 patterns
            };
          }

          return {
            keystrokes: newKeystrokes,
            lastKeystrokeTime: timestamp,
            currentInputType: currentInputType,
          };
        });
      } catch (error) {
        set((state) => ({
          errors: {
            ...state.errors,
            keystroke: "Failed to collect keystroke",
          },
        }));
      }
    },

    // Generate typing pattern for specific input type when switching fields
    generateTypingPatternForInputType: (inputType) => {
      const state = get();
      if (!state.isCollecting) return;

      // Filter keystrokes for the specific input type
      const inputTypeKeystrokes = state.keystrokes.filter(
        (keystroke) => keystroke.inputType === inputType
      );

      // Only generate pattern if we have enough keystrokes for this input type
      if (inputTypeKeystrokes.length >= 5) {
        const typingPattern: TypingPattern = {
          inputType,
          keystrokes: inputTypeKeystrokes.slice(-20), // Use last 20 keystrokes for this input type
        };

        console.log(`Generated typing pattern for ${inputType}:`, {
          inputType,
          keystrokeCount: inputTypeKeystrokes.length,
          patternKeystrokeCount: typingPattern.keystrokes.length,
        });

        set((state) => ({
          typingPatterns: [...state.typingPatterns.slice(-9), typingPattern], // Keep last 10 patterns
        }));
      }
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

        // Reduce update interval to 10Hz (100ms) for better performance
        Accelerometer.setUpdateInterval(100);
        Gyroscope.setUpdateInterval(100);
        Magnetometer.setUpdateInterval(100);

        // Use circular buffer for efficient memory management
        let motionBuffer: MobileMotionEvents[] = new Array(50).fill(null);
        let bufferIndex = 0;
        let lastUpdateTime = 0;
        const THROTTLE_MS = 100; // Throttle updates to 10Hz

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

          // Update state less frequently to reduce re-renders with debouncing
          if (bufferIndex % 10 === 0) {
            const validEvents = motionBuffer.filter((event) => event !== null);
            const updateMotionEvents = () => {
              set((state) => ({
                motionEvents: validEvents,
              }));
            };

            // Debounce motion state updates
            if (updateTimeout) {
              clearTimeout(updateTimeout);
            }
            updateTimeout = setTimeout(updateMotionEvents, 100);
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

        // Create motion patterns every 10 seconds (less frequent)
        const patternInterval = setInterval(() => {
          const validEvents = motionBuffer.filter((event) => event !== null);
          if (validEvents.length > 0) {
            const pattern: MotionPattern = {
              samples: validEvents.slice(), // Copy the valid events
              duration: 10000,
              sampleRateHz: 10, // Updated sample rate
            };
            set((state) => {
              const newPatterns = [...state.motionPatterns.slice(-9), pattern]; // Keep last 10 patterns

              // Removed motion pattern logging

              return {
                motionPatterns: newPatterns,
              };
            });
            // Reset buffer
            motionBuffer = new Array(50).fill(null);
            bufferIndex = 0;
          }
        }, 10000);

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

    // Login Behavior Collection
    collectLoginBehavior: async (behavior) => {
      try {
        const timestamp = Date.now();

        // Get biometric info
        let biometricType: "fingerprint" | "face_id" | "none" = "none";
        let biometricOutcome:
          | "success"
          | "failure"
          | "not_available"
          | "user_cancelled" = "not_available";

        try {
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          if (hasHardware) {
            const supportedTypes =
              await LocalAuthentication.supportedAuthenticationTypesAsync();
            if (
              supportedTypes.includes(
                LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
              )
            ) {
              biometricType = "face_id";
            } else if (
              supportedTypes.includes(
                LocalAuthentication.AuthenticationType.FINGERPRINT
              )
            ) {
              biometricType = "fingerprint";
            }
          }
        } catch (error) {}

        const loginBehavior: LoginBehavior = {
          timestamp,
          loginFlow: behavior.loginFlow || "pin",
          biometricOutcome: behavior.biometricOutcome || biometricOutcome,
          biometricType: behavior.biometricType || biometricType,
          loginError: behavior.loginError,
        };

        set({ loginBehavior });
      } catch (error) {
        set((state) => ({
          errors: {
            ...state.errors,
            login: "Failed to collect login behavior",
          },
        }));
      }
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

          // SIM data collection simplified (without external dependencies)
          networkBehavior.simSerial = "unknown";
          networkBehavior.simOperator = carrier || "unknown";
          networkBehavior.simCountry = "unknown";

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

    sendDataToServer: async (endpoint) => {
      try {
        const state = get();

        const sessionData = {
          sessionId: state.sessionId,
          userId: state.userId,
          scenario: state.collectionScenario,
          touchEvents: state.touchEvents,
          keystrokes: state.keystrokes,
          motionPatterns: state.motionPatterns,
          loginBehavior: state.loginBehavior,
          locationBehavior: state.locationBehavior,
          deviceBehavior: state.deviceBehavior,
          networkBehavior: state.networkBehavior,
          timestamp: Date.now(),
        };

        // Determine endpoint based on scenario and data analysis
        let targetEndpoint = endpoint;
        if (!endpoint.includes("/check") && !endpoint.includes("/regular")) {
          // Auto-determine endpoint based on data patterns
          const suspiciousPatterns = {
            rapidTouches: state.touchEvents.filter(
              (t) => t.velocity && t.velocity > 1000
            ).length,
            unusualMotion: state.motionPatterns.filter(
              (p) => p.samples.length > 300
            ).length,
            multipleFailedAttempts: state.loginBehavior?.failedAttempts || 0,
          };

          const isSuspicious =
            suspiciousPatterns.rapidTouches > 10 ||
            suspiciousPatterns.unusualMotion > 3 ||
            suspiciousPatterns.multipleFailedAttempts > 2;

          targetEndpoint = isSuspicious
            ? `${endpoint}/check`
            : `${endpoint}/regular`;
        }

        // Removed data collection summary logging

        // Real API call implementation with development fallback
        let responseData;
        try {
          const response = await fetch(targetEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Session-ID": sessionData.sessionId || "unknown",
              "X-User-ID": sessionData.userId || "unknown",
            },
            body: JSON.stringify(sessionData),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          responseData = await response.json();
        } catch (fetchError) {
          // Development mode fallback - simulate successful response
          console.log(
            "API endpoint not available, using mock response for development"
          );
          responseData = {
            success: true,
            sessionId: sessionData.sessionId,
            timestamp: Date.now(),
            message: "Data received (mock response)",
          };
        }
        // Removed server response logging

        set({ lastDataSent: Date.now() });
        return responseData;
      } catch (error) {
        set((state) => ({
          collectionErrors: [
            ...state.collectionErrors,
            `Failed to send data to server: ${error.message}`,
          ],
          errors: {
            ...state.errors,
            server: `Failed to send data to server: ${error.message}`,
          },
        }));
        throw error;
      }
    },
  }))
);

// Export individual actions for easier usage
export const {
  startSession,
  endSession,
  clearSession,
  collectTouchEvent,
  collectKeystroke,
  startMotionCollection,
  stopMotionCollection,
  collectLoginBehavior,
  collectLocationBehavior,
  collectDeviceBehavior,
  collectNetworkBehavior,
  requestPermissions,
} = useDataCollectionStore.getState();

export default useDataCollectionStore;
