export type HighlightColor = 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'orange' | 'red' | 'gray';

export interface HighlightColorConfig {
  name: string;
  lightMode: string;
  darkMode: string;
  opacity: number;
}

export const HIGHLIGHT_COLORS: HighlightColor[] = [
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'orange',
  'red',
  'gray',
];

export const HIGHLIGHT_COLOR_CONFIGS: Record<HighlightColor, HighlightColorConfig> = {
  yellow: {
    name: 'Yellow',
    lightMode: 'rgba(255, 235, 59, 0.4)',
    darkMode: 'rgba(255, 214, 10, 0.25)',
    opacity: 0.4,
  },
  green: {
    name: 'Green',
    lightMode: 'rgba(76, 175, 80, 0.35)',
    darkMode: 'rgba(102, 187, 106, 0.2)',
    opacity: 0.35,
  },
  blue: {
    name: 'Blue',
    lightMode: 'rgba(33, 150, 243, 0.35)',
    darkMode: 'rgba(66, 165, 245, 0.2)',
    opacity: 0.35,
  },
  purple: {
    name: 'Purple',
    lightMode: 'rgba(156, 39, 176, 0.35)',
    darkMode: 'rgba(171, 71, 188, 0.2)',
    opacity: 0.35,
  },
  pink: {
    name: 'Pink',
    lightMode: 'rgba(233, 30, 99, 0.35)',
    darkMode: 'rgba(244, 143, 177, 0.2)',
    opacity: 0.35,
  },
  orange: {
    name: 'Orange',
    lightMode: 'rgba(255, 152, 0, 0.35)',
    darkMode: 'rgba(255, 167, 38, 0.2)',
    opacity: 0.35,
  },
  red: {
    name: 'Red',
    lightMode: 'rgba(244, 67, 54, 0.35)',
    darkMode: 'rgba(239, 83, 80, 0.2)',
    opacity: 0.35,
  },
  gray: {
    name: 'Gray',
    lightMode: 'rgba(158, 158, 158, 0.3)',
    darkMode: 'rgba(189, 189, 189, 0.15)',
    opacity: 0.3,
  },
};

export function getHighlightColor(color: HighlightColor, isDarkMode: boolean = false): string {
  const config = HIGHLIGHT_COLOR_CONFIGS[color];
  return isDarkMode ? config.darkMode : config.lightMode;
}

export function getHighlightColorName(color: HighlightColor): string {
  return HIGHLIGHT_COLOR_CONFIGS[color].name;
}
