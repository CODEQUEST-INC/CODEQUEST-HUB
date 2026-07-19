import { TextStyle } from 'react-native';

// Deliberately no `color` here — typography is font metrics only. Color is
// theme-dependent (see theme/palettes.ts + Text.tsx), so baking one in here
// would freeze it at whatever was imported at module-load time, ignoring
// dark mode entirely.
export const typography: Record<'heading' | 'subheading' | 'body' | 'caption' | 'label', TextStyle> = {
  heading: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3 },
  subheading: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '500' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
};

export default typography;
