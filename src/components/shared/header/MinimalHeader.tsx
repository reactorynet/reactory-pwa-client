import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { HeaderProps } from './types';
import { withReactory } from '@reactory/client-core/api';
import { compose } from 'redux';

const MinimalHeader: React.FC<HeaderProps> = ({ reactory }) => {
  const theme = useTheme();
  
  const apiStatus = reactory.$user;
  const title = reactory.i18n.t(apiStatus.applicationName);

  return (
    <Box sx={{ width: '100%' }}>
      <AppBar position="sticky" color="inherit" id="reactory_minimal_app_bar">
        <Toolbar variant="dense">
          <Typography variant="body2" color="inherit" sx={{ flex: 1 }}>
            <span>{title}</span>
          </Typography>
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default compose(withReactory)(MinimalHeader);
