import { useColorScheme } from 'react-native';

const light = {
  bg: '#f0f9ff',
  card: '#ffffff',
  border: '#e5e7eb',
  text: '#111827',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',
  input: '#f9fafb',
  surface: '#f8fafc',
  header: '#0ea5e9',
};

const dark = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  textFaint: '#64748b',
  input: '#0f172a',
  surface: '#1e293b',
  header: '#0369a1',
};

export const C = {
  primary: '#0ea5e9',
  primaryLight: '#7dd3fc',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  orange: '#f97316',
  purple: '#8b5cf6',
};

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return { isDark, c: isDark ? dark : light };
}
