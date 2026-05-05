import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const light = {
  bg: '#f0f9ff', card: '#ffffff', border: '#e5e7eb',
  text: '#111827', textMuted: '#6b7280', textFaint: '#9ca3af',
  input: '#f9fafb', surface: '#f8fafc', header: '#0ea5e9',
};
const dark = {
  bg: '#0f172a', card: '#1e293b', border: '#334155',
  text: '#f1f5f9', textMuted: '#94a3b8', textFaint: '#64748b',
  input: '#0f172a', surface: '#1e293b', header: '#0369a1',
};

type Mode = 'system' | 'light' | 'dark';
interface Ctx { isDark: boolean; c: typeof light; mode: Mode; toggleTheme: () => void }

const ThemeCtx = createContext<Ctx>({ isDark: false, c: light, mode: 'system', toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<Mode>('system');

  useEffect(() => {
    AsyncStorage.getItem('themeMode').then(v => { if (v) setMode(v as Mode); });
  }, []);

  function toggleTheme() {
    const next: Mode = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    AsyncStorage.setItem('themeMode', next);
  }

  const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';
  return (
    <ThemeCtx.Provider value={{ isDark, c: isDark ? dark : light, mode, toggleTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() { return useContext(ThemeCtx); }
