import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '../components/ui';
import { StoreProvider } from '../lib/store';
import { useTheme } from '../lib/theme';

function Inner() {
  const t = useTheme();
  return (
    <ToastProvider>
      <StatusBar style={t.bg === '#0b0f15' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg }, animation: 'slide_from_right' }} />
    </ToastProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
          <Inner />
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
