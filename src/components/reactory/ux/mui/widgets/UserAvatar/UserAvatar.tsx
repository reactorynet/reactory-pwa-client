import React, { useMemo, useState } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import { Chip, Avatar, Typography, Box, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton } from '@mui/material';
import { compose } from 'redux';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import { template } from 'lodash';
import { getAvatar } from '@reactory/client-core/components/util';
import Reactory from '@reactory/reactory-core';
import { REACTORY_USER_LIST_QUERY } from '@reactory/client-core/components/shared/UserList/graphql';

const PREFIX = 'UserAvatar';

const classes = {
  root: `${PREFIX}-root`,
  avatar: `${PREFIX}-avatar`,
  chip: `${PREFIX}-chip`,
  avatarName: `${PREFIX}-avatarName`,
  unassigned: `${PREFIX}-unassigned`,
};

const StyledBox = styled(Box)(({ theme }) => ({
  [`&.${classes.root}`]: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  [`& .${classes.avatarName}`]: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  [`& .${classes.unassigned}`]: {
    color: theme.palette.text.secondary,
    fontStyle: 'italic',
  },
}));

const EditableChip = styled(Chip)(({ theme }) => ({
  cursor: 'pointer',
  transition: theme.transitions.create(['background-color', 'box-shadow', 'transform'], {
    duration: theme.transitions.duration.short,
  }),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    boxShadow: theme.shadows[2],
    transform: 'scale(1.02)',
  },
  '&:active': {
    transform: 'scale(0.98)',
  },
}));

const EditableBox = styled(Box)(({ theme }) => ({
  cursor: 'pointer',
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(0.5),
  transition: theme.transitions.create(['background-color', 'box-shadow'], {
    duration: theme.transitions.duration.short,
  }),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    boxShadow: theme.shadows[1],
  },
  '&:active': {
    backgroundColor: theme.palette.action.selected,
  },
}));

interface UserAvatarOptions {
  /**
   * Display variant
   * - chip: Material-UI Chip with avatar
   * - avatar: Just the avatar
   * - avatar-name: Avatar with name beside it
   * @default 'chip'
   */
  variant?: 'chip' | 'avatar' | 'avatar-name';
  
  /**
   * Size of the avatar/chip
   * @default 'small'
   */
  size?: 'small' | 'medium';
  
  /**
   * Show email on hover (in tooltip)
   * @default true
   */
  showEmail?: boolean;
  
  /**
   * Make the component clickable
   * @default false
   */
  clickable?: boolean;
  
  /**
   * Enable user selection/editing with dialog
   * When true, clicking opens a user selector dialog
   * @default false
   */
  editable?: boolean;
  
  /**
   * Organization ID for filtering users in selector
   * Required when editable is true
   */
  organizationId?: string;
  
  /**
   * Business unit ID for filtering users
   */
  businessUnitId?: string;
  
  /**
   * Show filters in user selector dialog
   * @default true
   */
  showFilters?: boolean;
  
  /**
   * Dialog title for user selector
   * @default 'Select User'
   */
  dialogTitle?: string;
  
  /**
   * Text to show when user is not assigned
   * @default 'Unassigned'
   */
  unassignedText?: string;
  
  /**
   * Icon to show when user is not assigned
   * @default 'person_outline'
   */
  unassignedIcon?: string;
  
  /**
   * Label format template
   * @example '${user.firstName} ${user.lastName}'
   */
  labelFormat?: string;
  
  /**
   * Tooltip format template
   * @example '${user.firstName} ${user.lastName} (${user.email})'
   */
  tooltipFormat?: string;
  
  /**
   * Show full name
   * @default true
   */
  showFullName?: boolean;
  
  /**
   * Custom styles
   */
  style?: React.CSSProperties;
  
  /**
   * Click handler
   */
  onClick?: (user: Partial<Reactory.Models.IUser> | null) => void;

  /**
   * User list query to use for the user selector dialog
   */
  userListQuery?: string;
}

interface UserAvatarProps {
  user?: Partial<Reactory.Models.IUser> | null;
  formData?: Partial<Reactory.Models.IUser> | string | null;
  value?: Partial<Reactory.Models.IUser> | null;
  uiSchema?: {
    'ui:options'?: UserAvatarOptions;
  };
  onChange?: (user: Partial<Reactory.Models.IUser> | null) => void;
  reactory?: Reactory.Client.IReactoryApi;
  formContext?: any;
  [key: string]: any;
}

/**
 * UserAvatar Widget
 * 
 * A flexible component for displaying user information with avatar.
 * Supports multiple display variants, configurations, and user selection.
 * 
 * Features:
 * - Multiple display variants (chip, avatar, avatar-name)
 * - Size options (small, medium)
 * - Email tooltip
 * - Unassigned state handling
 * - Template-based formatting
 * - Click handling
 * - Avatar image support
 * - **Editable mode with new UserList component**
 * - **Single-user selection with search and filters**
 * - **Hover states for interactive mode**
 * 
 * @example
 * // Basic chip usage
 * {
 *   'ui:widget': 'UserAvatar',
 *   'ui:options': {
 *     variant: 'chip',
 *     size: 'small',
 *     showEmail: true
 *   }
 * }
 * 
 * @example
 * // Editable avatar with user selector (single selection)
 * {
 *   'ui:widget': 'UserAvatar',
 *   'ui:options': {
 *     variant: 'chip',
 *     size: 'medium',
 *     editable: true,
 *     organizationId: 'org-123',
 *     dialogTitle: 'Assign User',
 *     showFilters: true
 *   }
 * }
 * 
 * @example
 * // Avatar with name (editable, using formContext for org)
 * {
 *   'ui:widget': 'UserAvatar',
 *   'ui:options': {
 *     variant: 'avatar-name',
 *     size: 'medium',
 *     editable: true,
 *     unassignedText: 'Click to Assign',
 *     dialogTitle: 'Select Assignee'
 *   }
 * }
 * // Note: organizationId will be taken from formContext.organizationId
 */
const UserAvatar: React.FC<UserAvatarProps> = (props) => {
  const theme = useTheme();
  const {
    user: userProp,
    formData,
    value,
    uiSchema,
    reactory,
    onChange,
    formContext,
  } = props;

  // Dialog state for user selection
  const [dialogOpen, setDialogOpen] = useState(false);

  // Get options from uiSchema
  const options = useMemo((): UserAvatarOptions => {
    const defaultOptions: UserAvatarOptions = {
      variant: 'chip',
      size: 'small',
      showEmail: true,
      clickable: false,
      editable: false,
      showFilters: true,
      dialogTitle: 'Select User',
      unassignedText: 'Unassigned',
      unassignedIcon: 'person_outline',
      labelFormat: '${user.firstName} ${user.lastName}',
      tooltipFormat: '${user.firstName} ${user.lastName}${user.email ? " (" + user.email + ")" : ""}',
      showFullName: true,
      style: {},
    };

    if (uiSchema?.['ui:options']) {
      return { ...defaultOptions, ...uiSchema['ui:options'] };
    }

    return defaultOptions;
  }, [uiSchema]);

  // Get user object
  const user = useMemo((): Partial<Reactory.Models.IUser> | null => {
    // Priority: user prop > value > formData
    if (userProp) return userProp;
    if (value) return value;
    if (formData && typeof formData === 'object') return formData as Partial<Reactory.Models.IUser>;
    return null;
  }, [userProp, value, formData]);

  // Get avatar size in pixels
  const avatarSize = useMemo(() => {
    switch (options.size) {
      case 'small':
        return 24;
      case 'medium':
        return 32;
          // case 'large':        return 40;
      default:
        return 24;
    }
  }, [options.size]);

  // Format user label
  const userLabel = useMemo(() => {
    if (!user) return options.unassignedText;

    try {
      if (options.labelFormat && options.labelFormat.includes('${')) {
        return template(options.labelFormat)({ user, ...props });
      }
      
      if (options.showFullName) {
        return `${user.firstName || ''} ${user.lastName || ''}`.trim();
      }
      
      return user.firstName || user.lastName || user.email || options.unassignedText;
    } catch (err) {
      reactory?.log('UserAvatar: Label format error', { err, format: options.labelFormat }, 'warn');
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
  }, [user, options, props, reactory]);

  // Format tooltip
  const tooltipText = useMemo(() => {
    if (!options.showEmail || !user) return userLabel;

    try {
      if (options.tooltipFormat && options.tooltipFormat.includes('${')) {
        return template(options.tooltipFormat)({ user, ...props });
      }
      
      if (user.email) {
        return `${userLabel} (${user.email})`;
      }
      
      return userLabel;
    } catch (err) {
      reactory?.log('UserAvatar: Tooltip format error', { err, format: options.tooltipFormat }, 'warn');
      return userLabel;
    }
  }, [user, userLabel, options, props, reactory]);

  // Handle click
  const handleClick = () => {
    console.log('[UserAvatar] Clicked', { editable: options.editable, user });
    if (options.editable) {
      console.log('[UserAvatar] Opening dialog');
      setDialogOpen(true);
    } else if (options.onClick) {
      options.onClick(user);
    }
  };

  // Handle user selection from dialog
  const handleUserSelected = (selectedUser: Partial<Reactory.Models.IUser>) => {
    if (onChange) {
      onChange(selectedUser);
    }
    setDialogOpen(false);
    
    if (options.onClick) {
      options.onClick(selectedUser);
    }
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  // Get the UserList component
  const { UserList } = useMemo(() => {
    if (!reactory || !options.editable) return { UserList: null };
    return reactory.getComponents<{
      UserList: React.FC<any>;
    }>(['core.UserList']);
  }, [reactory, options.editable]);


  // Get the UserList component
  // Memoize the graphqlQuery to prevent infinite re-renders
  const graphqlQuery = useMemo(() => {

    let graphqlQuery = null;

    if (options.userListQuery) {
      graphqlQuery = formContext?.graphql?.queries?.[options.userListQuery];
      if (graphqlQuery) {
        return graphqlQuery;
      }
    }

    graphqlQuery = {
      name: 'ReactoryUsers',
      text: `
        fragment UserFragment on User {
          id
          email
          firstName
          lastName
          avatar
          roles
          createdAt
          updatedAt
        }

        fragment PagingResultFragment on PagingResult {
          total
          page
          pageSize
          hasNext
        }

        query ReactoryUserListQuery($paging: PagingRequest, $filter: ReactoryUserFilterInput) {
          ReactoryUsers(paging: $paging, filter: $filter) {
            users {
              ...UserFragment
            }
            paging {
              ...PagingResultFragment
            }
          }
        }
      `,
    };

    return graphqlQuery;
  }, [options.userListQuery, formContext]);

  // Render avatar element
  const avatarElement = useMemo(() => {
    if (!user) {
      return (
        <Avatar
          sx={{ width: avatarSize, height: avatarSize }}
          style={{ backgroundColor: theme.palette.grey[400] }}
        >
          {options.unassignedIcon && (
            <span className="material-icons" style={{ fontSize: avatarSize * 0.6 }}>
              {options.unassignedIcon}
            </span>
          )}
        </Avatar>
      );
    }

    const avatarSrc = getAvatar(user);
    const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();

    return (
      <Avatar
        src={avatarSrc}
        alt={userLabel}
        sx={{ width: avatarSize, height: avatarSize }}
      >
        {!avatarSrc && initials}
      </Avatar>
    );
  }, [user, avatarSize, options.unassignedIcon, userLabel, theme]);

  // Render based on variant
  const renderContent = () => {
    const isInteractive = options.editable || options.clickable;
    
    switch (options.variant) {
      case 'avatar':
        if (options.editable) {
          return (
            <EditableBox onClick={handleClick}>
              {avatarElement}
            </EditableBox>
          );
        }
        return avatarElement;

      case 'avatar-name':
        const avatarNameContent = (
          <StyledBox className={classes.avatarName}>
            {avatarElement}
            <Typography
              variant="body2"
              className={!user ? classes.unassigned : undefined}
            >
              {userLabel}
            </Typography>
          </StyledBox>
        );
        
        if (options.editable) {
          return (
            <EditableBox onClick={handleClick}>
              {avatarNameContent}
            </EditableBox>
          );
        }
        return avatarNameContent;

      case 'chip':
      default:
        if (options.editable) {
          return (
            <EditableChip
              avatar={avatarElement}
              label={userLabel}
              size={options.size}
              variant="outlined"
              className={`${classes.chip} ${!user ? classes.unassigned : ''}`}
              onClick={handleClick}
              style={options.style}
            />
          );
        }
        
        return (
          <Chip
            avatar={avatarElement}
            label={userLabel}
            size={options.size}
            variant="outlined"
            className={`${classes.chip} ${!user ? classes.unassigned : ''}`}
            onClick={isInteractive ? handleClick : undefined}
            style={options.style}
          />
        );
    }
  };

  const content = renderContent();

  // Render user selector dialog
  const renderDialog = () => {
    if (!options.editable || !UserList) return null;

    const orgId = options.organizationId || formContext?.organizationId;
    
    return (
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: '80vh',
            maxHeight: '800px',
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">{options.dialogTitle}</Typography>
            <IconButton
              edge="end"
              onClick={handleDialogClose}
              aria-label="close"
              size="small"
            >
              <span className="material-icons">close</span>
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <UserList
            graphqlQuery={graphqlQuery}
            selectionMode="single"
            initialSelected={user ? [user as Reactory.Models.IUser] : []}
            onUserSelect={handleUserSelected}
            organizationId={orgId}
            businessUnitId={options.businessUnitId}
            enableSearch={true}
            searchPlaceholder="Search users..."
            enableQuickFilters={options.showFilters}
            quickFilters={options.showFilters ? [
              {
                id: 'active',
                label: 'Active Users',
                icon: 'check_circle',
                color: 'success' as const,
                filter: {
                  field: 'deleted',
                  value: false,
                  operator: 'eq' as const,
                },
              },
              {
                id: 'admins',
                label: 'Admins',
                icon: 'admin_panel_settings',
                color: 'primary' as const,
                filter: {
                  field: 'roles',
                  value: 'ADMIN',
                  operator: 'contains' as const,
                },
              },
            ] : undefined}
            enableAdvancedFilters={false} // Disable advanced filters for UserAvatar
            viewMode="list"
            itemVariant="detailed"
            dense={false}
            height="calc(80vh - 180px)"
            initialPageSize={25}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="inherit">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Wrap with tooltip if email should be shown
  const wrappedContent = options.showEmail && tooltipText && tooltipText !== userLabel ? (
    <Tooltip title={tooltipText} placement="top">
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        {content}
      </span>
    </Tooltip>
  ) : content;

  return (
    <>
      {wrappedContent}
      {renderDialog()}
    </>
  );
};

UserAvatar.defaultProps = {
  user: null,
  formData: null,
  value: null,
};

export default compose(withReactory)(UserAvatar);
