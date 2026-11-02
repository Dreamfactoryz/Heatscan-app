import { useColorScheme } from 'react-native';

// Same colours as the Heat Scan web app: dark by default, light when the phone is in light mode.
const dark = {
  bg: '#0b0f15', surface: '#131921', surface2: '#1a212b', line: '#222a35', sheet: '#151b24',
  ink: '#f5f7fa', muted: '#8a94a3', ph: '#6b7584', accent: '#f6c744', accentText: '#f6c744', accentInk: '#14110a',
  tealBg: '#123236', teal: '#5ccfc9', ok: '#45d18a', warn: '#ff5c5c', amber: '#ffb547', scrim: 'rgba(0,0,0,0.6)',
  warnBg: 'rgba(255,92,92,0.14)', amberBg: 'rgba(255,181,71,0.13)', amberLine: 'rgba(255,181,71,0.45)', okBg: 'rgba(69,209,138,0.12)', okLine: 'rgba(69,209,138,0.4)',
};
const light: typeof dark = {
  bg: '#f3f5f8', surface: '#ffffff', surface2: '#e8ecf1', line: '#d4dae2', sheet: '#ffffff',
  ink: '#0e131a', muted: '#566170', ph: '#8a94a3', accent: '#f6c744', accentText: '#7a5800', accentInk: '#14110a',
  tealBg: '#d8f1ef', teal: '#0f6d68', ok: '#137a45', warn: '#c62828', amber: '#9a5b00', scrim: 'rgba(10,15,20,0.45)',
  warnBg: 'rgba(198,40,40,0.1)', amberBg: 'rgba(154,91,0,0.1)', amberLine: 'rgba(154,91,0,0.4)', okBg: 'rgba(19,122,69,0.1)', okLine: 'rgba(19,122,69,0.35)',
};
export type Theme = typeof dark;

export function useTheme(): Theme {
  return useColorScheme() === 'light' ? light : dark;
}

export const HIGHLIGHT_COLORS: [string, string][] = [
  ['246,199,68', 'Yellow'],
  ['92,207,201', 'Teal'],
  ['255,92,92', 'Red'],
];
