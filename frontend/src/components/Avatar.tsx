import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { accentList, AccentSwatch } from '../theme';

// Stable, deterministic color pick so the same person always gets the same
// color across screens/sessions without needing a persisted assignment.
function colorForKey(key: string): AccentSwatch {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return accentList[Math.abs(hash) % accentList.length];
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AvatarProps {
  name: string;
  size?: number;
  color?: AccentSwatch;
}

export default function Avatar({ name, size = 36, color }: AvatarProps) {
  const swatch = color ?? colorForKey(name);
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: swatch.tint },
      ]}
    >
      <Text style={[styles.initials, { color: swatch.fg, fontSize: size * 0.4 }]}>{initialsOf(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: '700' },
});
