// The real hook reads `import.meta.env`, which CommonJS jest cannot parse.
// Plugins never render the desktop variant, so the web environment is enough.
export interface DesktopEnvironment {
  isDesktop: boolean;
  platform: string;
  desktopRoot: string;
}

export const useDesktopEnvironment = (): DesktopEnvironment => ({ isDesktop: false, platform: 'web', desktopRoot: '/' });

export default useDesktopEnvironment;
