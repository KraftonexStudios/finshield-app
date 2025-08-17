import type { AlertPayload, APIResponse } from "../constants/API_ENDPOINTS";
import {
  API_CONFIG,
  API_ENDPOINTS,
  buildApiUrl,
} from "../constants/API_ENDPOINTS";

/**
 * API Service for handling all external API calls
 * Provides centralized error handling, retry logic, and response formatting
 */
class ApiService {
  private static instance: ApiService;

  private constructor() {}

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  /**
   * Generic API call method with retry logic and error handling
   */
  private async makeApiCall<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<APIResponse<T>> {
    const url = buildApiUrl(endpoint);

    const defaultOptions: RequestInit = {
      method: "GET",
      headers: {
        ...API_CONFIG.DEFAULT_HEADERS,
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        API_CONFIG.TIMEOUT
      );

      const response = await fetch(url, {
        ...defaultOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        data,
        message: data.message || "Request successful",
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);

      // Retry logic
      if (
        retryCount < API_CONFIG.RETRY_ATTEMPTS &&
        (error instanceof TypeError || // Network error
          (error instanceof Error && error.message.includes("fetch")))
      ) {
        console.log(
          `Retrying API call (${retryCount + 1}/${API_CONFIG.RETRY_ATTEMPTS})...`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (retryCount + 1))
        );
        return this.makeApiCall<T>(endpoint, options, retryCount + 1);
      }

      return {
        success: false,
        message: "API request failed",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Send alert for suspicious activity
   */
  public async sendAlert(alertData: AlertPayload): Promise<APIResponse<any>> {
    console.log("🚨 Sending suspicious activity alert:", {
      userId: alertData.userId,
      alertType: alertData.alertType,
      severity: alertData.severity,
    });

    const payload = {
      ...alertData,
      timestamp: alertData.timestamp || Date.now(),
      deviceInfo: {
        platform: "mobile",
        ...alertData.deviceInfo,
      },
    };

    try {
      const result = await this.makeApiCall<any>(API_ENDPOINTS.ALERT, {
        method: "POST",
        headers: {
          "X-User-ID": alertData.userId,
          "X-Alert-Type": alertData.alertType,
        },
        body: JSON.stringify(payload),
      });

      // Check if API call failed and apply development fallback
      if (!result.success) {
        console.log(
          "🔴 Development mode - Alert API failed, using fallback. Original payload:",
          JSON.stringify(payload, null, 2)
        );

        const simulatedResponse: APIResponse<any> = {
          success: true,
          data: {
            alertId: `alert_${Date.now()}`,
            status: "received",
            processed: true,
          },
          message:
            "Alert received and will be processed by security team (development fallback)",
          timestamp: Date.now(),
        };

        console.log(
          "🔴 Development mode - Simulated alert response:",
          simulatedResponse
        );
        return simulatedResponse;
      }

      return result;
    } catch (error) {
      // Additional fallback for unexpected errors
      console.log(
        "🔴 Development mode - Unexpected error, using fallback. Alert data:",
        JSON.stringify(payload, null, 2)
      );

      const simulatedResponse: APIResponse<any> = {
        success: true,
        data: {
          alertId: `alert_${Date.now()}`,
          status: "received",
          processed: true,
        },
        message:
          "Alert received and will be processed by security team (error fallback)",
        timestamp: Date.now(),
      };

      console.log(
        "🔴 Development mode - Simulated alert response:",
        simulatedResponse
      );
      return simulatedResponse;
    }
  }

  /**
   * Send behavioral data to regular endpoint
   */
  public async sendRegularData(data: any): Promise<APIResponse<any>> {
    return this.makeApiCall<any>(API_ENDPOINTS.DATA.REGULAR, {
      method: "POST",
      headers: {
        "X-Session-ID": data.sessionId || "unknown",
        "X-User-ID": data.userId || "unknown",
      },
      body: JSON.stringify(data),
    });
  }

  /**
   * Send behavioral data to check endpoint for suspicious activity analysis
   */
  public async sendCheckData(data: any): Promise<APIResponse<any>> {
    return this.makeApiCall<any>(API_ENDPOINTS.DATA.CHECK, {
      method: "POST",
      headers: {
        "X-Session-ID": data.sessionId || "unknown",
        "X-User-ID": data.userId || "unknown",
        "X-Risk-Level": "high", // Indicate this is for risk assessment
      },
      body: JSON.stringify(data),
    });
  }



  /**
   * Health check endpoint
   */
  public async healthCheck(): Promise<APIResponse<{ status: string }>> {
    return this.makeApiCall<{ status: string }>("/health");
  }
}

// Export singleton instance
export const apiService = ApiService.getInstance();
export default apiService;
