import React from 'react';
import { ChatActivityStatus } from '../types';
import { glassOverlayStyle } from '../utils';

interface ChatStatusIndicatorProps {
  status: ChatActivityStatus;
  label: string;
  icon: string;
  color: string;
  Material: any;
  mode?: 'dark' | 'light' | string;
}

const ChatStatusIndicator: React.FC<ChatStatusIndicatorProps> = ({
  status, label, icon, color, Material, mode = 'dark',
}) => {
  const { Box, Typography, Icon, CircularProgress, Fade } = Material.MaterialCore;

  if (status === 'idle') return null;

  const isAnimating = status === 'thinking' || status === 'streaming' || status === 'executing_tools';

  return (
    <Fade in>
      <Box sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1.25,
        py: 0.4,
        borderRadius: 999,
        ...glassOverlayStyle(mode),
        color,
        userSelect: 'none',
      }}>
        {isAnimating
          ? <CircularProgress size={12} color="inherit" />
          : <Icon sx={{ fontSize: 14 }}>{icon}</Icon>}
        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
          {label}
        </Typography>
      </Box>
    </Fade>
  );
};

export default ChatStatusIndicator;
