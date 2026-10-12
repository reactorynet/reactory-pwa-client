import React, { useEffect, useMemo, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Icon,
  Paper
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { HeaderProps } from './types';
import { withReactory } from '@reactory/client-core/api';
import { compose } from 'redux';
import { useNavigate, useLocation } from 'react-router';
import { isArray } from 'lodash';
import { ReactoryApiEventNames } from '@reactory/client-core/api/ApiEventNames';
import { translateMenuTitle } from './menuTitle';

const MobileBottomHeader: React.FC<HeaderProps> = ({ reactory }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  const apiStatus = reactory.$user;
  const title = reactory.i18n.t(apiStatus.applicationName);

  // i18next does not notify React, and this header is rendered from a memoised
  // route tree, so it must bump its own version when the language changes or
  // the bottom-nav labels keep the previous language.
  const [languageVersion, setLanguageVersion] = useState(0);

  useEffect(() => {
    if (!reactory?.on) return undefined;
    const onLanguageChanged = () => setLanguageVersion((current) => current + 1);
    reactory.on(ReactoryApiEventNames.onLanguageChanged, onLanguageChanged);
    return () => {
      reactory.removeListener(ReactoryApiEventNames.onLanguageChanged, onLanguageChanged);
    };
  }, [reactory]);

  // Extract bottom nav items
  const bottomMenu = apiStatus.menus?.find((m: any) => m.target === 'bottom-nav' && m.enabled !== false);
  const menuItems = useMemo(
    () => (bottomMenu ? (bottomMenu.entries || []).filter((item: any) => item.enabled !== false) : []),
    [bottomMenu]
  );

  // Titles arrive as translation keys (optionally namespaced) or literal text,
  // and are resolved for the active language.
  const menuLabels = useMemo(
    () => menuItems.map((item: any) => translateMenuTitle(reactory, item.title)),
    // `languageVersion` is the trigger: the i18n instance identity does not
    // change when its active language does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [menuItems, reactory, languageVersion]
  );
  
  // Find current index based on route
  const getCurrentIndex = () => {
    if (!menuItems || menuItems.length === 0) return 0;
    // Simple matching
    const idx = menuItems.findIndex((item: any) => location.pathname.startsWith(item.link));
    return idx >= 0 ? idx : 0;
  };

  const [value, setValue] = useState(getCurrentIndex());

  useEffect(() => {
    setValue(getCurrentIndex());
  }, [location.pathname]);

  return (
    <Box sx={{ width: '100%' }}>
      {/* Top Bar */}
      <AppBar position="sticky" color="inherit" id="reactory_mobile_app_bar">
        <Toolbar variant="dense">
          <Typography variant="body2" color="inherit" sx={{ flex: 1 }}>
            <span>{title}</span>
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Bottom Nav */}
      {menuItems.length > 0 && (
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: theme.zIndex.appBar }} elevation={3}>
          <BottomNavigation
            showLabels
            value={value}
            onChange={(event, newValue) => {
              setValue(newValue);
              const item = menuItems[newValue];
              if (item && item.link) {
                navigate(item.link);
              }
            }}
          >
            {menuItems.map((item: any, index: number) => {
               // Check roles
               let allow = true;
               if (isArray(item.roles) && isArray(apiStatus.loggedIn.roles)) {
                  allow = reactory.hasRole(item.roles, apiStatus.loggedIn.roles);
               }
               if (!allow) return null;

               return (
                 <BottomNavigationAction 
                    key={item.id || index} 
                    label={menuLabels[index]} 
                    icon={item.icon ? <Icon>{item.icon}</Icon> : undefined} 
                 />
               );
            })}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};

export default compose(withReactory)(MobileBottomHeader);
