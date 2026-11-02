import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';

export function Screen({ children, scroll = true, scrollEnabled = true }: { children: React.ReactNode; scroll?: boolean; scrollEnabled?: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 60, paddingHorizontal: 16 };
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {scroll ? (
        <ScrollView scrollEnabled={scrollEnabled} keyboardShouldPersistTaps="handled" contentContainerStyle={[pad, { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad]}>{children}</View>
      )}
    </KeyboardAvoidingView>
  );
}
