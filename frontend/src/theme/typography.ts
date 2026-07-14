import { TextStyle } from 'react-native';
import { colors } from './colors';

export const typography: Record<'heading' | 'subheading' | 'body' | 'caption' | 'label', TextStyle> = {
  heading: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3 },
  subheading: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
};

export default typography;
