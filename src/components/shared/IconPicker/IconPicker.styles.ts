import { styled } from '@mui/material/styles';
import { Box, Paper, TextField, IconButton } from '@mui/material';

export const IconPickerRoot = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
}));

export const SearchBar = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

export const GridContainer = styled(Box)(({ theme }) => ({
  flex: '1 1 auto',
  width: '100%',
  minHeight: 0, // Critical for nested flex scrolling
  backgroundColor: theme.palette.background.default,
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
}));

export const IconItem = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'selected',
})<{ selected?: boolean }>(({ theme, selected }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(1),
  cursor: 'pointer',
  borderRadius: theme.shape.borderRadius,
  border: selected ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
  backgroundColor: selected ? theme.palette.action.selected : 'transparent',
  color: theme.palette.text.primary,
  transition: theme.transitions.create(['background-color', 'border-color', 'transform'], {
    duration: theme.transitions.duration.shortest,
  }),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    transform: 'scale(1.05)',
  },
}));

export const IconPreview = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const SelectedIconWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  backgroundColor: theme.palette.action.selected,
  borderRadius: '50%',
}));
