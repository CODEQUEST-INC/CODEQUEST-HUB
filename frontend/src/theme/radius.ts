export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  // Additive, not a replacement for sm/md/lg — the redesign handoff uses a
  // bigger "squircle" scale (20/22/28) for a specific set of screens without
  // changing the radius everywhere else in the app that still reads sm/md/lg.
  xl: 20,
  xxl: 22,
  xxxl: 28,
  pill: 999,
};

export default radius;
