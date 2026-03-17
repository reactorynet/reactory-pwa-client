import { useState, useEffect } from 'react';

export interface DesktopEnvironment {
  isDesktop: boolean;
  platform: string;
  desktopRoot: string;
}

export const useDesktopEnvironment = (): DesktopEnvironment => {
  const [env, setEnv] = useState<DesktopEnvironment>({
    isDesktop: false,
    platform: 'web',
    desktopRoot: '/'
  });

  useEffect(() => {
    // Check if running inside Electron wrapper via contextBridge or process.env
    // In Vite/Webpack, we can check import.meta.env or process.env
    // @ts-ignore
    const isElectron = window && window.process && window.process.type === 'renderer' || navigator.userAgent.toLowerCase().indexOf(' electron/') > -1;
    
    // @ts-ignore
    const isDesktopInstall = import.meta.env?.VITE_IS_DESKTOP_INSTALL === "true" || process.env.IS_DESKTOP_INSTALL === "true" || isElectron;
    
    if (isDesktopInstall) {
      setEnv({
        isDesktop: true,
        // @ts-ignore
        platform: window?.process?.platform || 'desktop',
        // @ts-ignore
        desktopRoot: import.meta.env?.VITE_REACTOR_DESKTOP_ROOT || process.env.REACTOR_DESKTOP_ROOT || '~/'
      });
    }
  }, []);

  return env;
};

export default useDesktopEnvironment;
