import DataCollection from "../modules/data-collection";

export interface SessionAnalytics {
  sessionDuration: number;
  touchEvents: number;
  keystrokeEvents: number;
  sessionStartTime: number;
  lastActivity: number;
}

export interface DeviceBehavior {
  isDebuggingEnabled: boolean;
  hasOverlayPermission: boolean;
  hasUnknownApps: boolean;
  accessibilityServices: string[];
  activeInputMethod: string;
  appUsagePatterns: Record<string, number>;
  hardwareAttestation: boolean;
  deviceFingerprint: Record<string, string>;
}

export interface TouchEventData {
  timestamp: number;
  x: number;
  y: number;
  pressure: number;
  size: number;
  action: number;
}

export interface KeystrokeEventData {
  timestamp: number;
  character: string;
  dwellTime: number;
  flightTime: number;
  coordinate_x: number;
  coordinate_y: number;
  pressure?: number;
}

class NativeDataCollectionService {
  private isInitialized = false;
  private sessionActive = false;
  private sessionStartTime = Date.now();
  private activeKeyPresses: Map<
    string,
    { timestamp: number; x: number; y: number; pressure?: number }
  > = new Map();
  private lastKeystrokeTimestamp = 0;

  /**
   * Initialize the native data collection service
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if the native module is available
      if (!DataCollection) {
        console.warn(
          "Native DataCollection module not available, using web fallback"
        );
        this.isInitialized = true;
        this.sessionActive = true;
        return true;
      }

      // Check permissions
      try {
        const permissions = await DataCollection.checkPermissions();
        console.log("Data collection permissions:", permissions);
      } catch (permError) {
        console.warn(
          "Permission check failed, continuing with web fallback:",
          permError
        );
      }

      // Reset any existing session
      try {
        await this.resetSession();
      } catch (resetError) {
        console.warn("Session reset failed, continuing:", resetError);
      }

      this.isInitialized = true;
      this.sessionActive = true;

      console.log("Native data collection service initialized successfully");
      return true;
    } catch (error) {
      console.error(
        "Failed to initialize native data collection service:",
        error
      );
      // Fallback to web mode
      this.isInitialized = true;
      this.sessionActive = true;
      return true;
    }
  }

  /**
   * Track keydown event - stores coordinates and timestamp
   */
  async trackKeydown(keydownData: {
    character: string;
    timestamp: number;
    x: number;
    y: number;
    pressure?: number;
  }): Promise<boolean> {
    if (!this.isInitialized || !this.sessionActive) {
      console.warn(
        "Data collection service not initialized or session inactive"
      );
      return false;
    }

    try {
      // Store keydown data for dwell time calculation
      this.activeKeyPresses.set(keydownData.character, {
        timestamp: keydownData.timestamp,
        x: keydownData.x,
        y: keydownData.y,
        pressure: keydownData.pressure,
      });

      // Call native module if available
      if (DataCollection && DataCollection.trackKeydown) {
        await DataCollection.trackKeydown(keydownData);
      }

      return true;
    } catch (error) {
      console.warn("Keydown tracking failed:", error);
      return false;
    }
  }

  /**
   * Collect touch event using native Kotlin module
   */
  async collectTouchEvent(touchData: {
    x: number;
    y: number;
    pressure: number;
    size: number;
    action: number;
  }): Promise<TouchEventData | null> {
    if (!this.isInitialized || !this.sessionActive) {
      console.warn(
        "Data collection service not initialized or session inactive"
      );
      return null;
    }

    try {
      if (DataCollection && DataCollection.collectTouchEventNative) {
        const result = await DataCollection.collectTouchEventNative(touchData);
        return result as TouchEventData;
      } else {
        // Web fallback
        return {
          timestamp: Date.now(),
          ...touchData,
        };
      }
    } catch (error) {
      console.warn("Native touch collection failed, using fallback:", error);
      // Web fallback
      return {
        timestamp: Date.now(),
        ...touchData,
      };
    }
  }

  /**
   * Collect keystroke event using native Kotlin module with simplified structure
   */
  /**
   * Collect keystroke on keyup event - calculates dwell time from stored keydown
   */
  async collectKeystroke(keystrokeData: {
    character: string;
    timestamp: number; // keyup timestamp
  }): Promise<KeystrokeEventData | null> {
    if (!this.isInitialized || !this.sessionActive) {
      console.warn(
        "Data collection service not initialized or session inactive"
      );
      return null;
    }

    try {
      // Get stored keydown data
      const keydownData = this.activeKeyPresses.get(keystrokeData.character);
      if (!keydownData) {
        console.warn(
          `No keydown data found for character: ${keystrokeData.character}`
        );
        return null;
      }

      // Calculate dwell time (keyup - keydown)
      const dwellTime = keystrokeData.timestamp - keydownData.timestamp;

      // Calculate flight time (time between this keydown and previous keyup)
      const flightTime =
        this.lastKeystrokeTimestamp > 0
          ? keydownData.timestamp - this.lastKeystrokeTimestamp
          : 0;

      // Update last keystroke timestamp
      this.lastKeystrokeTimestamp = keystrokeData.timestamp;

      // Clean up stored keydown data
      this.activeKeyPresses.delete(keystrokeData.character);

      const processedKeystrokeData = {
        character: keystrokeData.character,
        timestamp: keystrokeData.timestamp,
        dwellTime,
        flightTime,
        coordinate_x: keydownData.x,
        coordinate_y: keydownData.y,
        pressure: keydownData.pressure,
      };

      if (DataCollection && DataCollection.processKeystroke) {
        const result = await DataCollection.processKeystroke(
          processedKeystrokeData
        );
        return result as KeystrokeEventData;
      } else {
        // Web fallback - return calculated structure
        return {
          timestamp: keystrokeData.timestamp,
          character: keystrokeData.character,
          dwellTime,
          flightTime,
          coordinate_x: keydownData.x,
          coordinate_y: keydownData.y,
          pressure: keydownData.pressure,
        };
      }
    } catch (error) {
      console.warn(
        "Native keystroke collection failed, using fallback:",
        error
      );
      return null;
    }
  }

  /**
   * Get comprehensive session analytics
   */
  async getSessionAnalytics(): Promise<SessionAnalytics | null> {
    if (!this.isInitialized) {
      console.warn("Data collection service not initialized");
      return null;
    }

    try {
      if (DataCollection && DataCollection.getSessionAnalytics) {
        const analytics = await DataCollection.getSessionAnalytics();
        return analytics as SessionAnalytics;
      } else {
        // Web fallback
        const now = Date.now();
        return {
          sessionDuration: now - this.sessionStartTime,
          touchEvents: 0,
          keystrokeEvents: 0,
          sessionStartTime: this.sessionStartTime,
          lastActivity: now,
        };
      }
    } catch (error) {
      console.warn("Native session analytics failed, using fallback:", error);
      // Web fallback
      const now = Date.now();
      return {
        sessionDuration: now - this.sessionStartTime,
        touchEvents: 0,
        keystrokeEvents: 0,
        sessionStartTime: this.sessionStartTime,
        lastActivity: now,
      };
    }
  }

  /**
   * Get device behavior data
   */
  async getDeviceBehavior(): Promise<DeviceBehavior | null> {
    if (!this.isInitialized) {
      console.warn("Data collection service not initialized");
      return null;
    }

    try {
      if (DataCollection && DataCollection.getDeviceBehavior) {
        const deviceBehavior = await DataCollection.getDeviceBehavior();
        return deviceBehavior as DeviceBehavior;
      } else {
        // Web fallback
        return {
          isDebuggingEnabled: false,
          hasOverlayPermission: false,
          hasUnknownApps: false,
          accessibilityServices: [],
          activeInputMethod: "default",
          appUsagePatterns: {},
          hardwareAttestation: true,
          deviceFingerprint: {
            userAgent:
              typeof navigator !== "undefined"
                ? navigator.userAgent
                : "unknown",
            platform:
              typeof navigator !== "undefined" ? navigator.platform : "web",
            language:
              typeof navigator !== "undefined" ? navigator.language : "en",
          },
        };
      }
    } catch (error) {
      console.warn("Native device behavior failed, using fallback:", error);
      // Web fallback
      return {
        isDebuggingEnabled: false,
        hasOverlayPermission: false,
        hasUnknownApps: false,
        accessibilityServices: [],
        activeInputMethod: "default",
        appUsagePatterns: {},
        hardwareAttestation: true,
        deviceFingerprint: {
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
          platform:
            typeof navigator !== "undefined" ? navigator.platform : "web",
          language:
            typeof navigator !== "undefined" ? navigator.language : "en",
        },
      };
    }
  }

  /**
   * Reset the current session
   */
  async resetSession(): Promise<boolean> {
    try {
      if (DataCollection && DataCollection.resetSession) {
        await DataCollection.resetSession();
      }
      // Reset local session data
      this.sessionStartTime = Date.now();
      this.sessionActive = true;
      // Clear keystroke tracking data
      this.activeKeyPresses.clear();
      this.lastKeystrokeTimestamp = 0;
      console.log("Session reset successfully");
      return true;
    } catch (error) {
      console.warn("Native session reset failed, using fallback:", error);
      // Fallback: just reset local data
      this.sessionStartTime = Date.now();
      this.sessionActive = true;
      // Clear keystroke tracking data
      this.activeKeyPresses.clear();
      this.lastKeystrokeTimestamp = 0;
      console.log("Session reset successfully (fallback)");
      return true;
    }
  }

  /**
   * End the current session
   */
  async endSession(): Promise<SessionAnalytics | null> {
    if (!this.sessionActive) {
      console.warn("No active session to end");
      return null;
    }

    try {
      const finalAnalytics = await this.getSessionAnalytics();
      this.sessionActive = false;
      console.log("Session ended successfully");
      return finalAnalytics;
    } catch (error) {
      console.error("Failed to end session:", error);
      return null;
    }
  }

  /**
   * Export all collected data for analysis
   */
  async exportData(): Promise<{
    sessionAnalytics: SessionAnalytics | null;
    deviceBehavior: DeviceBehavior | null;
    exportTimestamp: number;
  }> {
    const sessionAnalytics = await this.getSessionAnalytics();
    const deviceBehavior = await this.getDeviceBehavior();

    return {
      sessionAnalytics,
      deviceBehavior,
      exportTimestamp: Date.now(),
    };
  }

  /**
   * Check if the service is properly initialized
   */
  isServiceReady(): boolean {
    return this.isInitialized && this.sessionActive;
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean;
    sessionActive: boolean;
    nativeModuleAvailable: boolean;
  } {
    return {
      initialized: this.isInitialized,
      sessionActive: this.sessionActive,
      nativeModuleAvailable: !!DataCollection,
    };
  }
}

// Export singleton instance
export const nativeDataCollectionService = new NativeDataCollectionService();
export default nativeDataCollectionService;
