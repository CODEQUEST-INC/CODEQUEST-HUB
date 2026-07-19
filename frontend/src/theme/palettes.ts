// Named accents double as the palette used to color-code categories (task
// columns, avatars, leaderboard ranks) — each pairs a saturated `accent` for
// small marks (icons, bars, rank numbers) with a light `tint` background and
// a readable `fg` for text/icons sitting on that tint.
export interface AccentSwatch {
  accent: string;
  tint: string;
  fg: string;
}

export interface Accents {
  violet: AccentSwatch;
  teal: AccentSwatch;
  coral: AccentSwatch;
  amber: AccentSwatch;
  pink: AccentSwatch;
  green: AccentSwatch;
}

export interface Colors {
  primary: string;
  primaryTint: string;
  primaryForeground: string;
  bg: string;
  surface: string;
  surfaceSunken: string;
  border: string;
  text: string;
  textMuted: string;
  textOnPrimary: string;
  tabBarInactive: string;
  danger: string;
  dangerTint: string;
  accents: Accents;
}

const lightAccents: Accents = {
  violet: { accent: '#7C6FEE', tint: '#EFECFE', fg: '#4C3FC7' },
  teal: { accent: '#14B8A6', tint: '#E6FBF7', fg: '#0F766E' },
  coral: { accent: '#FF8A65', tint: '#FFF1EC', fg: '#C2410C' },
  amber: { accent: '#F59E0B', tint: '#FEF3C7', fg: '#B45309' },
  pink: { accent: '#EC4899', tint: '#FDF2F8', fg: '#BE185D' },
  green: { accent: '#22C55E', tint: '#DCFCE7', fg: '#15803D' },
};

// Not just an inversion — brightened accents for contrast against a dark
// ground, and a near-black with a slight violet bias (matches the app's own
// primary hue) instead of pure black.
const darkAccents: Accents = {
  violet: { accent: '#9B8FFF', tint: '#2A2650', fg: '#C9C2FF' },
  teal: { accent: '#2DD4BF', tint: '#103430', fg: '#5EEAD4' },
  coral: { accent: '#FF9E7A', tint: '#3A2318', fg: '#FFB596' },
  amber: { accent: '#FBBF24', tint: '#3A2E0C', fg: '#FDE08A' },
  pink: { accent: '#F472B6', tint: '#3A1830', fg: '#FBA8D3' },
  green: { accent: '#4ADE80', tint: '#123420', fg: '#86EFAC' },
};

export const lightColors: Colors = {
  primary: lightAccents.violet.accent,
  primaryTint: lightAccents.violet.tint,
  primaryForeground: lightAccents.violet.fg,

  bg: '#FAFAFC',
  surface: '#FFFFFF',
  surfaceSunken: '#F4F3F8',
  border: '#E4E2ED',

  text: '#1D1B2E',
  textMuted: '#6B6980',
  textOnPrimary: '#FFFFFF',

  tabBarInactive: '#9CA3AF',

  danger: '#DC2626',
  dangerTint: '#FEE2E2',

  accents: lightAccents,
};

export const darkColors: Colors = {
  primary: darkAccents.violet.accent,
  primaryTint: darkAccents.violet.tint,
  primaryForeground: darkAccents.violet.fg,

  bg: '#141225',
  surface: '#1C1930',
  surfaceSunken: '#221E3A',
  border: '#332F4E',

  text: '#F1EFFB',
  textMuted: '#A8A3C4',
  textOnPrimary: '#FFFFFF',

  tabBarInactive: '#5B5775',

  danger: '#F87171',
  dangerTint: '#3A1F1F',

  accents: darkAccents,
};
