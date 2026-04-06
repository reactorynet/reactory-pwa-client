import React from 'react';

interface PendingToolCallsBannerProps {
  pendingCount: number;
  toolNames: string[];
  onResume: () => void;
  onDismiss: () => void;
  Material: any;
  il8n: any;
}

const PendingToolCallsBanner: React.FC<PendingToolCallsBannerProps> = ({
  pendingCount,
  toolNames,
  onResume,
  onDismiss,
  Material,
  il8n,
}) => {
  const { Box, Typography, Button, Icon } = Material.MaterialCore;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1.5,
        bgcolor: 'warning.light',
        color: 'warning.contrastText',
        borderRadius: 1,
        mx: 2,
        my: 1,
      }}
    >
      <Icon sx={{ fontSize: 20 }}>history</Icon>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {il8n?.t('reactor.client.chat.pendingToolCalls.title', {
            defaultValue: 'Pending Tool Calls',
          })}
        </Typography>
        <Typography variant="caption">
          {il8n?.t('reactor.client.chat.pendingToolCalls.description', {
            count: pendingCount,
            tools: toolNames.join(', '),
            defaultValue: 'This conversation has {{count}} interrupted tool call(s): {{tools}}',
          })}
        </Typography>
      </Box>
      <Button
        size="small"
        variant="contained"
        color="inherit"
        onClick={onResume}
        sx={{ textTransform: 'none', fontWeight: 600, minWidth: 'auto' }}
      >
        {il8n?.t('reactor.client.chat.pendingToolCalls.resume', { defaultValue: 'Resume' })}
      </Button>
      <Button
        size="small"
        variant="text"
        color="inherit"
        onClick={onDismiss}
        sx={{ textTransform: 'none', minWidth: 'auto' }}
      >
        {il8n?.t('reactor.client.chat.pendingToolCalls.dismiss', { defaultValue: 'Dismiss' })}
      </Button>
    </Box>
  );
};

export default PendingToolCallsBanner;
