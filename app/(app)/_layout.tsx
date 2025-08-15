import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function AppLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="transactions" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="send-money" />
        <Stack.Screen name="request-money" />
        <Stack.Screen name="bill-payment" />
        <Stack.Screen name="recharge" />
        <Stack.Screen name="more-services" />
        <Stack.Screen name="transfer-confirmation" />
        <Stack.Screen name="transfer-success" />
        <Stack.Screen name="beneficiary-list" />
        <Stack.Screen name="add-beneficiary" />
        <Stack.Screen name="transaction-details" />
        <Stack.Screen name="data-analytics" />
      </Stack>
    </>
  );
}