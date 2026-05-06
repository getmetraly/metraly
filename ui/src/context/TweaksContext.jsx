import React, { createContext, useContext, useState, useEffect } from 'react';

const DEFAULT_TWEAKS = {
  accentColor: '#00E5FF',
  density: 'comfortable',
  showSparklines: true,
  sidebarCollapsed: false,
};

const TweaksContext = createContext(null);

export const TweaksProvider = ({ children }) => {
  const [tweaks, setTweaks] = useState(() => {
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

  const setTweak = (key, value) => setTweaks(prev => ({ ...prev, [key]: value }));

  return (
    <TweaksContext.Provider value={{ tweaks, setTweak }}>
      {children}
    </TweaksContext.Provider>
  );
};

export const useTweaks = () => useContext(TweaksContext) || {
  tweaks: DEFAULT_TWEAKS,
  setTweak: () => {},
};
