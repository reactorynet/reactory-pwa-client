import { SxProps, Theme, alpha } from '@mui/material';
import { CommanderPosition } from './types';

export const glassmorphismStyle = (mode: string = 'dark'): SxProps<Theme> => ({
  backgroundColor: mode === 'dark' ? 'rgba(18, 24, 38, 0.88)' : 'rgba(255, 255, 255, 0.92)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid',
  borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
  boxShadow: mode === 'dark'
    ? '0 12px 32px 0 rgba(0, 0, 0, 0.5)'
    : '0 12px 32px 0 rgba(31, 38, 135, 0.15)',
});

export const getDockPositionStyle = (
  dock: CommanderPosition,
  customPos?: { x: number; y: number },
  spacing: number = 20
): React.CSSProperties => {
  if (dock === 'custom' && customPos) {
    return {
      position: 'fixed',
      left: `${customPos.x}px`,
      top: `${customPos.y}px`,
      zIndex: 1300,
    };
  }

  const base: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1300,
  };

  switch (dock) {
    case 'top-left':
      return { ...base, top: spacing, left: spacing };
    case 'bottom-left':
      return { ...base, bottom: spacing, left: spacing };
    case 'bottom-right':
      return { ...base, bottom: spacing, right: spacing };
    case 'top-right':
    default:
      return { ...base, top: spacing, right: spacing };
  }
};
