import React, { useState, useEffect } from 'react';
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

const MobileBottomHeader: React.FC<HeaderProps> = ({ reactory }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  const apiStatus = reactory.$user;
  const title = reactory.i18n.t(apiStatus.applicationName);
  
  // Extract bottom nav items
  const bottomMenu = apiStatus.menus?.find((m: any) => m.target === 'bottom-nav');
  const menuItems = bottomMenu ? bottomMenu.entries : [];
  
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
                    label={item.title} 
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
