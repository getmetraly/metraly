import React, { createContext, useContext, useState, useEffect } from 'react';

export interface TweakState {
  density: 'compact' | 'comfortable' | 'spacious';
  sidebarCollapsed: boolean;
}

export interface TweaksContextValue {
  tweaks: TweakState;
  setTweak: <K extends keyof TweakState>(key: K, value: TweakState[K]) => void;
}

const DEFAULT_TWEAKS: TweakState = {
  density: 'comfortable',
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
  }, [tweaks]);

  const setTweak = <K extends keyof TweakState>(key: K, value: TweakState[K]) =>
    setTweaks((prev) => ({ ...prev, [key]: value }));

  return (
    <TweaksContext.Provider value={{ tweaks, setTweak }}>
      {children}
    </TweaksContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- intentional: context hook co-located with provider
export const useTweaks = (): TweaksContextValue =>
  useContext(TweaksContext) ?? { tweaks: DEFAULT_TWEAKS, setTweak: () => {} };
