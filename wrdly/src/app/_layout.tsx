import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StatsProvider } from '@/state/stats';
import { colors } from '@/game/theme';

export default function RootLayout() {
  return (
    <StatsProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="game" />
      </Stack>
    </StatsProvider>
  );
}
