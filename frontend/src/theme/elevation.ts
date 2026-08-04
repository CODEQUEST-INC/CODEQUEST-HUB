import { ViewStyle } from 'react-native';

// A soft shadow reads as "elevated" against a light background, but is
// invisible (and looks muddy) against a dark one — dark mode already gets
// its sense of elevation from surface being lighter than bg (palettes.ts),
// the Material convention, so no shadow is applied there.
const LEVELS: Record<'sm' | 'md' | 'lg', { offset: number; opacity: number; radius: number; elevation: number }> = {
  sm: { offset: 1, opacity: 0.05, radius: 6, elevation: 1 },
  md: { offset: 2, opacity: 0.08, radius: 10, elevation: 3 },
  lg: { offset: 4, opacity: 0.12, radius: 18, elevation: 6 },
};

export function elevation(mode: 'light' | 'dark', level: 'sm' | 'md' | 'lg' = 'sm'): ViewStyle {
  if (mode === 'dark') return {};
  const l = LEVELS[level];
  return {
    shadowColor: '#1D1B2E',
    shadowOffset: { width: 0, height: l.offset },
    shadowOpacity: l.opacity,
    shadowRadius: l.radius,
    elevation: l.elevation,
  };
}

export default elevation;
