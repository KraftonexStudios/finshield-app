import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { firebaseService } from "../services/firebaseService";
import { secureStorage } from "../utils/secureStorage";

// User interface based on Firebase data
export interface User {
  uid: string;
  fullName: string;
  mobile: string;
  emailId: string;
  age: number;
  gender: string;
  profile?: string;
  // Bank Details
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  accountType: string;
  balance: number;
  // Security
  recoveryQuestions: {
    question: string;
    answerHash: string;
  }[];
  biometricEnabled: boolean;
  biometricType?: "face" | "fingerprint";
  // Metadata
  isActive: boolean;
  lastLoginAt?: any;
}

export interface Transaction {
  id?: string;
  fromUserId: string;
  toUserId?: string;
  fromMobile: string;
  toMobile?: string;
  type: "credit" | "debit" | "transfer";
  amount: number;
  description: string;
  note?: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  reference: string;
  createdAt: any;
  updatedAt: any;
  category?: "transfer" | "bill_payment" | "recharge" | "qr_payment";
  recipient?: {
    name: string;
    mobile: string;
    accountNumber?: string;
  };
}

export interface AuthState {
  // User data
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  onboardingComplete: boolean;
  transactions: Transaction[];
  error: string | null;

  // Onboarding flow state
  onboardingStep:
    | "get-started"
    | "permissions"
    | "mobile-input"
    | "otp-verification"
    | "pin-setup"
    | "security-questions"
    | "biometric-setup"
    | "completed";
  mobileNumber: string;
  otpCode: string;
  pin: string;
  confirmPin: string;
  biometricType: "face" | "fingerprint" | null;
  verificationId: string | null;
  userExists: boolean;
  securityQuestions: { question: string; answer: string }[];

  // Real-time subscriptions
  unsubscribeTransactions: (() => void) | null;
  unsubscribeBalance: (() => void) | null;
  unsubscribeAuth: (() => void) | null;

  // Security
  validatePin: (pin: string) => Promise<boolean>;
  updatePin: (oldPin: string, newPin: string) => Promise<boolean>;
  loginWithPin: (pin: string) => Promise<boolean>;
  loginWithBiometric: () => Promise<boolean>;
  checkAuthenticationStatus: () => Promise<boolean>;

  // Actions
  initializeStore: () => Promise<void>;
  setUser: (user: User) => void;
  clearUser: () => void;
  setError: (error: string | null) => void;
  setOnboardingStep: (step: AuthState["onboardingStep"]) => void;
  setMobileNumber: (mobile: string) => void;
  setOtpCode: (otp: string) => void;
  setPin: (pin: string) => void;
  setConfirmPin: (confirmPin: string) => void;
  setBiometricType: (type: "face" | "fingerprint" | null) => void;
  setSecurityQuestions: (
    questions: { question: string; answer: string }[]
  ) => void;

  // Firebase Actions
  checkUserExists: (mobile: string) => Promise<boolean>;
  sendOTP: (mobile: string) => Promise<void>;
  resendOTP: (mobile: string) => Promise<void>;
  verifyOTP: (otp: string) => Promise<void>;
  setupPin: (pin: string) => Promise<void>;
  setupSecurityQuestions: (
    questions: { question: string; answer: string }[]
  ) => Promise<void>;
  setupBiometric: (type: "face" | "fingerprint") => Promise<void>;
  completeOnboarding: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  resetForTesting: () => void;

  // Banking Actions
  processTransaction: (
    transactionData: Omit<
      Transaction,
      "id" | "createdAt" | "updatedAt" | "fromUserId" | "reference" | "status"
    >
  ) => Promise<string>;
  subscribeToTransactions: () => void;
  subscribeToBalance: () => void;
  unsubscribeAll: () => void;
  findUserByMobile: (mobile: string) => Promise<User | null>;
  fetchTransactions: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

export const useUserStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      onboardingComplete: false,
      transactions: [],
      error: null,
      onboardingStep: "get-started",
      mobileNumber: "",
      otpCode: "",
      pin: "",
      confirmPin: "",
      biometricType: null,
      verificationId: null,
      userExists: false,
      securityQuestions: [],
      unsubscribeTransactions: null,
      unsubscribeBalance: null,
      unsubscribeAuth: null,

      // Initialize store - setup Firebase auth listener
      initializeStore: async () => {
        try {
          set({ isLoading: true });

          // Setup Firebase auth state listener
          const unsubscribeAuth = firebaseService.onAuthStateChanged((user) => {
            if (user) {
              set({
                user: {
                  uid: user.uid,
                  fullName: user.fullName,
                  mobile: user.mobile,
                  emailId: user.emailId,
                  age: user.age,
                  gender: user.gender,
                  profile: user.profile,
                  bankName: user.bankName,
                  accountNumber: user.accountNumber,
                  ifscCode: user.ifscCode,
                  branchName: user.branchName,
                  accountType: user.accountType,
                  balance: user.balance,
                  recoveryQuestions: user.recoveryQuestions,
                  biometricEnabled: user.biometricEnabled,
                  biometricType: user.biometricType,
                  isActive: user.isActive,
                  lastLoginAt: user.lastLoginAt,
                },
                isAuthenticated: true,
                onboardingComplete: !!(
                  user.pinHash && user.recoveryQuestions?.length > 0
                ),
              });

              // User authenticated successfully
              console.log("User authenticated:", user.uid);
            } else {
              set({
                user: null,
                isAuthenticated: false,
                onboardingComplete: false,
              });
              get().unsubscribeAll();
            }
          });

          set({ unsubscribeAuth });
        } catch (error) {
          console.error("Failed to initialize store:", error);
          set({ error: "Failed to initialize application" });
        } finally {
          set({ isLoading: false });
        }
      },

      // Basic setters
      setUser: (user) => set({ user, isAuthenticated: true }),
      clearUser: () => {
        get().unsubscribeAll();
        set({ user: null, isAuthenticated: false });
      },
      setError: (error) => set({ error }),
      setOnboardingStep: (step) => set({ onboardingStep: step }),
      setMobileNumber: (mobile) => set({ mobileNumber: mobile }),
      setOtpCode: (otp) => set({ otpCode: otp }),
      setPin: (pin) => set({ pin }),
      setConfirmPin: (confirmPin) => set({ confirmPin }),
      setBiometricType: (type) => set({ biometricType: type }),
      setSecurityQuestions: (questions) =>
        set({ securityQuestions: questions }),

      // Firebase Actions
      checkUserExists: async (mobile: string) => {
        set({ isLoading: true, error: null });
        try {
          // Try to send OTP directly - backend will handle user existence check
          const verificationId = await firebaseService.sendOTP(mobile);
          set({
            userExists: true,
            verificationId,
            onboardingStep: "otp-verification",
          });
          return true;
        } catch (error) {
          console.error("Error checking user existence:", error);

          // Handle specific error messages from backend
          if (error.message.includes("User not found")) {
            set({
              userExists: false,
              error:
                "User is not registered with this bank. Please contact customer service.",
              onboardingStep: "get-started",
            });
          } else {
            set({
              error:
                error.message ||
                "Failed to verify user registration. Please try again.",
            });
          }
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      sendOTP: async (mobile: string) => {
        set({ isLoading: true, error: null });
        try {
          const verificationId = await firebaseService.sendOTP(mobile);
          set({
            verificationId,
            onboardingStep: "otp-verification",
          });
        } catch (error) {
          console.error("Error sending OTP:", error);
          set({
            error: error.message || "Failed to send OTP. Please try again.",
          });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      resendOTP: async (mobile: string) => {
        set({ isLoading: true, error: null });
        try {
          const verificationId = await firebaseService.resendOTP(mobile);
          set({
            verificationId,
          });
        } catch (error) {
          console.error("Error resending OTP:", error);
          set({
            error: error.message || "Failed to resend OTP. Please try again.",
          });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      verifyOTP: async (otp: string) => {
        set({ isLoading: true, error: null });
        try {
          const { verificationId } = get();
          if (!verificationId) {
            throw new Error("No verification ID found");
          }

          const user = await firebaseService.verifyOTP(verificationId, otp);

          // Set the user in the store after successful verification
          set({
            user,
            isAuthenticated: false, // Keep false until PIN is verified for existing users
          });

          // Check if user has completed setup (has PIN and security questions)
          const hasPinSetup = !!user.pinHash;
          const hasSecurityQuestions =
            user.recoveryQuestions && user.recoveryQuestions.length > 0;
          const hasBiometricSetup = user.biometricEnabled;

          // If user has completed all setup, redirect to PIN authentication
          if (hasPinSetup && hasSecurityQuestions) {
            set({
              onboardingStep: "completed",
              onboardingComplete: true,
            });
            // User will be redirected to PIN auth screen
            return;
          }

          // Otherwise, continue with onboarding flow
          if (!hasPinSetup) {
            set({ onboardingStep: "pin-setup" });
          } else if (!hasSecurityQuestions) {
            set({ onboardingStep: "security-questions" });
          } else if (!hasBiometricSetup) {
            set({ onboardingStep: "biometric-setup" });
          } else {
            set({
              onboardingStep: "completed",
              onboardingComplete: true,
            });
          }
        } catch (error) {
          console.error("Error verifying OTP:", error);
          set({ error: "Invalid OTP. Please try again." });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      setupPin: async (pin: string) => {
        set({ isLoading: true, error: null });
        try {
          const { user } = get();
          if (!user) {
            throw new Error("No user found");
          }

          await firebaseService.setupPin(user.uid, pin);

          // Check if security questions are needed
          const needsSecurityQuestions =
            !user.recoveryQuestions || user.recoveryQuestions.length === 0;

          if (needsSecurityQuestions) {
            set({ onboardingStep: "security-questions" });
          } else {
            set({ onboardingStep: "biometric-setup" });
          }
        } catch (error) {
          console.error("Error setting up PIN:", error);
          set({ error: "Failed to setup PIN. Please try again." });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      setupSecurityQuestions: async (
        questions: { question: string; answer: string }[]
      ) => {
        set({ isLoading: true, error: null });
        try {
          const { user } = get();
          if (!user) {
            throw new Error("No user found");
          }

          await firebaseService.setupSecurityQuestions(user.uid, questions);
          set({ onboardingStep: "biometric-setup" });
        } catch (error) {
          console.error("Error setting up security questions:", error);
          set({
            error: "Failed to setup security questions. Please try again.",
          });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      setupBiometric: async (type: "face" | "fingerprint") => {
        set({ isLoading: true, error: null });
        try {
          const { user } = get();
          if (!user) {
            throw new Error("No user found");
          }

          await firebaseService.setupBiometric(user.uid, type);
          set({
            biometricType: type,
            onboardingStep: "completed",
            onboardingComplete: true,
          });
        } catch (error) {
          console.error("Error setting up biometric:", error);
          set({
            error:
              "Failed to setup biometric authentication. Please try again.",
          });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      completeOnboarding: async () => {
        set({ isLoading: true, error: null });
        try {
          set({
            onboardingComplete: true,
            onboardingStep: "completed",
          });
        } catch (error) {
          console.error("Error completing onboarding:", error);
          set({ error: "Failed to complete onboarding. Please try again." });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      login: async () => {
        set({ isLoading: true, error: null });
        try {
          // Firebase auth state will be handled by the listener
          set({ isAuthenticated: true });
        } catch (error) {
          console.error("Error during login:", error);
          set({ error: "Failed to login. Please try again." });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        set({ isLoading: true, error: null });
        try {
          // Clear all subscriptions
          get().unsubscribeAll();

          // Clear user session and reset state
          set({
            isAuthenticated: false,
            user: null,
            transactions: [],
            onboardingComplete: false,
            onboardingStep: "get-started",
            mobileNumber: "",
            otpCode: "",
            pin: "",
            confirmPin: "",
            biometricType: null,
            verificationId: null,
            userExists: false,
            securityQuestions: [],
            error: null,
          });
        } catch (error) {
          console.error("Error during logout:", error);
          set({ error: "Failed to logout. Please try again." });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // Banking Actions
      processTransaction: async (
        transactionData: Omit<
          Transaction,
          | "id"
          | "createdAt"
          | "updatedAt"
          | "fromUserId"
          | "reference"
          | "status"
        >
      ) => {
        set({ isLoading: true, error: null });
        try {
          const { user } = get();
          if (!user) {
            throw new Error("No user found");
          }

          const result = await firebaseService.processTransaction(
            user.uid,
            transactionData
          );

          // Refresh user data to get updated balance
          await get().refreshUserData();
          
          // Real-time updates will be handled by subscriptions
          return result;
        } catch (error) {
          console.error("Transaction failed:", error);
          set({ error: "Transaction failed. Please try again." });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      fetchTransactions: async () => {
        set({ isLoading: true, error: null });
        try {
          const { user } = get();
          if (!user) {
            throw new Error("No user found");
          }

          const transactions = await firebaseService.getTransactions(user.uid);
          set({ transactions });
        } catch (error) {
          console.error("Failed to fetch transactions:", error);
          set({ error: "Failed to load transactions. Please try again." });
        } finally {
          set({ isLoading: false });
        }
      },

      // Additional Banking Actions
      updateBalance: (newBalance: number) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, balance: newBalance } });
        }
      },

      addTransaction: (transaction: Transaction) => {
        const { transactions } = get();
        set({ transactions: [transaction, ...transactions] });
      },

      // Security methods
      validatePin: async (pin: string): Promise<boolean> => {
        try {
          const { user } = get();
          if (!user) {
            return false;
          }

          return await firebaseService.validatePin(user.uid, pin);
        } catch (error) {
          console.error("PIN validation failed:", error);
          return false;
        }
      },

      updatePin: async (oldPin: string, newPin: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const { user } = get();
          if (!user) {
            throw new Error("No user found");
          }

          // First validate the old PIN
          const isValidOldPin = await firebaseService.validatePin(
            user.uid,
            oldPin
          );
          if (!isValidOldPin) {
            set({ error: "Current PIN is incorrect. Please try again." });
            return false;
          }

          // Update PIN in Firebase
          await firebaseService.setupPin(user.uid, newPin);
          return true;
        } catch (error) {
          console.error("Failed to update PIN:", error);
          set({ error: "Failed to update PIN. Please try again." });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      // Quick login with PIN
      loginWithPin: async (pin: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const { user } = get();
          if (!user) {
            set({ error: "No user session found. Please login with OTP." });
            return false;
          }

          const isValidPin = await firebaseService.validatePin(user.uid, pin);
          if (isValidPin) {
            // Update last login timestamp
            await firebaseService.updateLastLogin(user.uid);
            set({
              isAuthenticated: true,
              user: { ...user, lastLoginAt: new Date() },
            });
            return true;
          } else {
            set({ error: "Invalid PIN. Please try again." });
            return false;
          }
        } catch (error) {
          console.error("PIN login failed:", error);
          set({ error: "Login failed. Please try again." });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      // Quick login with biometric
      loginWithBiometric: async (): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const { user } = get();
          if (!user) {
            set({ error: "No user session found. Please login with OTP." });
            return false;
          }

          if (!user.biometricEnabled) {
            set({ error: "Biometric authentication is not enabled." });
            return false;
          }

          // Use expo-local-authentication for biometric verification
          let LocalAuthentication: any = null;
          try {
            LocalAuthentication = require("expo-local-authentication");
          } catch (error) {
            console.warn("expo-local-authentication not available:", error);
            set({
              error:
                "Biometric authentication is not available on this platform.",
            });
            return false;
          }

          if (!LocalAuthentication) {
            set({ error: "Biometric authentication is not available." });
            return false;
          }

          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          if (!hasHardware) {
            set({ error: "Biometric hardware not available." });
            return false;
          }

          const isEnrolled = await LocalAuthentication.isEnrolledAsync();
          if (!isEnrolled) {
            set({ error: "No biometric data enrolled on this device." });
            return false;
          }

          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: "Authenticate to access your account",
            cancelLabel: "Cancel",
            disableDeviceFallback: false,
          });

          if (result.success) {
            // Update last login timestamp
            await firebaseService.updateLastLogin(user.uid);
            set({
              isAuthenticated: true,
              user: { ...user, lastLoginAt: new Date() },
            });
            return true;
          } else {
            set({ error: "Biometric authentication failed." });
            return false;
          }
        } catch (error) {
          console.error("Biometric login failed:", error);
          set({ error: "Biometric login failed. Please try again." });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      // Check if user has valid session and can use quick login
      checkAuthenticationStatus: async (): Promise<boolean> => {
        try {
          const { user, isAuthenticated } = get();

          // Check if we have a persisted user session
          if (user && isAuthenticated) {
            // Verify the session is still valid with Firebase
            const currentUser = await firebaseService.getCurrentUser();
            if (currentUser && currentUser.uid === user.uid) {
              return true;
            }
          }

          // Clear invalid session
          set({ user: null, isAuthenticated: false });
          return false;
        } catch (error) {
          console.error("Authentication status check failed:", error);
          set({ user: null, isAuthenticated: false });
          return false;
        }
      },

      // Real-time subscriptions (simplified for now)
      subscribeToTransactions: () => {
        // Fetch transactions periodically or on demand
        get().fetchTransactions();
      },

      subscribeToBalance: () => {
        // Balance updates will be handled through transaction updates
        console.log("Balance subscription initialized");
      },

      // Refresh user data to get updated balance
      refreshUserData: async () => {
        try {
          const { user } = get();
          if (!user) return;

          const updatedUser = await firebaseService.getUserData(user.mobile);
          if (updatedUser) {
            set({ 
              user: { 
                ...user, 
                balance: updatedUser.balance 
              } 
            });
          }
        } catch (error) {
          console.error("Failed to refresh user data:", error);
        }
      },

      unsubscribeAll: () => {
        const { unsubscribeTransactions, unsubscribeBalance, unsubscribeAuth } =
          get();

        if (unsubscribeTransactions) {
          unsubscribeTransactions();
          set({ unsubscribeTransactions: null });
        }

        if (unsubscribeBalance) {
          unsubscribeBalance();
          set({ unsubscribeBalance: null });
        }

        if (unsubscribeAuth) {
          unsubscribeAuth();
          set({ unsubscribeAuth: null });
        }
      },

      // Find user by mobile number
      findUserByMobile: async (mobile: string): Promise<User | null> => {
        try {
          const userData = await firebaseService.findUserByMobile(mobile);
          return userData;
        } catch (error) {
          console.error("Error finding user by mobile:", error);
          return null;
        }
      },

      // Reset function for testing - clears all data
      resetForTesting: () => {
        get().unsubscribeAll();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          onboardingComplete: false,
          transactions: [],
          error: null,
          onboardingStep: "get-started",
          mobileNumber: "",
          otpCode: "",
          pin: "",
          confirmPin: "",
          biometricType: null,
          verificationId: null,
          userExists: false,
          securityQuestions: [],
          unsubscribeTransactions: null,
          unsubscribeBalance: null,
          unsubscribeAuth: null,
        });
      },
    }),
    {
      name: "user-storage",
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        // Only persist non-sensitive data
        user: state.user
          ? {
              ...state.user,
              // Remove sensitive fields from persistence
              recoveryStats: [], // Don't persist security questions
            }
          : null,
        onboardingComplete: state.onboardingComplete,
        onboardingStep: state.onboardingStep,
        biometricType: state.biometricType,
        // Never persist: PIN, OTP, sensitive user data
      }),
    }
  )
);
