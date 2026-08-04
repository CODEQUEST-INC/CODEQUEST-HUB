import { Feather } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Text from './Text';
import { Colors, elevation, radius, spacing, useTheme } from '../theme';

// Every screen used to hand-roll its own Pressable + StyleSheet for buttons,
// so touch-target size, pressed feedback, and disabled/loading treatment
// drifted screen to screen. This is the single shared implementation —
// change it once, every screen picks it up.
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'dangerOutline' | 'accentGreen' | 'accentAmber';
type ButtonSize = 'md' | 'sm';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ComponentProps<typeof Feather>['name'];
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const { mode, colors } = useTheme();
  const styles = createStyles(colors);
  const isDisabled = disabled || loading;
  const v = variants(colors, mode)[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sizeSm : styles.sizeMd,
        v.container,
        pressed && !isDisabled ? { opacity: v.pressedOpacity } : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.textColor} />
      ) : (
        <View style={styles.content}>
          {icon ? <Feather name={icon} size={size === 'sm' ? 14 : 16} color={v.textColor} /> : null}
          <Text style={[styles.label, size === 'sm' ? styles.labelSm : null, { color: v.textColor }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

function variants(
  colors: Colors,
  mode: 'light' | 'dark'
): Record<ButtonVariant, { container: ViewStyle; textColor: string; pressedOpacity: number }> {
  // Filled (solid-color) buttons get a subtle lift so the primary action on
  // a screen reads as raised, not just differently colored; outlined
  // buttons stay flat — the border already gives them enough definition,
  // and a shadow under an outline usually just looks like a rendering bug.
  const lift = elevation(mode, 'sm');
  return {
    primary: { container: { backgroundColor: colors.primary, ...lift }, textColor: colors.textOnPrimary, pressedOpacity: 0.85 },
    secondary: {
      container: { borderWidth: 1, borderColor: colors.primary, backgroundColor: 'transparent' },
      textColor: colors.primary,
      pressedOpacity: 0.6,
    },
    danger: { container: { backgroundColor: colors.danger, ...lift }, textColor: colors.textOnPrimary, pressedOpacity: 0.85 },
    dangerOutline: {
      container: { borderWidth: 1, borderColor: colors.danger, backgroundColor: 'transparent' },
      textColor: colors.danger,
      pressedOpacity: 0.6,
    },
    accentGreen: {
      container: { backgroundColor: colors.accents.green.accent, ...lift },
      textColor: colors.textOnPrimary,
      pressedOpacity: 0.85,
    },
    accentAmber: {
      container: { backgroundColor: colors.accents.amber.accent, ...lift },
      textColor: colors.textOnPrimary,
      pressedOpacity: 0.85,
    },
  };
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    base: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    sizeMd: { minHeight: 44, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
    sizeSm: { minHeight: 44, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    label: { fontWeight: '600', fontSize: 16 },
    labelSm: { fontSize: 13 },
    disabled: { opacity: 0.6 },
  });
}
