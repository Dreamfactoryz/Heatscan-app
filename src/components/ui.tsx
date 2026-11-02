import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput,
  View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { Icon } from './Icon';

export const font = { r: '400' as const, m: '500' as const, sb: '600' as const, b: '700' as const, xb: '800' as const };

export function Eyebrow({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return <Text style={[{ fontSize: 11.5, fontWeight: font.xb, letterSpacing: 1.8, textTransform: 'uppercase', color: t.accentText }, style]}>{children}</Text>;
}
export function H1({ children, small }: { children: React.ReactNode; small?: boolean }) {
  const t = useTheme();
  return <Text style={{ fontSize: small ? 28 : 34, lineHeight: small ? 32 : 38, fontWeight: font.xb, letterSpacing: -0.8, color: t.ink, marginTop: 4, flexShrink: 1 }}>{children}</Text>;
}
export function H2({ children, count }: { children: React.ReactNode; count?: number }) {
  const t = useTheme();
  return (
    <Text style={{ fontSize: 19, fontWeight: font.b, color: t.ink }}>
      {children}
      {count != null ? <Text style={{ fontSize: 13, color: t.muted, fontWeight: font.sb }}>{'  ' + count}</Text> : null}
    </Text>
  );
}
export function Muted({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return <Text style={[{ color: t.muted, fontSize: 13.5 }, style]}>{children}</Text>;
}
export function Label({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return <Text style={{ fontSize: 11, fontWeight: font.b, letterSpacing: 1.6, textTransform: 'uppercase', color: t.muted, marginBottom: 6 }}>{children}</Text>;
}

type BtnProps = { title: string; onPress: () => void; icon?: string; kind?: 'yellow' | 'quiet' | 'danger'; disabled?: boolean; style?: StyleProp<ViewStyle>; busy?: boolean; align?: 'center' | 'left' };
export function Btn({ title, onPress, icon, kind = 'quiet', disabled, style, busy, align = 'center' }: BtnProps) {
  const t = useTheme();
  const bg = kind === 'yellow' ? t.accent : kind === 'quiet' ? t.surface : 'transparent';
  const fg = kind === 'yellow' ? t.accentInk : kind === 'danger' ? t.warn : t.ink;
  const border = kind === 'quiet' ? t.line : kind === 'danger' ? t.warn : t.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        { minHeight: kind === 'yellow' ? 54 : 48, borderRadius: kind === 'yellow' ? 14 : 12, backgroundColor: bg, borderWidth: 1, borderColor: border,
          flexDirection: 'row', alignItems: 'center', justifyContent: align === 'left' ? 'flex-start' : 'center', gap: 8, paddingHorizontal: 16,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1 },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: kind === 'yellow' ? font.b : font.sb, fontSize: kind === 'yellow' ? 16 : 14.5 }} numberOfLines={1}>{title}</Text>
    </Pressable>
  );
}

export function IconBtn({ icon, onPress, label, round, color }: { icon: string; onPress: () => void; label: string; round?: boolean; color?: string }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6}
      style={({ pressed }) => ({ width: 48, height: 48, borderRadius: round ? 24 : 12, alignItems: 'center', justifyContent: 'center', backgroundColor: round ? t.surface2 : 'transparent', opacity: pressed ? 0.6 : 1 })}>
      <Icon name={icon} color={color || (round ? t.ink : t.muted)} />
    </Pressable>
  );
}

export function Field({ label, style, big, ...rest }: TextInputProps & { label?: string; big?: boolean }) {
  const t = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      {label ? <Label>{label}</Label> : null}
      <TextInput
        placeholderTextColor={t.ph}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        {...rest}
        style={[
          { minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: focus ? t.accent : t.line, backgroundColor: t.surface, color: t.ink, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
          big && { fontSize: 22, fontWeight: font.xb, letterSpacing: 0.8 },
          rest.multiline && { minHeight: 84, textAlignVertical: 'top' },
          style,
        ]}
      />
    </View>
  );
}

export function Tag({ text, kind }: { text: string; kind?: 'warn' | 'ndt' | 'ex' }) {
  const t = useTheme();
  const bg = kind === 'warn' ? t.warnBg : kind === 'ndt' ? t.amberBg : kind === 'ex' ? t.tealBg : t.surface2;
  const fg = kind === 'warn' ? t.warn : kind === 'ndt' ? t.amber : kind === 'ex' ? t.teal : t.muted;
  return <Text style={{ fontSize: 12, fontWeight: font.sb, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', backgroundColor: bg, color: fg }}>{text}</Text>;
}

export function Empty({ title, children }: { title?: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ padding: 22, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: t.line, alignItems: 'center' }}>
      {title ? <Text style={{ color: t.ink, fontWeight: font.b, fontSize: 16, marginBottom: 4, textAlign: 'center' }}>{title}</Text> : null}
      <Text style={{ color: t.muted, fontSize: 14, textAlign: 'center' }}>{children}</Text>
    </View>
  );
}

export function Tile({ icon, teal, style, color }: { icon: string; teal?: boolean; style?: StyleProp<ViewStyle>; color?: string }) {
  const t = useTheme();
  return (
    <View style={[{ width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: teal ? t.tealBg : t.surface2 }, style]}>
      <Icon name={icon} color={color || (teal ? t.teal : t.accentText)} />
    </View>
  );
}

export function Section({ title, count, right, children }: { title: string; count?: number; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 28, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <H2 count={count}>{title}</H2>
        {right}
      </View>
      {children}
    </View>
  );
}

// Bottom sheet built on Modal.
export function Sheet({ visible, onClose, eyebrow, title, children }: { visible: boolean; onClose: () => void; eyebrow: string; title: string; children: React.ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim }]} onPress={onClose} accessibilityLabel="Close" />
        <View style={{ backgroundColor: t.sheet, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTopWidth: 1, borderColor: t.line, maxHeight: '92%' }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingTop: 10, paddingBottom: 22 + insets.bottom, gap: 16 }}>
            <View style={{ width: 42, height: 5, borderRadius: 3, backgroundColor: t.line, alignSelf: 'center', marginBottom: 6 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Eyebrow>{eyebrow}</Eyebrow>
                <Text style={{ fontSize: 23, fontWeight: font.xb, color: t.ink, marginTop: 4 }}>{title}</Text>
              </View>
              <IconBtn icon="x" label="Close" onPress={onClose} />
            </View>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// A dropdown: shows the chosen value, opens a list sheet to change it.
export function Choice({ value, placeholder, options, onChange, title, warnIfEmpty, compact }: {
  value: string; placeholder: string; options: readonly string[]; onChange: (v: string) => void; title: string; warnIfEmpty?: boolean; compact?: boolean;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const unset = !value;
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={title + ': ' + (value || 'not set')} onPress={() => setOpen(true)}
        style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: compact ? 46 : 52, borderRadius: 12, borderWidth: 1, borderColor: unset && warnIfEmpty ? t.warn : t.line,
          backgroundColor: t.surface, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: pressed ? 0.7 : 1 })}>
        <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: compact ? 15 : 16, fontWeight: compact ? font.sb : font.r, color: unset ? (warnIfEmpty ? t.warn : t.ph) : t.ink }}>{value || placeholder}</Text>
        <Icon name="chev" size={16} color={t.muted} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} eyebrow="Choose" title={title}>
        <View>
          {options.map((o) => (
            <Pressable key={o} onPress={() => { onChange(o); setOpen(false); }}
              style={({ pressed }) => ({ minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: t.line, opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ fontSize: 17, color: t.ink, fontWeight: o === value ? font.b : font.r }}>{o}</Text>
              {o === value ? <Text style={{ color: t.accentText, fontWeight: font.b }}>✓</Text> : null}
            </Pressable>
          ))}
        </View>
      </Sheet>
    </>
  );
}

// Simple toast shown at the bottom of the screen.
const ToastCtx = createContext<(msg: string) => void>(() => {});
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState('');
  const op = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    Animated.timing(op, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => Animated.timing(op, { toValue: 0, duration: 200, useNativeDriver: true }).start(), 2600);
  }, [op]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: 20 + insets.bottom, alignItems: 'center', opacity: op }}>
        <Text accessibilityLiveRegion="polite" style={{ backgroundColor: t.ink, color: t.bg, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12, overflow: 'hidden', fontWeight: font.sb, fontSize: 14.5 }}>{msg}</Text>
      </Animated.View>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

export function Spinner({ label }: { label: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <ActivityIndicator color={t.accent} />
      <Muted>{label}</Muted>
    </View>
  );
}
