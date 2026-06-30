import React from 'react';
import { ChatActivityStatus } from '../types';

interface ChatStatusIndicatorProps {
  status: ChatActivityStatus;
  label: string;
  icon: string;
  color: string;
  Material: any;
}

const ChatStatusIndicator: React.FC<ChatStatusIndicatorProps> = ({
  status, label, icon, color, Material,
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
        bgcolor: `${color}15`,
        backdropFilter: 'blur(8px) saturate(120%)',
        WebkitBackdropFilter: 'blur(8px) saturate(120%)',
        border: `1px solid ${color}40`,
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
