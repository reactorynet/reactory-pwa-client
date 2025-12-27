import React, { useMemo } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import { Chip, Avatar, Typography, Box, Tooltip } from '@mui/material';
import { compose } from 'redux';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import { template } from 'lodash';
import { getAvatar } from '@reactory/client-core/components/util';
import Reactory from '@reactory/reactory-core';

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
}

interface UserAvatarProps {
  user?: Partial<Reactory.Models.IUser> | null;
  formData?: Partial<Reactory.Models.IUser> | string | null;
  value?: Partial<Reactory.Models.IUser> | null;
  uiSchema?: {
    'ui:options'?: UserAvatarOptions;
  };
  reactory?: Reactory.Client.IReactoryApi;
  [key: string]: any;
}

/**
 * UserAvatar Widget
 * 
 * A flexible component for displaying user information with avatar.
 * Supports multiple display variants and configurations.
 * 
 * Features:
 * - Multiple display variants (chip, avatar, avatar-name)
 * - Size options (small, medium, large)
 * - Email tooltip
 * - Unassigned state handling
 * - Template-based formatting
 * - Click handling
 * - Avatar image support
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
 * // Avatar with name
 * {
 *   'ui:widget': 'UserAvatar',
 *   'ui:options': {
 *     variant: 'avatar-name',
 *     size: 'medium',
 *     unassignedText: 'Not Assigned'
 *   }
 * }
 */
const UserAvatar: React.FC<UserAvatarProps> = (props) => {
  const theme = useTheme();
  const {
    user: userProp,
    formData,
    value,
    uiSchema,
    reactory,
  } = props;

  // Get options from uiSchema
  const options = useMemo((): UserAvatarOptions => {
    const defaultOptions: UserAvatarOptions = {
      variant: 'chip',
      size: 'small',
      showEmail: true,
      clickable: false,
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
    if (options.onClick) {
      options.onClick(user);
    }
  };

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
    switch (options.variant) {
      case 'avatar':
        return avatarElement;

      case 'avatar-name':
        return (
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

      case 'chip':
      default:
        return (
          <Chip
            avatar={avatarElement}
            label={userLabel}
            size={options.size}
            variant="outlined"
            className={`${classes.chip} ${!user ? classes.unassigned : ''}`}
            onClick={options.clickable ? handleClick : undefined}
            style={options.style}
          />
        );
    }
  };

  const content = renderContent();

  // Wrap with tooltip if email should be shown
  if (options.showEmail && tooltipText && tooltipText !== userLabel) {
    return (
      <Tooltip title={tooltipText} placement="top">
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          {content}
        </span>
      </Tooltip>
    );
  }

  return content;
};

UserAvatar.defaultProps = {
  user: null,
  formData: null,
  value: null,
};

export default compose(withReactory)(UserAvatar);
