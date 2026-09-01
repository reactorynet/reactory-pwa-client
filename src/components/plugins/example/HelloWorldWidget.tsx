import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import Reactory from '@reactorynet/reactory-core';

export interface HelloWorldWidgetProps {
  reactory?: Reactory.Client.IReactoryApi;
  title?: string;
  message?: string;
  [key: string]: any;
}

export const HelloWorldWidget: React.FC<HelloWorldWidgetProps> = ({
  title = 'Hello World Plugin',
  message = 'Hello World from Reactory Client Plugin!',
}) => {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        my: 2,
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {message}
        </Typography>
      </Box>
    </Paper>
  );
};

export default HelloWorldWidget;
