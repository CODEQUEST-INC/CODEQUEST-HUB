// Static light-mode values — kept for any lingering static imports during
// the dark-mode migration. Screen components should use useTheme() from
// './ThemeContext' instead, so colors actually respond to the user's choice.
import { AccentSwatch, lightColors } from './palettes';

export type { AccentSwatch };

export const accents = lightColors.accents;
export const accentList = Object.values(accents);
export const colors = lightColors;

export default colors;
