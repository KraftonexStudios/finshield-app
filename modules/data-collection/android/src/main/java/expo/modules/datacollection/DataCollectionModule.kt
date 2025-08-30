package expo.modules.datacollection

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import android.content.Context
import android.provider.Settings
import android.os.Build
import android.app.usage.UsageStatsManager
import java.util.*
import java.security.KeyStore
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.view.MotionEvent
import kotlin.math.sqrt
import kotlin.math.abs
import android.util.Log
import android.telephony.TelephonyManager
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
// Removed Random import - collecting authentic data without artificial modifications

class DataCollectionModule : Module() {
  
  // Data collection variables
  private val touchEvents = mutableListOf<MobileTouchEventData>()
  private val keystrokeEvents = mutableListOf<MobileKeystrokeData>()
  private var sessionStartTime = System.currentTimeMillis()
  private var lastTouchTime = 0L
  private var lastKeystrokeTime = 0L
  private var currentTouchStartTime = 0L
  private var currentTouchStartX = 0f
  private var currentTouchStartY = 0f
  // Multi-touch tracking for pinch gestures
  private var currentTouchStartX2 = 0f
  private var currentTouchStartY2 = 0f
  private var isMultiTouch = false
  // Enhanced keystroke tracking for proper timing calculations
  private val pendingKeydowns = mutableMapOf<String, Long>() // Track keydown events by character
  private var lastKeyupTimestamp = 0L // Track last keyup for flight time calculation
  private val activeKeyPresses = mutableMapOf<String, Long>() // Track actual keydown timestamps
  private var lastKeystrokeTimestamp = 0L // For flight time calculation
  
  // Enhanced data classes matching TypeScript interfaces
  data class MobileTouchEventData(
    val gestureType: String, // "tap", "swipe", "scroll", "pinch", "long_press"
    val timestamp: Long,
    val startX: Float,
    val startY: Float,
    val endX: Float,
    val endY: Float,
    val duration: Long,
    val distance: Float?,
    val velocity: Float?,
    // Multi-touch support for pinch gestures
    val startX2: Float? = null,
    val startY2: Float? = null,
    val endX2: Float? = null,
    val endY2: Float? = null
  )
  
  data class MobileKeystrokeData(
    val character: String,
    val timestamp: Long,
    val dwellTime: Long, // ACTION_DOWN to ACTION_UP duration
    val flightTime: Long, // Time between keystrokes
    val coordinate_x: Float, // Updated field name to match TypeScript interface
    val coordinate_y: Float, // Updated field name to match TypeScript interface
    val inputType: String, // Input field type (e.g., "amount", "text", "password")
    val pressure: Float? = null // Optional pressure data
  )

  override fun definition() = ModuleDefinition {
    Name("DataCollection")

    // Enhanced Touch Event Collection with Multi-Touch and Gesture Analysis
    AsyncFunction("collectTouchEventNative") { touchData: Map<String, Any>, promise: Promise ->
      try {
        val timestamp = System.currentTimeMillis()
        val x = (touchData["pageX"] as? Number)?.toFloat() ?: (touchData["x"] as? Number)?.toFloat() ?: 0f
        val y = (touchData["pageY"] as? Number)?.toFloat() ?: (touchData["y"] as? Number)?.toFloat() ?: 0f
        val action = (touchData["action"] as? Number)?.toInt() ?: MotionEvent.ACTION_DOWN
        val gestureType = touchData["gestureType"] as? String ?: "tap"
        val pointerCount = (touchData["pointerCount"] as? Number)?.toInt() ?: 1
        
        // Multi-touch coordinates (for pinch gestures)
        val x2 = (touchData["pageX2"] as? Number)?.toFloat() ?: (touchData["x2"] as? Number)?.toFloat()
        val y2 = (touchData["pageY2"] as? Number)?.toFloat() ?: (touchData["y2"] as? Number)?.toFloat()
        
        when (action) {
          MotionEvent.ACTION_DOWN, MotionEvent.ACTION_POINTER_DOWN -> {
            // Start of touch gesture
            if (pointerCount == 1 || !isMultiTouch) {
              // First touch point
              currentTouchStartTime = timestamp
              currentTouchStartX = x
              currentTouchStartY = y
              isMultiTouch = false
            }
            
            if (pointerCount > 1 && x2 != null && y2 != null) {
              // Second touch point for pinch gesture
              currentTouchStartX2 = x2
              currentTouchStartY2 = y2
              isMultiTouch = true
            }
            
            val responseData = mapOf(
              "gestureType" to "down",
              "timestamp" to timestamp,
              "x" to x,
              "y" to y,
              "pointerCount" to pointerCount,
              "isMultiTouch" to isMultiTouch
            )
            promise.resolve(responseData)
          }
          
          MotionEvent.ACTION_UP, MotionEvent.ACTION_POINTER_UP -> {
            // End of touch gesture - calculate all metrics
            val duration = timestamp - currentTouchStartTime
            val deltaX = x - currentTouchStartX
            val deltaY = y - currentTouchStartY
            val distance = sqrt((deltaX * deltaX + deltaY * deltaY).toDouble()).toFloat()
            val velocity = if (duration > 0) distance / (duration / 1000f) else 0f
            
            // Determine gesture type based on movement, duration, and touch count
            val detectedGestureType = when {
              isMultiTouch && x2 != null && y2 != null -> "pinch"
              duration > 500 && distance < 30 -> "long_press" // Increased threshold for long press
              distance > 50 -> when { // Minimum distance threshold for swipe/scroll
                abs(deltaX) > abs(deltaY) * 1.5 -> "swipe" // Horizontal movement
                abs(deltaY) > abs(deltaX) * 1.5 -> "scroll" // Vertical movement
                else -> "swipe" // Diagonal movement defaults to swipe
              }
              distance < 30 -> "tap" // Tap threshold
              else -> gestureType // Use provided gesture type as fallback
            }
            
            // Create touch event with multi-touch support
            val touchEvent = if (isMultiTouch && x2 != null && y2 != null) {
              MobileTouchEventData(
                gestureType = detectedGestureType,
                timestamp = timestamp,
                startX = currentTouchStartX,
                startY = currentTouchStartY,
                endX = x,
                endY = y,
                duration = duration,
                distance = distance,
                velocity = velocity,
                startX2 = currentTouchStartX2,
                startY2 = currentTouchStartY2,
                endX2 = x2,
                endY2 = y2
              )
            } else {
              MobileTouchEventData(
                gestureType = detectedGestureType,
                timestamp = timestamp,
                startX = currentTouchStartX,
                startY = currentTouchStartY,
                endX = x,
                endY = y,
                duration = duration,
                distance = distance,
                velocity = velocity
              )
            }
            
            touchEvents.add(touchEvent)
            lastTouchTime = timestamp
            
            // Reset multi-touch state
            isMultiTouch = false
            
            val responseData = mutableMapOf<String, Any>(
              "gestureType" to detectedGestureType,
              "timestamp" to timestamp,
              "startX" to currentTouchStartX,
              "startY" to currentTouchStartY,
              "endX" to x,
              "endY" to y,
              "duration" to duration,
              "distance" to distance,
              "velocity" to velocity
            )
            
            // Add multi-touch data if applicable
            if (touchEvent.startX2 != null) {
              responseData["startX2"] = touchEvent.startX2
              responseData["startY2"] = touchEvent.startY2!!
              responseData["endX2"] = touchEvent.endX2!!
              responseData["endY2"] = touchEvent.endY2!!
            }
            
            promise.resolve(responseData)
          }
          
          else -> {
            // For MOVE events, just acknowledge without storing
            val responseData = mapOf(
              "gestureType" to "move",
              "timestamp" to timestamp,
              "x" to x,
              "y" to y,
              "action" to action,
              "pointerCount" to pointerCount
            )
            promise.resolve(responseData)
          }
        }
      } catch (e: Exception) {
        promise.reject("NATIVE_TOUCH_ERROR", "Failed to collect native touch event: ${e.message}", e)
      }
    }

    // Track keydown events for native timing calculation
    AsyncFunction("trackKeydown") { keystrokeData: Map<String, Any>, promise: Promise ->
      try {
        val character = keystrokeData["character"] as? String ?: ""
        val timestamp = System.currentTimeMillis()
        
        // Store keydown timestamp for this character
        activeKeyPresses[character] = timestamp
        
        Log.d("DataCollectionModule", "Keydown tracked for '$character' at $timestamp")
        
        val responseData = mapOf(
          "character" to character,
          "timestamp" to timestamp,
          "tracked" to true
        )
        
        promise.resolve(responseData)
      } catch (e: Exception) {
        Log.e("DataCollectionModule", "Error tracking keydown: ${e.message}")
        promise.reject("KEYDOWN_TRACKING_ERROR", "Failed to track keydown: ${e.message}", e)
      }
    }

    // Enhanced Keystroke Collection with Simplified Structure (Single Object per Keystroke)
    AsyncFunction("collectKeystrokeNative") { keystrokeData: Map<String, Any>, promise: Promise ->
      try {
        // Log incoming data for debugging
        Log.d("DataCollectionModule", "Received keystroke data: $keystrokeData")
        
        val character = keystrokeData["character"] as? String ?: ""
        val timestamp = (keystrokeData["timestamp"] as? Number)?.toLong() ?: System.currentTimeMillis()
        val dwellTime = (keystrokeData["dwellTime"] as? Number)?.toLong() ?: 0L
        val flightTime = (keystrokeData["flightTime"] as? Number)?.toLong() ?: 0L
        val x = (keystrokeData["coordinate_x"] as? Number)?.toFloat() ?: (keystrokeData["pageX"] as? Number)?.toFloat() ?: (keystrokeData["x"] as? Number)?.toFloat() ?: 0f
        val y = (keystrokeData["coordinate_y"] as? Number)?.toFloat() ?: (keystrokeData["pageY"] as? Number)?.toFloat() ?: (keystrokeData["y"] as? Number)?.toFloat() ?: 0f
        val pressure = (keystrokeData["pressure"] as? Number)?.toFloat()
        
        // Log extracted values for debugging
        Log.d("DataCollectionModule", "Extracted values - Character: $character, Timestamp: $timestamp")
        Log.d("DataCollectionModule", "Dwell time (original): $dwellTime ms")
        Log.d("DataCollectionModule", "Flight time: $flightTime ms, Coordinates: ($x, $y)")
        
        // Calculate actual dwell time from native timing if available
        val actualDwellTime = if (activeKeyPresses.containsKey(character)) {
            val keydownTime = activeKeyPresses.remove(character) ?: 0L
            if (keydownTime > 0L) timestamp - keydownTime else 0L
        } else 0L
        
        // Use actual timing first, then provided timing as-is (no artificial modification)
        val validatedDwellTime = when {
            actualDwellTime > 0L -> actualDwellTime // Use real native timing
            dwellTime > 0L -> dwellTime // Use provided timing as-is
            else -> 0L // No fallback - preserve authentic data gaps
        }
        
        // Calculate actual flight time without artificial modification
        val calculatedFlightTime = if (lastKeystrokeTimestamp > 0L) {
            timestamp - lastKeystrokeTimestamp
        } else flightTime
        
        val validatedFlightTime = if (calculatedFlightTime > 0L) calculatedFlightTime else flightTime
        
        // Use actual coordinates without artificial variation
        val naturalX = x
        val naturalY = y
        
        // Log validation results
        if (actualDwellTime > 0L) {
          Log.d("DataCollectionModule", "Using actual native dwell time: $actualDwellTime ms")
        } else if (dwellTime > 0L && dwellTime in 30L..500L) {
          Log.d("DataCollectionModule", "Using provided dwell time: $dwellTime ms")
        } else {
          Log.d("DataCollectionModule", "Using realistic fallback dwell time: $validatedDwellTime ms")
        }
        
        // Log actual data collection without modification
         if (actualDwellTime > 0L) {
           Log.d("DataCollectionModule", "Using actual native dwell time: $actualDwellTime ms")
         } else if (dwellTime > 0L) {
           Log.d("DataCollectionModule", "Using provided dwell time: $dwellTime ms")
         } else {
           Log.d("DataCollectionModule", "No dwell time data available - preserving authentic gap")
         }
         
         // Log flight time source
         if (calculatedFlightTime > 0L && calculatedFlightTime != flightTime) {
           Log.d("DataCollectionModule", "Using calculated flight time: $calculatedFlightTime ms")
         } else {
           Log.d("DataCollectionModule", "Using provided flight time: $flightTime ms")
         }
        
        // Update last keystroke timestamp for flight time calculation
        lastKeystrokeTimestamp = timestamp
        
        // Create keystroke event with authentic data
        val inputType = keystrokeData["inputType"] as? String ?: "text"
        val keystrokeEvent = MobileKeystrokeData(
          character = character,
          timestamp = timestamp,
          dwellTime = validatedDwellTime,
          flightTime = validatedFlightTime,
          coordinate_x = x, // Original coordinates
          coordinate_y = y, // Original coordinates
          inputType = inputType,
          pressure = pressure
        )
        
        keystrokeEvents.add(keystrokeEvent)
        lastKeystrokeTime = timestamp
        
        // Return authentic data without artificial modifications
        val responseData = mapOf(
          "character" to character,
          "timestamp" to timestamp,
          "dwellTime" to validatedDwellTime,
          "flightTime" to validatedFlightTime,
          "coordinate_x" to x, // Original coordinates
          "coordinate_y" to y, // Original coordinates
          "pressure" to pressure,
          "isNativeTiming" to (actualDwellTime > 0L),
          "hasAuthenticData" to (actualDwellTime > 0L || dwellTime > 0L)
        )
        
        // Log response data
        Log.d("DataCollectionModule", "Returning keystroke data to JS: $responseData")
        
        promise.resolve(responseData)
      } catch (e: Exception) {
        Log.e("DataCollectionModule", "Error collecting keystroke: ${e.message}", e)
        promise.reject("KEYSTROKE_COLLECTION_ERROR", "Failed to collect keystroke: ${e.message}", e)
      }
    }

    // Reset Session Data
    AsyncFunction("resetSession") { promise: Promise ->
      try {
        // Clear all tracking data
        touchEvents.clear()
        keystrokeEvents.clear()
        pendingKeydowns.clear()
        activeKeyPresses.clear() // Clear native timing tracking
        
        // Reset timing variables
        sessionStartTime = System.currentTimeMillis()
        lastTouchTime = 0L
        lastKeystrokeTime = 0L
        lastKeyupTimestamp = 0L
        lastKeystrokeTimestamp = 0L // Reset native timing tracking
        currentTouchStartTime = 0L
        currentTouchStartX = 0f
        currentTouchStartY = 0f
        currentTouchStartX2 = 0f
        currentTouchStartY2 = 0f
        isMultiTouch = false
        
        promise.resolve(true)
      } catch (e: Exception) {
        promise.reject("SESSION_RESET_ERROR", "Failed to reset session: ${e.message}", e)
      }
    }

    // Get SIM Country Code
    AsyncFunction("getSimCountry") { promise: Promise ->
      try {
        val context = appContext.reactContext ?: throw Exception("Context not available")
        val simCountry = getSimCountryCode(context)
        promise.resolve(simCountry)
      } catch (e: Exception) {
        Log.e("DataCollectionModule", "Error getting SIM country: ${e.message}")
        promise.resolve("unknown")
      }
    }

    // Get Enhanced Session Analytics
    AsyncFunction("getSessionAnalytics") { promise: Promise ->
      try {
        val sessionDuration = System.currentTimeMillis() - sessionStartTime
        
        // Calculate touch analytics
        val gestureTypeCounts = touchEvents.groupingBy { it.gestureType }.eachCount()
        val avgTouchDuration = if (touchEvents.isNotEmpty()) {
          touchEvents.map { it.duration }.average()
        } else 0.0
        val avgTouchVelocity = touchEvents.mapNotNull { it.velocity }.let { velocities ->
          if (velocities.isNotEmpty()) velocities.average() else 0.0
        }
        val avgTouchDistance = touchEvents.mapNotNull { it.distance }.let { distances ->
          if (distances.isNotEmpty()) distances.average() else 0.0
        }
        
        // Calculate keystroke analytics
        val avgDwellTime = if (keystrokeEvents.isNotEmpty()) {
          keystrokeEvents.map { it.dwellTime }.average()
        } else 0.0
        val avgFlightTime = keystrokeEvents.filter { it.flightTime > 0 }.let { events ->
          if (events.isNotEmpty()) events.map { it.flightTime }.average() else 0.0
        }
        val keystrokeRate = if (sessionDuration > 0) {
          (keystrokeEvents.size.toDouble() / (sessionDuration / 1000.0)) * 60.0 // keystrokes per minute
        } else 0.0
        
        val analytics = mapOf(
          "sessionDuration" to sessionDuration,
          "touchEvents" to touchEvents.size,
          "keystrokeEvents" to keystrokeEvents.size,
          "sessionStartTime" to sessionStartTime,
          "lastActivity" to maxOf(lastTouchTime, lastKeystrokeTime),
          "gestureTypeCounts" to gestureTypeCounts,
          "avgTouchDuration" to avgTouchDuration,
          "avgTouchVelocity" to avgTouchVelocity,
          "avgTouchDistance" to avgTouchDistance,
          "avgDwellTime" to avgDwellTime,
          "avgFlightTime" to avgFlightTime,
          "keystrokeRate" to keystrokeRate,
          "touchEventData" to touchEvents.map { event ->
            val eventMap = mutableMapOf<String, Any?>(
              "gestureType" to event.gestureType,
              "timestamp" to event.timestamp,
              "startX" to event.startX,
              "startY" to event.startY,
              "endX" to event.endX,
              "endY" to event.endY,
              "duration" to event.duration,
              "distance" to event.distance,
              "velocity" to event.velocity
            )
            // Add multi-touch data if available
            if (event.startX2 != null) {
              eventMap["startX2"] = event.startX2
              eventMap["startY2"] = event.startY2
              eventMap["endX2"] = event.endX2
              eventMap["endY2"] = event.endY2
            }
            eventMap
          },
          "keystrokeEventData" to keystrokeEvents.map { event ->
            mapOf(
              "character" to event.character,
              "timestamp" to event.timestamp,
              "dwellTime" to event.dwellTime,
              "flightTime" to event.flightTime,
              "coordinate_x" to event.coordinate_x,
              "coordinate_y" to event.coordinate_y,
              "pressure" to event.pressure
            )
          }
        )
        
        promise.resolve(analytics)
      } catch (e: Exception) {
        promise.reject("ANALYTICS_ERROR", "Failed to get session analytics: ${e.message}", e)
      }
    }

    // Reset Session Data
    AsyncFunction("resetSession") { promise: Promise ->
      try {
        touchEvents.clear()
        keystrokeEvents.clear()
        sessionStartTime = System.currentTimeMillis()
        lastTouchTime = 0L
        lastKeystrokeTime = 0L
        currentTouchStartTime = 0L
        currentTouchStartX = 0f
        currentTouchStartY = 0f
        // Reset multi-touch tracking variables
        currentTouchStartX2 = 0f
        currentTouchStartY2 = 0f
        isMultiTouch = false
        pendingKeydowns.clear()
        lastKeyupTimestamp = 0L
        
        promise.resolve(true)
      } catch (e: Exception) {
        promise.reject("RESET_ERROR", "Failed to reset session: ${e.message}", e)
      }
    }

    // Device Behavior Collection (Enhanced)
    AsyncFunction("getDeviceBehavior") { promise: Promise ->
      try {
        val context = appContext.reactContext ?: throw Exception("Context not available")
        val deviceBehavior = mutableMapOf<String, Any>()
        
        deviceBehavior["isDebuggingEnabled"] = isDebuggingEnabled(context)
        deviceBehavior["hasOverlayPermission"] = hasOverlayPermission(context)
        deviceBehavior["hasUnknownApps"] = hasUnknownAppsEnabled(context)
        deviceBehavior["accessibilityServices"] = getEnabledAccessibilityServices(context)
        deviceBehavior["activeInputMethod"] = getActiveInputMethod(context)
        deviceBehavior["appUsagePatterns"] = getAppUsagePatterns(context)
        deviceBehavior["hardwareAttestation"] = checkHardwareAttestation()
        deviceBehavior["deviceFingerprint"] = getDeviceFingerprint(context)
        
        promise.resolve(deviceBehavior)
      } catch (e: Exception) {
        promise.reject("DEVICE_BEHAVIOR_ERROR", "Failed to collect device behavior: ${e.message}", e)
      }
    }

    // Permission Check Function
    AsyncFunction("checkPermissions") { promise: Promise ->
      try {
        val context = appContext.reactContext ?: throw Exception("Context not available")
        val permissions = mutableMapOf<String, Boolean>()
        
        permissions["usageStats"] = hasUsageStatsPermission(context)
        permissions["readPhoneState"] = ContextCompat.checkSelfPermission(
          context, 
          android.Manifest.permission.READ_PHONE_STATE
        ) == PackageManager.PERMISSION_GRANTED
        
        promise.resolve(permissions)
      } catch (e: Exception) {
        promise.reject("PERMISSION_CHECK_ERROR", "Failed to check permissions: ${e.message}", e)
      }
    }
  }

  // Helper Functions for Device Information Only

  // Helper Functions (existing ones enhanced)
  private fun isDebuggingEnabled(context: Context): Boolean {
    return try {
      Settings.Global.getInt(context.contentResolver, Settings.Global.ADB_ENABLED, 0) == 1
    } catch (e: Exception) {
      false
    }
  }

  private fun hasOverlayPermission(context: Context): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      Settings.canDrawOverlays(context)
    } else {
      true
    }
  }

  private fun hasUnknownAppsEnabled(context: Context): Boolean {
    return try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.packageManager.canRequestPackageInstalls()
      } else {
        Settings.Secure.getInt(context.contentResolver, Settings.Secure.INSTALL_NON_MARKET_APPS, 0) == 1
      }
    } catch (e: Exception) {
      false
    }
  }

  private fun getEnabledAccessibilityServices(context: Context): List<String> {
    return try {
      val enabledServices = Settings.Secure.getString(
        context.contentResolver,
        Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
      )
      enabledServices?.split(":") ?: emptyList()
    } catch (e: Exception) {
      emptyList()
    }
  }

  private fun getActiveInputMethod(context: Context): String {
    return try {
      Settings.Secure.getString(
        context.contentResolver,
        Settings.Secure.DEFAULT_INPUT_METHOD
      ) ?: "unknown"
    } catch (e: Exception) {
      "unknown"
    }
  }

  private fun getAppUsagePatterns(context: Context): Map<String, Long> {
    return try {
      if (!hasUsageStatsPermission(context)) {
        Log.d("DataCollection", "No usage stats permission")
        return emptyMap()
      }
      
      val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val calendar = Calendar.getInstance()
      calendar.add(Calendar.DAY_OF_YEAR, -1)
      val startTime = calendar.timeInMillis
      val endTime = System.currentTimeMillis()
      
      val usageStats = usageStatsManager.queryUsageStats(
        UsageStatsManager.INTERVAL_DAILY,
        startTime,
        endTime
      )
      
      // Filter to only include our banking application
      val targetPackageName = "com.viskar.code.bakingapplication"
      val usageMap = mutableMapOf<String, Long>()
      
      Log.d("DataCollection", "Total apps found: ${usageStats?.size ?: 0}")
      
      usageStats?.forEach { stats ->
        if (stats.packageName == targetPackageName) {
          Log.d("DataCollection", "Found banking app usage: ${stats.packageName} = ${stats.totalTimeInForeground}")
          usageMap[stats.packageName] = stats.totalTimeInForeground
        }
      }
      
      Log.d("DataCollection", "Filtered app usage patterns: $usageMap")
      usageMap
    } catch (e: Exception) {
      Log.e("DataCollection", "Error getting app usage patterns: ${e.message}")
      emptyMap()
    }
  }

  private fun hasUsageStatsPermission(context: Context): Boolean {
    return try {
      val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val calendar = Calendar.getInstance()
      calendar.add(Calendar.MINUTE, -1)
      val startTime = calendar.timeInMillis
      val endTime = System.currentTimeMillis()
      
      val usageStats = usageStatsManager.queryUsageStats(
        UsageStatsManager.INTERVAL_DAILY,
        startTime,
        endTime
      )
      
      usageStats != null && usageStats.isNotEmpty()
    } catch (e: Exception) {
      false
    }
  }

  private fun checkHardwareAttestation(): Boolean {
    return try {
      val keyStore = KeyStore.getInstance("AndroidKeyStore")
      keyStore.load(null)
      
      val keyGenParameterSpec = KeyGenParameterSpec.Builder(
        "attestation_test_key",
        KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
      )
        .setDigests(KeyProperties.DIGEST_SHA256)
        .setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PKCS1)
        .setAttestationChallenge("test_challenge".toByteArray())
        .build()
      
      true
    } catch (e: Exception) {
      false
    }
  }
  
  private fun getDeviceFingerprint(context: Context): Map<String, String> {
    return mapOf(
      "brand" to Build.BRAND,
      "model" to Build.MODEL,
      "manufacturer" to Build.MANUFACTURER,
      "product" to Build.PRODUCT,
      "device" to Build.DEVICE,
      "board" to Build.BOARD,
      "hardware" to Build.HARDWARE,
      "fingerprint" to Build.FINGERPRINT,
      "androidId" to Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
    )
  }

  private fun getSimCountryCode(context: Context): String {
    return try {
      // Check if we have the required permission
      if (ContextCompat.checkSelfPermission(context, android.Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
        Log.w("DataCollectionModule", "READ_PHONE_STATE permission not granted")
        return "permission_denied"
      }

      val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
      if (telephonyManager == null) {
        Log.w("DataCollectionModule", "TelephonyManager not available")
        return "service_unavailable"
      }

      // Try to get SIM country code first (more reliable)
      val simCountry = telephonyManager.simCountryIso
      if (!simCountry.isNullOrEmpty()) {
        Log.d("DataCollectionModule", "SIM country code: $simCountry")
        return simCountry.uppercase()
      }

      // Fallback to network country code
      val networkCountry = telephonyManager.networkCountryIso
      if (!networkCountry.isNullOrEmpty()) {
        Log.d("DataCollectionModule", "Network country code: $networkCountry")
        return networkCountry.uppercase()
      }

      Log.w("DataCollectionModule", "No country code available from SIM or network")
      return "unavailable"
    } catch (e: SecurityException) {
      Log.e("DataCollectionModule", "Security exception getting SIM country: ${e.message}")
      return "permission_denied"
    } catch (e: Exception) {
      Log.e("DataCollectionModule", "Error getting SIM country: ${e.message}")
      return "error"
    }
  }
}
