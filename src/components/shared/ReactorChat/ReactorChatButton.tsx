import React, { useState } from 'react';
import { useReactory } from "@reactory/client-core/api";
import ReactorChat from './ReactorChat';
import { Typography } from '@mui/material';

export interface ReactorChatButtonProps {
  /**
   * Whether to render as a Floating Action Button (FAB) or standard button
   * @default false
   */
  fab?: boolean;
  
  /**
   * Position of the slide-out panel
   * @default 'right'
   */
  position?: 'left' | 'right';
  
  /**
   * Width of the slide-out panel
   * @default 400
   */
  width?: number;
  
  /**
   * Button text (only used when fab is false)
   * @default 'Chat'
   */
  buttonText?: string;
  
  /**
   * Button icon (Material-UI icon name)
   * @default 'chat'
   */
  icon?: string;
  
  /**
   * Custom button variant
   * @default 'contained'
   */
  variant?: 'text' | 'outlined' | 'contained';
  
  /**
   * Custom button color
   * @default 'primary'
   */
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  
  /**
   * Custom button size
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large';
  
  /**
   * Additional CSS classes for the button
   */
  className?: string;
  
  /**
   * Additional CSS styles for the button
   */
  style?: React.CSSProperties;
  
  /**
   * Props to pass to the ReactorChat component
   */
  chatProps?: Reactory.Schema.UIAIOptions;
}

const ReactorChatButton: React.FC<ReactorChatButtonProps> = ({
  fab = false,
  position = 'right',
  width = 400,
  buttonText = 'Chat',
  icon = 'chat',
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  className,
  style,
  chatProps = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const reactory = useReactory();
  const theme: Reactory.UX.IReactoryTheme = reactory.getTheme();

  const {
    React,
    Material
  } = reactory.getComponents<{
    React: Reactory.React,
    Material: Reactory.Client.Web.IMaterialModule
  }>(["material-ui.Material", "react.React"]);

  const { 
    Fab, 
    Button, 
    Icon, 
    IconButton,
    Box,
    Drawer,
    Slide,
    useTheme,
    useMediaQuery
  } = Material.MaterialCore;

  const { Close } = Material.MaterialIcons;
  const themeHook = useTheme();
  const isMobile = useMediaQuery(themeHook.breakpoints.down('sm'));

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  // Slide direction based on position
  const slideDirection = position === 'left' ? 'right' : 'left';

  // Determine panel width based on screen size
  const panelWidth = isMobile ? '100vw' : width;

  const renderButton = () => {
    if (fab) {
      return (
        <Fab
          color={color}
          aria-label={buttonText}
          onClick={handleOpen}
          className={className}
          style={style}
          size={size}
        >
          <Icon>{icon}</Icon>
        </Fab>
      );
    }

    return (
      <Button
        variant={variant}
        color={color}
        size={size}
        onClick={handleOpen}
        className={className}
        style={style}
        startIcon={<Icon>{icon}</Icon>}
      >
        {buttonText}
      </Button>
    );
  };

  return (
    <>
      {renderButton()}
      
      <Drawer
        anchor={position}
        open={isOpen}
        onClose={handleClose}
        sx={{
          '& .MuiDrawer-paper': {
            width: panelWidth,
            height: '100vh',
            boxShadow: themeHook.shadows[24],
            border: 'none',
            overflow: 'hidden',
          },
        }}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
      >
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {/* Header with close button */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              borderBottom: `1px solid ${themeHook.palette.divider}`,
              backgroundColor: themeHook.palette.background.paper,
              minHeight: 64,
            }}
          >
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6">{chatProps.title || 'Chat'}</Typography>
            </Box>
            <IconButton
              onClick={handleClose}
              size="small"
              aria-label="Close chat"
              sx={{
                color: themeHook.palette.text.secondary,
                '&:hover': {
                  backgroundColor: themeHook.palette.action.hover,
                },
              }}
            >
              <Close />
            </IconButton>
          </Box>

          {/* Chat component container */}
          <Box
            sx={{
              flexGrow: 1,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <ReactorChat
              {...chatProps}
            />
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default ReactorChatButton; 