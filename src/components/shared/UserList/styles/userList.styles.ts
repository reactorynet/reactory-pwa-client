/**
 * Shared styles for UserList component
 * @module UserList/styles
 */

import { Theme } from '@mui/material/styles';

/**
 * Get styles for UserList component
 * Uses Material-UI v6 sx prop patterns
 */
export const getUserListStyles = (theme: Theme) => ({
  // Main container
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: theme.palette.background.default,
  },

  // Toolbar
  toolbar: {
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(2),
    position: 'sticky',
    top: 0,
    zIndex: theme.zIndex.appBar - 1,
    gap: theme.spacing(2),
  },

  toolbarSection: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    flexWrap: 'wrap',
  },

  // Search
  searchContainer: {
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.mode === 'light' 
      ? theme.palette.grey[100] 
      : theme.palette.grey[800],
    '&:hover': {
      backgroundColor: theme.palette.mode === 'light' 
        ? theme.palette.grey[200] 
        : theme.palette.grey[700],
    },
    width: '100%',
    maxWidth: 400,
  },

  searchIcon: {
    padding: theme.spacing(0, 2),
    height: '100%',
    position: 'absolute',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchInput: {
    width: '100%',
    '& .MuiInputBase-input': {
      padding: theme.spacing(1, 1, 1, 0),
      paddingLeft: `calc(1em + ${theme.spacing(4)})`,
      transition: theme.transitions.create('width'),
      width: '100%',
    },
  },

  // Content area
  content: {
    flex: 1,
    overflow: 'auto',
    padding: theme.spacing(2),
  },

  contentLoading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },

  contentEmpty: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    color: theme.palette.text.secondary,
  },

  // List view
  listView: {
    '& .MuiListItem-root': {
      marginBottom: theme.spacing(1),
      borderRadius: theme.shape.borderRadius,
      border: `1px solid ${theme.palette.divider}`,
      backgroundColor: theme.palette.background.paper,
      transition: theme.transitions.create(['background-color', 'box-shadow']),
      '&:hover': {
        backgroundColor: theme.palette.action.hover,
        boxShadow: theme.shadows[2],
      },
      '&.Mui-selected': {
        backgroundColor: theme.palette.action.selected,
        borderColor: theme.palette.primary.main,
        '&:hover': {
          backgroundColor: theme.palette.action.selected,
        },
      },
    },
  },

  // Grid view
  gridView: {
    display: 'grid',
    gap: theme.spacing(2),
    gridTemplateColumns: {
      xs: 'repeat(1, 1fr)',
      sm: 'repeat(2, 1fr)',
      md: 'repeat(3, 1fr)',
      lg: 'repeat(4, 1fr)',
      xl: 'repeat(6, 1fr)',
    },
  },

  gridItem: {
    aspectRatio: '1',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(2),
    cursor: 'pointer',
    transition: theme.transitions.create(['background-color', 'box-shadow', 'transform']),
    backgroundColor: theme.palette.background.paper,
    position: 'relative',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      boxShadow: theme.shadows[4],
      transform: 'translateY(-2px)',
    },
    '&.selected': {
      backgroundColor: theme.palette.action.selected,
      borderColor: theme.palette.primary.main,
      borderWidth: 2,
    },
  },

  // Card view
  cardView: {
    display: 'grid',
    gap: theme.spacing(3),
    gridTemplateColumns: {
      xs: 'repeat(1, 1fr)',
      sm: 'repeat(1, 1fr)',
      md: 'repeat(2, 1fr)',
      lg: 'repeat(3, 1fr)',
    },
  },

  userCard: {
    transition: theme.transitions.create(['box-shadow', 'transform']),
    '&:hover': {
      boxShadow: theme.shadows[8],
      transform: 'translateY(-4px)',
    },
  },

  // User item components
  userItemAvatar: {
    marginRight: theme.spacing(2),
  },

  userItemContent: {
    flex: 1,
    minWidth: 0,
  },

  userItemSecondary: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginTop: theme.spacing(0.5),
  },

  userItemRoles: {
    display: 'flex',
    gap: theme.spacing(0.5),
    flexWrap: 'wrap',
    marginTop: theme.spacing(1),
  },

  // Pagination
  pagination: {
    backgroundColor: theme.palette.background.paper,
    borderTop: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(2),
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing(2),
    flexWrap: 'wrap',
  },

  paginationInfo: {
    color: theme.palette.text.secondary,
    fontSize: theme.typography.body2.fontSize,
  },

  paginationControls: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },

  // Selection summary
  selectionSummary: {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
    padding: theme.spacing(1, 2),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(2),
  },

  selectionActions: {
    display: 'flex',
    gap: theme.spacing(1),
  },

  // Filter chips
  filterChips: {
    display: 'flex',
    gap: theme.spacing(1),
    flexWrap: 'wrap',
    padding: theme.spacing(1, 0),
  },

  // View mode toggle
  viewModeToggle: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
  },

  // Status indicators
  statusOnline: {
    color: theme.palette.success.main,
  },

  statusOffline: {
    color: theme.palette.text.disabled,
  },

  statusBusy: {
    color: theme.palette.warning.main,
  },

  // Accessibility
  visuallyHidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    borderWidth: 0,
  },
});

export type UserListStyles = ReturnType<typeof getUserListStyles>;

