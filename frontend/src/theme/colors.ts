// Named accents double as the palette used to color-code categories (task
// columns, avatars, leaderboard ranks) — each pairs a saturated `accent` for
// small marks (icons, bars, rank numbers) with a light `tint` background and
// a readable `fg` for text/icons sitting on that tint.
export interface AccentSwatch {
  accent: string;
  tint: string;
  fg: string;
}

export const accents = {
  violet: { accent: '#7C6FEE', tint: '#EFECFE', fg: '#4C3FC7' },
  teal: { accent: '#14B8A6', tint: '#E6FBF7', fg: '#0F766E' },
  coral: { accent: '#FF8A65', tint: '#FFF1EC', fg: '#C2410C' },
  // Matches StatusBadge's existing under_review/changes_requested pair.
  amber: { accent: '#F59E0B', tint: '#FEF3C7', fg: '#B45309' },
  pink: { accent: '#EC4899', tint: '#FDF2F8', fg: '#BE185D' },
  // Matches StatusBadge's existing approved pair.
  green: { accent: '#22C55E', tint: '#DCFCE7', fg: '#15803D' },
} as const satisfies Record<string, AccentSwatch>;

export const accentList: AccentSwatch[] = Object.values(accents);

export const colors = {
  primary: accents.violet.accent,
  primaryTint: accents.violet.tint,
  primaryForeground: accents.violet.fg,

  bg: '#FAFAFC',
  surface: '#FFFFFF',
  surfaceSunken: '#F4F3F8',
  border: '#E4E2ED',

  text: '#1D1B2E',
  textMuted: '#6B6980',
  textOnPrimary: '#FFFFFF',

  // Neutral for inactive tab bar icons — deliberately lighter than textMuted
  // (which is used for readable secondary text) so inactive tabs recede.
  tabBarInactive: '#9CA3AF',

  danger: '#DC2626',
  dangerTint: '#FEE2E2',

  accents,
};

export default colors;
