import { accentList, accents, colors } from './colors';
import { elevation } from './elevation';
import { radius } from './radius';
import { spacing } from './spacing';
import { typography } from './typography';

export { accentList, accents, colors, elevation, radius, spacing, typography };
export type { AccentSwatch } from './colors';
export type { Accents, Colors } from './palettes';
export { useTheme, ThemeProvider } from './ThemeContext';
export type { ThemeMode } from './ThemeContext';
export { proposalStatusStyle } from './proposalStatusStyle';
export type { ProposalStatusStyle } from './proposalStatusStyle';

export const theme = { colors, spacing, typography, radius, accents, accentList, elevation };

export default theme;
