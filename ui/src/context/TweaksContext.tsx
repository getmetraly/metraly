import React, { createContext, useContext, useState, useEffect } from 'react';

export interface TweakState {
  accentColor: string;
  density: 'compact' | 'comfortable' | 'spacious';
  showSparklines: boolean;
  sidebarCollapsed: boolean;
}

export interface TweaksContextValue {
  tweaks: TweakState;
  setTweak: <K extends keyof TweakState>(key: K, value: TweakState[K]) => void;
}

const DEFAULT_TWEAKS: TweakState = {
  accentColor: '#00E5FF',
  density: 'comfortable',
  showSparklines: true,
  sidebarCollapsed: false,
};

const TweaksContext = createContext<TweaksContextValue | null>(null);

export const TweaksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tweaks, setTweaks] = useState<TweakState>(() => {
    try {
      const saved = localStorage.getItem('metraly-tweaks');
      return saved ? { ...DEFAULT_TWEAKS, ...JSON.parse(saved) } : DEFAULT_TWEAKS;
    } catch {
      return DEFAULT_TWEAKS;
    }
  });

  useEffect(() => {
    localStorage.setItem('metraly-tweaks', JSON.stringify(tweaks));
    document.documentElement.style.setProperty('--cyan', tweaks.accentColor);
  }, [tweaks]);

  const setTweak = <K extends keyof TweakState>(key: K, value: TweakState[K]) =>
    setTweaks((prev) => ({ ...prev, [key]: value }));

  return (
    <TweaksContext.Provider value={{ tweaks, setTweak }}>
      {children}
    </TweaksContext.Provider>
  );
};

export const useTweaks = (): TweaksContextValue =>
  useContext(TweaksContext) ?? { tweaks: DEFAULT_TWEAKS, setTweak: () => {} };
