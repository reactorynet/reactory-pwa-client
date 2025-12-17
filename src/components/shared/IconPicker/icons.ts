import { useState, useEffect, useMemo } from 'react';

// Memoize the icon keys to avoid re-calculation
let cachedIconKeys: string[] | null = null;
let cachedIcons: any = null;

export const useIconList = () => {
  const [icons, setIcons] = useState<any>(cachedIcons || {});
  const [loading, setLoading] = useState(!cachedIcons);

  useEffect(() => {
    if (cachedIcons) {
        setIcons(cachedIcons);
        setLoading(false);
        return;
    }
    
// @ts-ignore
    import('./AllIcons').then((module) => {
      // module.default is the export default from AllIcons.ts, which is the * as MuiIcons object.
      // So module.default contains all the icons.
      const allIcons = module.default;
      
      cachedIcons = allIcons;
      // Filter out internal properties or non-component exports if any
      cachedIconKeys = Object.keys(allIcons).filter(key => {
         // Should be a valid component name (starts with uppercase) and not 'default'
         return key !== 'default' && /^[A-Z]/.test(key);
      }); 
      
      setIcons(allIcons);
      setLoading(false);
    });
  }, []);

  return { icons, loading };
};
