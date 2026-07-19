import { accentList, accents, colors } from './colors';
import { radius } from './radius';
import { spacing } from './spacing';
import { typography } from './typography';

export { accentList, accents, colors, radius, spacing, typography };
export type { AccentSwatch } from './colors';
export type { Accents, Colors } from './palettes';
export { useTheme, ThemeProvider } from './ThemeContext';
export type { ThemeMode } from './ThemeContext';

export const theme = { colors, spacing, typography, radius, accents, accentList };

export default theme;
