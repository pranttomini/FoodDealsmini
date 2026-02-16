import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { theme } from '../../constants/theme';

interface SurfaceCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

export function SurfaceCard({ children, style }: SurfaceCardProps) {
  return <View style={[styles.surfaceCard, style]}>{children}</View>;
}

interface PillProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Pill({ label, selected = false, onPress }: PillProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.pill, selected && styles.pillSelected]}
    >
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  rightMeta?: string;
}

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  secondary = false,
  rightMeta,
}: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.88}
      style={[
        styles.button,
        secondary && styles.buttonSecondary,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{title}</Text>
      {rightMeta ? <Text style={[styles.buttonMeta, secondary && styles.buttonTextSecondary]}>{rightMeta}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  surfaceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: theme.spacing.md,
  },
  pill: {
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.surfaceAlt,
    marginRight: 8,
  },
  pillSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pillText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  pillTextSelected: {
    color: '#fff',
  },
  button: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  buttonSecondary: {
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    borderColor: '#9ca3af',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  buttonMeta: {
    color: '#ffedd5',
    fontSize: 12,
    fontWeight: '700',
  },
  buttonTextSecondary: {
    color: theme.colors.text,
  },
});
