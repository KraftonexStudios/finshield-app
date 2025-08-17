import { useDataCollectionStore } from "@/stores/useDataCollectionStore";
import { useUserStore } from "@/stores/useUserStore";
import * as Contacts from "expo-contacts";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { requireNativeModule } from "expo-modules-core";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import {
  BarChart3,
  Bell,
  Check,
  MapPin,
  RefreshCw,
  Users,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

let BehavioralDataCollectorModule: any = null;
try {
  BehavioralDataCollectorModule = requireNativeModule("DataCollection");
} catch { }

interface Permission {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  granted: boolean;
  required: boolean;
}

export default function PermissionsScreen() {
  const insets = useSafeAreaInsets();
  const setOnboardingStep = useUserStore((state) => state.setOnboardingStep);
  const { startDataCollection, requestPermissions } = useDataCollectionStore();

  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: "location",
      title: "Location Access",
      description: "Find nearby ATMs & branches",
      icon: MapPin,
      granted: false,
      required: true,
    },
    {
      id: "notifications",
      title: "Push Notifications",
      description: "Get alerts & updates",
      icon: Bell,
      granted: false,
      required: true,
    },
    {
      id: "contacts",
      title: "Contacts Access",
      description: "Send money to contacts",
      icon: Users,
      granted: false,
      required: false,
    },
    {
      id: "usageStats",
      title: "App Usage Access",
      description: "Fraud detection & security",
      icon: BarChart3,
      granted: false,
      required: true,
    },
  ]);

  useEffect(() => {
    checkAllPermissions();
  }, []);

  const checkAllPermissions = async () => {
    try {
      const locationStatus = await Location.getForegroundPermissionsAsync();
      const notificationStatus = await Notifications.getPermissionsAsync();
      const contactsStatus = await Contacts.getPermissionsAsync();
      let usageStatsGranted = false;
      if (BehavioralDataCollectorModule) {
        try {
          const p = await BehavioralDataCollectorModule.checkPermissions();
          usageStatsGranted = p.usageStats || false;
        } catch { }
      }
      setPermissions((prev) =>
        prev.map((permission) => {
          switch (permission.id) {
            case "location":
              return {
                ...permission,
                granted: locationStatus.status === "granted",
              };
            case "notifications":
              return {
                ...permission,
                granted: notificationStatus.status === "granted",
              };
            case "contacts":
              return {
                ...permission,
                granted: contactsStatus.status === "granted",
              };
            case "usageStats":
              return { ...permission, granted: usageStatsGranted };
            default:
              return permission;
          }
        })
      );
    } catch { }
  };

  const openUsageStatsSettings = async () => {
    try {
      await Linking.openURL("android.settings.USAGE_ACCESS_SETTINGS");
    } catch {
      await Linking.openSettings();
    }
  };

  const requestPermission = async (id: string) => {
    let granted = false;
    switch (id) {
      case "location":
        granted =
          (await Location.requestForegroundPermissionsAsync()).status ===
          "granted";
        break;
      case "notifications":
        granted =
          (await Notifications.requestPermissionsAsync()).status === "granted";
        break;
      case "contacts":
        granted =
          (await Contacts.requestPermissionsAsync()).status === "granted";
        break;
      case "usageStats":
        Alert.alert(
          "App Usage Access",
          "We’ll take you to settings to enable usage access.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: openUsageStatsSettings },
          ]
        );
        return;
    }
    setPermissions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, granted } : p))
    );
  };

  const handleContinue = async () => {
    const required = permissions.filter((p) => p.required);
    if (!required.every((p) => p.granted)) {
      Alert.alert(
        "Required Permissions",
        "Please grant all required permissions to continue."
      );
      return;
    }
    await requestPermissions();

    // Start session first, then data collection
    // This ensures we have session data to send later in loading-setup
    const { startSession } = useDataCollectionStore.getState();
    await startSession('onboarding_user'); // Temporary user ID for onboarding
    await startDataCollection("initial-registration");

    setOnboardingStep("mobile-input");
    router.push("/(onboarding)/mobile-input");
  };

  const allRequiredGranted = permissions
    .filter((p) => p.required)
    .every((p) => p.granted);

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="px-6 pt-8 pb-6 items-center">
        <Text className="text-white text-3xl font-bold mb-2">
          Security Permissions
        </Text>
        <Text className="text-white/70 text-center text-base leading-5">
          Enable these for the best banking experience and protection.
        </Text>
      </View>

      {/* Permissions List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {permissions.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => requestPermission(p.id)}
            className="bg-white/5 rounded-2xl px-5 py-4 mb-4 flex-row items-center"
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <View className="w-12 h-12 rounded-full bg-white/10 items-center justify-center mr-4">
              <p.icon size={22} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-semibold">
                {p.title}
              </Text>
              <Text className="text-white/60 text-sm">{p.description}</Text>
            </View>
            <View className="ml-3">
              {p.granted ? (
                <Check size={18} color="#0ED068" />
              ) : (
                <Text className="text-white/50 text-sm">Allow</Text>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Bottom Buttons */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 16,
          gap: 12,
        }}
      >
        {/* Refresh Button with gradient */}
        <Pressable onPress={checkAllPermissions} style={{ borderRadius: 50 }}>
          {({ pressed }) => (
            <LinearGradient
              colors={["#1A1A1A", "#2A2A2A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 50,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.2)",
                opacity: pressed ? 0.85 : 1,
              }}
            >
              <View className="flex-row items-center justify-center">
                <RefreshCw size={16} color="white" style={{ marginRight: 8 }} />
                <Text className="text-center text-sm font-medium text-white">
                  Refresh Permission Status
                </Text>
              </View>
            </LinearGradient>
          )}
        </Pressable>

        {/* Continue Button */}
        <Pressable
          onPress={handleContinue}
          className={`rounded-full py-4 ${allRequiredGranted ? "bg-white" : "bg-white/20"
            }`}
          disabled={!allRequiredGranted}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <Text
            className={`text-center text-lg font-semibold ${allRequiredGranted ? "text-black" : "text-white/50"
              }`}
          >
            Continue
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
